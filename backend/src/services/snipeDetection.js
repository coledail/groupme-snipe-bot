function detectSnipe(message) {
  if (!message || typeof message !== 'object') return { valid: false };

  const hasSnipedWord = /\bsniped\b/i.test(message.text || '');
  const attachments = message.attachments || message.photos || [];
  const hasImage = Array.isArray(attachments) && attachments.length > 0 && attachments.some((a) => {
    if (!a) return false;
    return a.type === 'image' || a.type === 'photo' || a.url || a.photo_url;
  });

  if (!hasSnipedWord || !hasImage) return { valid: false };

  const mentionsAttachment = Array.isArray(attachments)
    ? attachments.find((a) => a && a.type === 'mentions' && Array.isArray(a.user_ids) && a.user_ids.length > 0)
    : null;

  // Prefer GroupMe structured mention metadata, then fall back to text mention.
  const victimIdFromMentionAttachment = mentionsAttachment ? mentionsAttachment.user_ids[0] : null;
  const mentionMatch = (message.text || '').match(/@([^\n\r@]+?)(?=\s+(?:got\s+)?sniped\b|$)/i);
  const victimNameFromText = mentionMatch ? mentionMatch[1].trim() : null;

  // Best-effort IDs from common GroupMe payload fields.
  const sniperId = message.user_id || message.sender_id || message.sender && message.sender.id || message.user && message.user.id || null;
  const imageAttachment = Array.isArray(attachments)
    ? attachments.find((a) => a && (a.type === 'image' || a.type === 'photo' || a.url || a.photo_url))
    : null;
  const imageUrl = imageAttachment ? (imageAttachment.url || imageAttachment.photo_url || null) : null;
  const victimId = victimIdFromMentionAttachment || victimNameFromText;

  if (sniperId && victimIdFromMentionAttachment && String(sniperId) === String(victimIdFromMentionAttachment)) {
    return { valid: false };
  }

  if (!victimId) {
    // Without a mention we can't attribute a victim reliably.
    return { valid: false };
  }

  return {
    valid: true,
    sniperId: String(sniperId || (message.name || 'unknown')),
    victimId: String(victimId),
    victimDisplayName: victimNameFromText,
    imageUrl,
  };
}

module.exports = { detectSnipe };
