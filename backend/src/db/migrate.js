const config = require('../../config');
const { openDatabase } = require('./client');

const db = openDatabase(config.databasePath);
// eslint-disable-next-line no-console
console.log(`Database ready at ${config.databasePath}`);
db.close();
