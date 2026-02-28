// api/db.js
// Shared PostgreSQL connection pool for all API routes.
// Vercel serverless functions reuse the pool across warm invocations.
import pkg from 'pg';
const { Pool } = pkg;

let pool;

export function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // required for AWS RDS
      max: 5,                             // keep small for serverless
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}
