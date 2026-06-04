import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Log and exit if the pool loses a client unexpectedly — better than silent failures.
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err.message);
  process.exit(1);
});

export default pool;
