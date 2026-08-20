const { detectSnipe } = require('./snipeDetection');

function createSnipeService(
  { snipeRepository, playerRepository },
  { playerService, gameService, sendGroupMeMessage },
) {
  async function processIncomingMessage(message) {
    const detection = detectSnipe(message);
    if (!detection.valid) {
      return null;
    }

    if (await snipeRepository.findByMessageId(message.id)) {
      return null;
    }

    const activeGame = await gameService.getOrCreateActiveGame();

    const sniper = await playerService.findOrCreatePlayer(detection.sniperId, message.name);

    const existingVictim = await playerService.getPlayerByGroupmeId(detection.victimId);
    const victim = await playerService.findOrCreatePlayer(
      detection.victimId,
      existingVictim ? existingVictim.displayName : (detection.victimDisplayName || 'Unknown'),
    );

    const snipe = await snipeRepository.create({
      gameId: activeGame.id,
      sniperId: sniper.id,
      victimId: victim.id,
      groupmeMessageId: message.id,
      imageUrl: detection.imageUrl,
    });

    if (!snipe) {
      return null;
    }

    const confirmationText = `Snipe recorded: @${sniper.displayName} sniped @${victim.displayName}!`;
    return { snipe, confirmationText };
  }

  async function handleIncomingMessage(message) {
    const outcome = await processIncomingMessage(message);
    if (!outcome) return null;

    try {
      await sendGroupMeMessage(outcome.confirmationText);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Snipe was recorded, but sending the GroupMe confirmation message failed:', err);
    }

    return outcome;
  }

  async function undoSnipe(snipeId) {
    return await snipeRepository.undo(snipeId);
  }

  async function getLeaderboard(gameId) {
    const kills = await snipeRepository.killCountsByGame(gameId);
    const deaths = await snipeRepository.deathCountsByGame(gameId);
    const players = await playerRepository.all();

    const killMap = new Map(kills.map((k) => [k.playerId, k.count]));
    const deathMap = new Map(deaths.map((d) => [d.playerId, d.count]));
    const playerMap = new Map(players.map((p) => [p.id, p]));

    const involvedPlayerIds = new Set([...killMap.keys(), ...deathMap.keys()]);

    const rows = [...involvedPlayerIds].map((playerId) => {
      const player = playerMap.get(playerId);
      const killCount = killMap.get(playerId) || 0;
      const deathCount = deathMap.get(playerId) || 0;
      const kd = deathCount > 0 ? killCount / deathCount : killCount;

      return {
        playerId,
        displayName: player ? player.displayName : 'Unknown',
        kills: killCount,
        deaths: deathCount,
        kd: Math.round(kd * 100) / 100,
      };
    });

    rows.sort((a, b) => b.kills - a.kills || b.kd - a.kd || a.deaths - b.deaths);

    return rows.map((row, index) => ({ rank: index + 1, ...row }));
  }

  return { processIncomingMessage, handleIncomingMessage, undoSnipe, getLeaderboard };
}

module.exports = { createSnipeService };
