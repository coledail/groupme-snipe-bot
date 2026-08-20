const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

function parseCorsOrigins(value) {
  if (!value) return ['*'];
  return value.split(',').map((origin) => origin.trim()).filter(Boolean);
}

function required(name, { allowMissingInTest = false } = {}) {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === 'test' && allowMissingInTest) {
    return 'test-value';
  }
  if (!value) {
    // eslint-disable-next-line no-console
    console.warn(`[config] Warning: environment variable ${name} is not set.`);
  }
  return value;
}

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databasePath: process.env.DATABASE_PATH || path.join(__dirname, 'data', 'dev.db'),
  groupmeBotId: required('GROUPME_BOT_ID', { allowMissingInTest: true }),
  groupmeGroupId: required('GROUPME_GROUP_ID', { allowMissingInTest: true }),
  adminApiToken: required('ADMIN_API_TOKEN', { allowMissingInTest: true }),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGIN || '*'),
  groupmeApiBase: 'https://api.groupme.com/v3',
};
