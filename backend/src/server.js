const { createApp } = require('./app');
const config = require('../config');

const app = createApp();

const port = Number(process.env.PORT || config.port || 3000);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on port ${port}`);
});
