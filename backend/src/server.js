const { createApp } = require('./app');
const config = require('../config');

async function run() {
  const app = await createApp();
  const port = Number(process.env.PORT || config.port || 3000);
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Server listening on port ${port}`);
  });
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Server failed to start', err);
  process.exit(1);
});
