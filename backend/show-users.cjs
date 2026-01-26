const { getPool } = require('./db.cjs');
(async () => {
  try {
    const pool = await getPool();
    const res = await pool.request().query('SELECT TOP (10) Id, Name, Email, IsVerified, EmailVerifyToken FROM Users ORDER BY Id DESC');
    console.log(res.recordset);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();