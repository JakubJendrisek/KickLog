const { Pool } = require('pg');

// Setup the pool with your database credentials
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'KickLog',
  password: 'pejsekcorey',
  port: 5432, // Default Postgres port
});

// Export the query method for use in controllers
module.exports = {
  query: (text, params) => pool.query(text, params),
};