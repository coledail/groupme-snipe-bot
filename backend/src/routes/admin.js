const express = require('express');
const adminAuth = require('../middleware/adminAuth');
const { adminApiLimiter } = require('../middleware/rateLimiter');

function createAdminRouter({ snipeRepository, snipeService, gameService, playerService }) {
  const router = express.Router();

  router.use(adminApiLimiter, adminAuth);

  router.delete('/snipes/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid snipe id' });
    }
    try {
      const snipe = await snipeService.undoSnipe(id);
      return res.status(200).json({ ok: true, snipe });
    } catch (err) {
      if (err.code === 'NOT_FOUND') {
        return res.status(404).json({ error: 'Snipe not found' });
      }
      throw err;
    }
  });

  router.get('/snipes', async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const snipes = await snipeRepository.recent(limit);
    return res.status(200).json({ snipes });
  });

  router.post('/games', async (req, res) => {
    const { name } = req.body || {};
    if (name !== undefined && typeof name !== 'string') {
      return res.status(400).json({ error: 'name must be a string if provided' });
    }
    const game = await gameService.startNewGame(name);
    return res.status(201).json({ ok: true, game });
  });

  router.get('/games', async (req, res) => {
    const games = await gameService.listGames();
    return res.status(200).json({ games });
  });

  router.patch('/games/:id/activate', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid game id' });
    }
    try {
      const game = await gameService.activateGame(id);
      return res.status(200).json({ ok: true, game });
    } catch (err) {
      if (err.code === 'P2025') {
        return res.status(404).json({ error: 'Game not found' });
      }
      throw err;
    }
  });

  router.patch('/players/:id', async (req, res) => {
    const id = Number(req.params.id);
    const { displayName } = req.body || {};
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid player id' });
    }
    if (displayName !== undefined && typeof displayName !== 'string') {
      return res.status(400).json({ error: 'displayName must be a string' });
    }
    try {
      const player = await playerService.updatePlayer(id, { displayName });
      return res.status(200).json({ ok: true, player });
    } catch (err) {
      if (err.code === 'P2025' || err.code === 'NOT_FOUND') {
        return res.status(404).json({ error: 'Player not found' });
      }
      throw err;
    }
  });

  return router;
}

module.exports = createAdminRouter;
