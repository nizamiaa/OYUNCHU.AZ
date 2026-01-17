import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { createRequire } from 'module';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

dotenv.config();
const require = createRequire(import.meta.url);
const { getPool } = require('./db.cjs');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 4000;

// authMiddleware
const authMiddleware = (roles = []) => (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');

    if (roles.length && !roles.includes(decoded.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    req.user = decoded; // user info: id + role
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

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

// Get top discounted products (top 6 by Discount desc)
app.get('/api/products/top-discount', async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT TOP 8
        Id,
        Name,
        Price,
        OriginalPrice,
        Discount,
        Rating,
        Reviews,
        ImageUrl
      FROM Products
      WHERE Discount > 0
      ORDER BY Discount DESC
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Top discount error:', err);
    res.status(500).json({ message: 'Failed to load top discount products' });
  }
});


app.get('/api/admin/products', authMiddleware(['admin']), async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT * FROM Products');
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
// POST /api/login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('email', email)
      .query('SELECT Id, Name, Email, Password, Role FROM Users WHERE Email = @email');

    if (result.recordset.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = result.recordset[0];

    // Check password
    const valid = await bcrypt.compare(password, user.Password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    // JWT token
    const token = jwt.sign({ id: user.Id, role: user.Role }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });

    res.json({ ok: true, user: { Id: user.Id, Name: user.Name, Email: user.Email, Role: user.Role }, token });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  console.log('POST /api/register body:', req.body);
  // stricter validation
  if (!name || !name.toString().trim() || !email || !email.toString().trim() || !password || !password.toString().trim()) {
    return res.status(400).json({ error: 'All fields required: name, email, password' });
  }

  try {
    const pool = await getPool();
    // Check if email exists
    const existing = await pool.request().input('email', email).query('SELECT Id FROM Users WHERE Email = @email');
    if (existing.recordset.length > 0) return res.status(400).json({ error: 'Email already exists' });

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // Allow role assignment only by an authenticated admin
    let role = 'user';
    const authHeader = req.headers.authorization?.split(' ')[1];
    if (req.body.role && authHeader) {
      try {
        const decoded = jwt.verify(authHeader, process.env.JWT_SECRET || 'secret');
        if (decoded.role === 'admin') {
          role = req.body.role;
        }
      } catch (e) {
        // ignore invalid token - default to user
      }
    }

    // Insert user and return created row
    const result = await pool.request()
      .input('name', name)
      .input('email', email)
      .input('password', hashed)
      .input('role', role)
      .query(`INSERT INTO Users (Name, Email, Password, Role, Created_at) OUTPUT INSERTED.Id, INSERTED.Name, INSERTED.Email, INSERTED.Role VALUES (@name, @email, @password, @role, GETDATE())`);

    const user = result.recordset[0];

    // JWT token
    const token = jwt.sign({ id: user.Id, role: user.Role || 'user' }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });

    res.json({ ok: true, user, token });

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
