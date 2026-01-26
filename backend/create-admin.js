import dotenv from 'dotenv';
import { createRequire } from 'module';
import bcrypt from 'bcryptjs';

dotenv.config();
const require = createRequire(import.meta.url);
const { getPool } = require('./db.cjs');

(async () => {
  const name = process.env.ADMIN_NAME;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  try {
    const pool = await getPool();

    // normalize email and check existing
    const emailNormalized = String(email).toLowerCase().trim();
    const existing = await pool.request().input('email', emailNormalized).query('SELECT Id FROM Users WHERE LOWER(Email) = LOWER(@email)');
    if (existing.recordset.length > 0) {
      console.log('Bu mail artıq qeydiyyatdan keçib (admin).');
      process.exit(0);
    }

    const hashed = await bcrypt.hash(password, 10);

    const result = await pool.request()
      .input('name', name)
      .input('email', emailNormalized)
      .input('password', hashed)
      .input('role', 'admin')
      .query("INSERT INTO Users (Name, Email, Password, Role, Created_at, IsVerified) OUTPUT INSERTED.Id VALUES (@name, @email, @password, @role, GETDATE(), 1)");

    console.log('Created admin user:', result.recordset[0]);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
