const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Only attempt to connect and log if not in a test environment
if (process.env.NODE_ENV !== 'test') {
    pool.connect((err, client, done) => {
        if (err) {
            console.error('Database connection error', err);
            return;
        }
        console.log('Connected to PostgreSQL database');
        done();
    });
}

module.exports = pool;