const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = async () => {
  const testDbPath = path.join(__dirname, '..', 'prisma', 'test.db');
  // Start every test run from a clean database file.
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  execSync('npx prisma db push --skip-generate', {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: `file:${testDbPath}` },
    stdio: 'inherit',
  });
};