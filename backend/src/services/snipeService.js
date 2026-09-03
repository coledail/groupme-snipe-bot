const { detectSnipe } = require('./snipeDetection');

function createSnipeService(
  { snipeRepository, playerRepository },
  { playerService, gameService, groupmeGroupId },
) {
  async function processIncomingMessage(message) {
    if (groupmeGroupId && String(message?.group_id) !== String(groupmeGroupId)) {
      return null;
    }

    const detection = detectSnipe(message);
    if (!detection.valid) {
      return null;
    }

    if (await snipeRepository.findByMessageId(message.id)) {
      return null;
    }

    const activeGame = await gameService.getOrCreateActiveGame();

    const sniper = await playerService.findOrCreatePlayer(detection.sniperId, message.name);

    const snipes = [];
    for (const victimId of detection.victimIds || [detection.victimId]) {
      const existingVictim = await playerService.getPlayerByGroupmeId(victimId);
      const victim = await playerService.findOrCreatePlayer(
        victimId,
        existingVictim ? existingVictim.displayName : (detection.victimDisplayName || 'Unknown'),
      );

      const snipe = await snipeRepository.create({
        gameId: activeGame.id,
        sniperId: sniper.id,
        victimId: victim.id,
        groupmeMessageId: message.id,
        imageUrl: detection.imageUrl,
      });
      if (snipe) snipes.push(snipe);
    }

    if (snipes.length === 0) {
      return null;
    }

    return { snipe: snipes[0], snipes };
  }

  // Unsnipe behavior meant for all users regardless of permission
  async function handleUnsnipeCommand(message) {
    const text = typeof message?.text === 'string' ? message.text.trim() : '';
    if (!/^!unsnipe\b/i.test(text)) {
      return null;
    }

    const latestSnipe = await snipeRepository.findMostRecentUnundone();
    if (!latestSnipe) {
      return { ok: true, snipe: null };
    }

    const snipe = await snipeRepository.undo(latestSnipe.id);
    return { ok: true, snipe };
  }

  async function handleIncomingMessage(message) {
    const unsnipe = await handleUnsnipeCommand(message);
    if (unsnipe) {
      return unsnipe;
    }
    return processIncomingMessage(message);
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

  return { processIncomingMessage, handleIncomingMessage, handleUnsnipeCommand, undoSnipe, getLeaderboard };
}

module.exports = { createSnipeService };
