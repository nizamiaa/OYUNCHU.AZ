const { getPool } = require('./db.cjs');

(async () => {
  try {
    const pool = await getPool();
    // check columns
    const colsRes = await pool.request().input('tbl', 'Users').query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @tbl");
    const cols = (colsRes.recordset || []).map(r => String(r.COLUMN_NAME || ''));
    const needsVerifyToken = !cols.includes('EmailVerifyToken');
    const needsIsVerified = !cols.includes('IsVerified');

    if (!needsVerifyToken && !needsIsVerified) {
      console.log('No migration needed: columns already exist.');
      process.exit(0);
    }

    if (needsVerifyToken) {
      console.log('Adding EmailVerifyToken column...');
      await pool.request().query("ALTER TABLE Users ADD EmailVerifyToken NVARCHAR(128) NULL");
      console.log('EmailVerifyToken added.');
    }

    if (needsIsVerified) {
      console.log('Adding IsVerified column...');
      await pool.request().query("ALTER TABLE Users ADD IsVerified BIT DEFAULT 0 NOT NULL");
      console.log('IsVerified added.');
    }

    console.log('Migration complete.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
})();