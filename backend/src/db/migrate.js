const config = require('../../config');
const { openDatabase } = require('./client');

async function run() {
	const db = await openDatabase(config.databasePath);
	// eslint-disable-next-line no-console
	console.log(`Database ready at ${process.env.DATABASE_URL || config.databasePath}`);
	if (db && typeof db.end === 'function') {
		await db.end();
	} else if (db && typeof db.close === 'function') {
		db.close();
	}
}

run().catch((err) => {
	// eslint-disable-next-line no-console
	console.error('DB init failed', err);
	process.exit(1);
});
