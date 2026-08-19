const express = require('express');
const cors = require('cors');
const bodyParser = require('express').json;
const config = require('../config');

const { openDatabase } = require('./db/client');
const { createPlayerRepository } = require('./db/playerRepository');
const { createSnipeRepository } = require('./db/snipeRepository');
const { createGameRepository } = require('./db/gameRepository');

const { createPlayerService } = require('./services/playerService');
const { createGameService } = require('./services/gameService');
const { createSnipeService } = require('./services/snipeService');

const createAdminRouter = require('./routes/admin');
const createWebhookRouter = require('./routes/webhook');
const createLeaderboardRouter = require('./routes/leaderboard');

async function createApp() {
  const app = express();
  app.use(cors({ origin: config.corsOrigin }));
  app.use(bodyParser());

  const db = await openDatabase(config.databasePath);

  const playerRepository = createPlayerRepository(db);
  const snipeRepository = createSnipeRepository(db);
  const gameRepository = createGameRepository(db);

  const playerService = createPlayerService(playerRepository);
  const gameService = createGameService(gameRepository);

  // Simple sender that logs the outgoing message; replace with real GroupMe API client when available.
  async function sendGroupMeMessage(text) {
    // eslint-disable-next-line no-console
    console.log('Would send GroupMe message:', text);
    return true;
  }

  const snipeService = createSnipeService({ snipeRepository, playerRepository }, { playerService, gameService, sendGroupMeMessage });

  app.get('/health', (req, res) => res.status(200).json({ ok: true }));

  app.use('/api/admin', createAdminRouter({ snipeRepository, snipeService, gameService, playerService }));
  app.use('/api', createLeaderboardRouter({ snipeService, gameService }));
  app.use('/webhook', createWebhookRouter({ snipeService }));

  return app;
}

module.exports = { createApp };
