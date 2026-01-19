const sql = require("mssql/msnodesqlv8");
require("dotenv").config();

const config = {
  connectionString: process.env.DB_CONNECTION_STRING,
};

let pool;

async function getPool() {
  if (!pool) {
    pool = await sql.connect(config);
  }
  return pool;
}

module.exports = { sql, getPool };

if (require.main === module) {
  (async () => {
    try {
      const pool = await getPool();
      await pool.request().query('SELECT 1 AS test');
      console.log('✅ Database connection successful!');
      // when required by other modules (e.g., the API server) we don't want to exit the process;
      // only exit when this file is executed directly by a developer.
    } catch (err) {
      console.error('❌ Database connection failed:', err);
      // don't call process.exit here to avoid terminating callers that require this module
    }
  })();
}