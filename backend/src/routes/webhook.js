const express = require('express');

function createWebhookRouter({ snipeService }) {
  const router = express.Router();

  router.post('/groupme', async (req, res) => {
    // GroupMe webhook payload may wrap the message; accept either shape.
    const message = req.body && (req.body.message || req.body) ;
    try {
      const outcome = await snipeService.handleIncomingMessage(message);
      if (!outcome) return res.status(204).end();
      return res.status(200).json({ ok: true, snipe: outcome.snipe });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error handling webhook:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

module.exports = createWebhookRouter;
