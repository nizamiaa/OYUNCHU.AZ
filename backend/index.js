import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { createRequire } from 'module';

dotenv.config();
const require = createRequire(import.meta.url);
const { getPool } = require('./db.cjs');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 4000;

// Simple health / test endpoint
app.get('/api/test', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT 1 AS test');
    res.json({ ok: true, result: result.recordset });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// Get products (adjust table name/columns to your schema)
app.get('/api/products', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT TOP (100) * FROM Products');
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// Search products by name (query param: q)
// backend/index.js
app.get('/api/products/search', async (req, res) => {
  const searchTerm = req.query.q || '';
  try {
    const pool = await getPool();
    const request = pool.request();
    request.input('search', `%${searchTerm}%`);

    // DB sütun adlarına uyğun query
    const result = await request.query(`
      SELECT TOP (50) 
        Id, 
        Name, 
        Description, 
        Price, 
        OriginalPrice, 
        Rating, 
        Reviews, 
        ImageUrl, 
        Discount, 
        Created_at, 
        Updated_at
      FROM Products
      WHERE Name LIKE @search
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});



// Get consoles (adjust table name if needed)
app.get('/api/consoles', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT * FROM Consoles');
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// Get users (sample)
app.get('/api/users', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT Id, Name, Email FROM Users');
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// Login endpoint (very basic example - replace with proper auth and hashing!)
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  try {
    const pool = await getPool();
    const request = pool.request();
    request.input('email', email);
    request.input('password', password);
    const result = await request.query('SELECT Id, Name, Email FROM Users WHERE Email = @email AND Password = @password');
    if (result.recordset.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const user = result.recordset[0];
    res.json({ ok: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// Generic SQL executor (admin/debug) - use carefully
app.post('/api/query', async (req, res) => {
  const { sql } = req.body;
  if (!sql) return res.status(400).json({ error: 'sql required' });
  try {
    const pool = await getPool();
    const result = await pool.request().query(sql);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});

export default app;
