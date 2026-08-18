const express = require('express');

function createLeaderboardRouter({ snipeService, gameService }) {
  const router = express.Router();

  router.get('/leaderboard', async (req, res) => {
    const game = await gameService.getOrCreateActiveGame();
    const leaderboard = await snipeService.getLeaderboard(game.id);
    return res.status(200).json({ leaderboard, game });
  });

  router.get('/leaderboard/games/:gameId', async (req, res) => {
    const gameId = Number(req.params.gameId);
    if (!Number.isInteger(gameId)) return res.status(400).json({ error: 'Invalid game id' });
    const leaderboard = await snipeService.getLeaderboard(gameId);
    return res.status(200).json({ leaderboard });
  });

  return router;
}

module.exports = createLeaderboardRouter;
