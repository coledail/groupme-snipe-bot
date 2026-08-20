param(
  [Parameter(Mandatory = $true)]
  [string]$AccessToken,

  [Parameter(Mandatory = $true)]
  [string]$GroupId,

  [string]$OutDir = "./data/groupme-export",

  [int]$MaxPages = 200,

  [switch]$UseAuthHeader
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function New-GroupMeUri {
  param(
    [Parameter(Mandatory = $true)][string]$ApiPath,
    [hashtable]$Query
  )

  $base = "https://api.groupme.com/v3"
  $queryMap = @{}

  if ($Query) {
    foreach ($k in $Query.Keys) {
      $queryMap[$k] = [string]$Query[$k]
    }
  }

  if (-not $UseAuthHeader) {
    $queryMap["token"] = $AccessToken
  }

  if ($queryMap.Count -eq 0) {
    return ("{0}{1}" -f $base, $ApiPath)
  }

  $pairs = foreach ($k in $queryMap.Keys) {
    "{0}={1}" -f [uri]::EscapeDataString($k), [uri]::EscapeDataString($queryMap[$k])
  }

  return ("{0}{1}?{2}" -f $base, $ApiPath, ($pairs -join "&"))
}

function Invoke-GroupMe {
  param(
    [Parameter(Mandatory = $true)][string]$ApiPath,
    [hashtable]$Query
  )

  $uri = New-GroupMeUri -ApiPath $ApiPath -Query $Query
  $headers = @{}

  if ($UseAuthHeader) {
    # GroupMe accepts OAuth token headers; use this if query token auth fails.
    $headers["X-Access-Token"] = $AccessToken
  }

  try {
    if ($headers.Count -gt 0) {
      return Invoke-RestMethod -Uri $uri -Method Get -Headers $headers
    }
    return Invoke-RestMethod -Uri $uri -Method Get
  }
  catch {
    $statusCode = $null
    $statusText = $null

    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      $response = $_.Exception.Response
      $statusCode = [int]$response.StatusCode

      if ($response.PSObject.Properties.Name -contains 'StatusDescription') {
        $statusText = [string]$response.StatusDescription
      }
      elseif ($response.PSObject.Properties.Name -contains 'ReasonPhrase') {
        $statusText = [string]$response.ReasonPhrase
      }
      else {
        $statusText = ''
      }
    }

    if ($statusCode -eq 304) {
      # GroupMe can return 304 during paging; treat as no more messages.
      return [PSCustomObject]@{
        response = [PSCustomObject]@{
          messages = @()
        }
      }
    }

    Write-Host "Request failed:" -ForegroundColor Red
    Write-Host "  URI: $uri"
    if ($statusCode) {
      Write-Host "  HTTP: $statusCode $statusText"
    }
    Write-Host "  Error: $($_.Exception.Message)"

    if ($statusCode -eq 401) {
      Write-Host ""
      Write-Host "401 tips:" -ForegroundColor Yellow
      Write-Host "  1) Use your GroupMe ACCESS TOKEN (from dev.groupme.com), not BOT ID, GROUP ID, or ADMIN_API_TOKEN."
      Write-Host "  2) Regenerate token and retry if the token may be revoked."
      Write-Host "  3) Confirm the GroupId is from the same GroupMe account that owns the token."
      Write-Host "  4) Retry with -UseAuthHeader switch if query token auth is blocked."
    }

    throw
  }
}

New-Item -ItemType Directory -Path $OutDir -Force | Out-Null

Write-Host "Fetching group metadata and members..."
$groupRes = Invoke-GroupMe -ApiPath "/groups/$GroupId" -Query @{}
$group = $groupRes.response
if (-not $group) {
  throw "Group response was empty."
}

$members = @($group.members)
if (-not $members) {
  Write-Host "No members found in group response." -ForegroundColor Yellow
  $members = @()
}

$membersRows = $members | ForEach-Object {
  [PSCustomObject]@{
    group_id = $GroupId
    user_id = [string]$_.user_id
    nickname = [string]$_.nickname
    name = [string]$_.name
    image_url = [string]$_.image_url
    muted = [string]$_.muted
    autokicked = [string]$_.autokicked
    roles = [string]($_.roles -join ";")
  }
}

$membersCsv = Join-Path $OutDir "group_members.csv"
$membersRows | Sort-Object nickname, user_id | Export-Csv -Path $membersCsv -NoTypeInformation -Encoding UTF8

Write-Host "Fetching message history and unique senders..."
$allSenders = @{}
$page = 0
$beforeId = $null
$totalMessages = 0

while ($page -lt $MaxPages) {
  $page += 1
  $query = @{ limit = "100" }
  if ($beforeId) {
    $query["before_id"] = [string]$beforeId
  }

  $msgRes = Invoke-GroupMe -ApiPath "/groups/$GroupId/messages" -Query $query
  $messages = @($msgRes.response.messages)

  if (-not $messages -or $messages.Count -eq 0) {
    break
  }

  $totalMessages += $messages.Count

  foreach ($m in $messages) {
    $senderId = [string]$m.sender_id
    if ([string]::IsNullOrWhiteSpace($senderId)) {
      continue
    }

    if (-not $allSenders.ContainsKey($senderId)) {
      $allSenders[$senderId] = [PSCustomObject]@{
        user_id = $senderId
        sender_name = [string]$m.name
        first_seen_message_id = [string]$m.id
        first_seen_created_at_unix = [int64]$m.created_at
      }
    }
  }

  $oldest = $messages | Sort-Object { [int64]$_.created_at } | Select-Object -First 1
  $beforeId = [string]$oldest.id

  Write-Host ("  Page {0}: {1} messages (total {2})" -f $page, $messages.Count, $totalMessages)
}

$sendersRows = $allSenders.Values | ForEach-Object {
  $firstSeenIso = $null
  if ($_.first_seen_created_at_unix -gt 0) {
    $firstSeenIso = [DateTimeOffset]::FromUnixTimeSeconds($_.first_seen_created_at_unix).UtcDateTime.ToString("o")
  }

  [PSCustomObject]@{
    user_id = $_.user_id
    sender_name = $_.sender_name
    first_seen_message_id = $_.first_seen_message_id
    first_seen_created_at_utc = $firstSeenIso
    in_current_members = [bool]($membersRows.user_id -contains $_.user_id)
  }
}

$sendersCsv = Join-Path $OutDir "message_senders_unique.csv"
$sendersRows | Sort-Object sender_name, user_id | Export-Csv -Path $sendersCsv -NoTypeInformation -Encoding UTF8

# Helpful merge to seed your players import.
$playersSeed = foreach ($row in $sendersRows) {
  $memberMatch = $membersRows | Where-Object { $_.user_id -eq $row.user_id } | Select-Object -First 1
  [PSCustomObject]@{
    groupme_user_id = $row.user_id
    display_name = if ($memberMatch) { $memberMatch.nickname } else { $row.sender_name }
    source = if ($memberMatch) { "current_member" } else { "history_only" }
  }
}

$seedCsv = Join-Path $OutDir "players_seed.csv"
$playersSeed | Sort-Object display_name, groupme_user_id | Export-Csv -Path $seedCsv -NoTypeInformation -Encoding UTF8

Write-Host ""
Write-Host "Export complete:" -ForegroundColor Green
Write-Host "  $membersCsv"
Write-Host "  $sendersCsv"
Write-Host "  $seedCsv"
Write-Host ""
Write-Host "Next step: review players_seed.csv, then use it for Supabase player upserts."
