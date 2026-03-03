const { Pool } = require('pg');

require('dotenv').config();

const toBool = (value) => {
  if (value == null) return false;
  const v = String(value).trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
};

const env = {
  connectionString: process.env.DATABASE_PUBLIC_URL,
  port: 5432,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
};

const pool = env.connectionString
  ? new Pool({
      connectionString: env.connectionString,
      ssl: env.ssl ? { rejectUnauthorized: false } : undefined,
    })
  : new Pool({
      host: env.host,
      port: env.port,
      user: env.user,
      password: env.password,
      database: env.database,
      ssl: env.ssl ? { rejectUnauthorized: false } : undefined,
    });

// Export the query method for use in controllers
module.exports = {
  query: (text, params) => pool.query(text, params),
};