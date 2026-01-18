import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { createRequire } from 'module';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import sql from 'mssql';

dotenv.config();
const require = createRequire(import.meta.url);
const { getPool } = require('./db.cjs');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Simple request logger for debugging route matching
app.use((req, res, next) => {
  try {
    console.log(`[api] ${req.method} ${req.originalUrl} - query:`, req.query);
  } catch (e) {}
  next();
});

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



// Post a review for a product (requires auth)
app.post('/api/products/:id(\\d+)/reviews', authMiddleware(), async (req, res) => {
  // Accept optional token: if Authorization header present verify, else proceed as anonymous
  const id = parseInt(req.params.id, 10);
  const { rating, text } = req.body;
  if (isNaN(id) || !rating) return res.status(400).json({ error: 'Product id and rating are required' });

  try {
    const pool = await getPool();

    // Require authenticated user from middleware
    const authUser = req.user;
    if (!authUser || !authUser.id) return res.status(401).json({ error: 'Authentication required' });
    const userId = authUser.id;
    const userName = authUser.name ?? 'Anonymous';

    // detect if Feedback table has a UserId column; prefer using UserId for uniqueness
    let hasUserId = false;
    try {
      const colCheck = await pool.request().input('tbl', 'Feedback').input('col', 'UserId').query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @tbl AND COLUMN_NAME = @col`);
      hasUserId = (colCheck.recordset || []).length > 0;
    } catch (e) {
      hasUserId = false;
    }

    // check existing feedback by this user for this product
    let existing = null;
    try {
      if (hasUserId) {
        const q = await pool.request().input('productId', id).input('userId', userId).query('SELECT TOP 1 * FROM Feedback WHERE ProductId = @productId AND UserId = @userId');
        existing = q.recordset && q.recordset.length ? q.recordset[0] : null;
      } else {
        const q = await pool.request().input('productId', id).input('userName', userName).query('SELECT TOP 1 * FROM Feedback WHERE ProductId = @productId AND UserName = @userName');
        existing = q.recordset && q.recordset.length ? q.recordset[0] : null;
      }
    } catch (e) {
      existing = null;
    }

    let inserted = null;
    if (existing) {
      // update existing feedback (user already reviewed this product)
      try {
        const updReq = pool.request().input('id', existing.Id).input('rating', rating).input('comment', text || '');
        const upd = await updReq.query(`UPDATE Feedback SET Rating = @rating, Comment = @comment, Created_at = GETDATE(), IsApproved = 1 WHERE Id = @id; SELECT TOP 1 * FROM Feedback WHERE Id = @id`);
        inserted = upd.recordset && upd.recordset.length ? upd.recordset[0] : null;
      } catch (ue) {
        console.error('Update feedback failed', ue);
        return res.status(500).json({ error: 'Failed to update feedback', detail: String(ue) });
      }
    } else {
      // insert new feedback (include UserId if column exists)
      try {
        if (hasUserId) {
          const ins = await pool.request()
            .input('productId', id)
            .input('userId', userId)
            .input('userName', userName)
            .input('rating', rating)
            .input('comment', text || '')
            .query(`INSERT INTO Feedback (ProductId, UserId, UserName, Comment, Rating, Created_at, IsApproved)
                    OUTPUT INSERTED.*
                    VALUES (@productId, @userId, @userName, @comment, @rating, GETDATE(), 1)`);
          inserted = ins.recordset && ins.recordset.length ? ins.recordset[0] : null;
        } else {
          const ins = await pool.request()
            .input('productId', id)
            .input('userName', userName)
            .input('rating', rating)
            .input('comment', text || '')
            .query(`INSERT INTO Feedback (ProductId, UserName, Comment, Rating, Created_at, IsApproved)
                    OUTPUT INSERTED.*
                    VALUES (@productId, @userName, @comment, @rating, GETDATE(), 1)`);
          inserted = ins.recordset && ins.recordset.length ? ins.recordset[0] : null;
        }
      } catch (qerr) {
        console.error('Insert feedback failed:', qerr);
        return res.status(500).json({ error: 'Failed to save feedback', detail: String(qerr) });
      }
    }

    // After insert/update: ensure only a single feedback row exists per (product,user)
      if (inserted) {
        try {
          if (hasUserId) {
            await pool.request().input('productId', id).input('userId', userId).input('keepId', inserted.Id)
              .query('DELETE FROM Feedback WHERE ProductId = @productId AND UserId = @userId AND Id <> @keepId');
          } else {
            await pool.request().input('productId', id).input('userName', userName).input('keepId', inserted.Id)
              .query("DELETE FROM Feedback WHERE ProductId = @productId AND UserName = @userName AND Id <> @keepId");
          }
        } catch (cleanErr) {
          console.warn('Failed to cleanup duplicate feedback rows:', cleanErr);
        }
      }

    // recompute aggregates (approved only)
    try {
      const agg = await pool.request().input('id', id).query('SELECT AVG(CAST(Rating AS FLOAT)) AS AvgRating, COUNT(*) AS ReviewCount FROM Feedback WHERE ProductId = @id AND IsApproved = 1');
      const row = agg.recordset[0] || { AvgRating: null, ReviewCount: 0 };
      const avg = row.AvgRating !== null ? Number(row.AvgRating) : null;
      const count = Number(row.ReviewCount || 0);

      // update Products table metrics (best-effort)
      try {
        await pool.request().input('id', id).input('avg', avg).input('count', count)
          .query('UPDATE Products SET Rating = @avg, Reviews = @count WHERE Id = @id');
      } catch (e) {
        console.warn('Failed to update product metrics', e);
      }

      return res.json({ ok: true, review: inserted, avgRating: avg, reviewCount: count, updated: !!existing });
    } catch (e) {
      console.error('Aggregate after feedback failed', e);
      return res.status(500).json({ error: 'Failed to compute aggregates', detail: String(e) });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
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
  const searchTerm = (req.query.q || '').trim();

  console.log('[search route] received q=', req.query.q, 'trimmed=', searchTerm);

  if (!searchTerm) return res.json([]);

  try {
    const pool = await getPool();
    const request = pool.request();

    request.input('search', sql.NVarChar, `%${searchTerm}%`);

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
        Discount
      FROM Products
      WHERE Name COLLATE Latin1_General_CI_AI LIKE @search
         OR Description COLLATE Latin1_General_CI_AI LIKE @search
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error('SEARCH ERROR:', err);
    res.status(500).json({ error: String(err) });
  }
});

// Get single product with aggregated reviews/rating
app.get('/api/products/:id(\\d+)', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid product id' });
  try {
    const pool = await getPool();
    const prodRes = await pool.request()
      .input('id', id)
      .query(`
        SELECT TOP 1
          Id,
          Name,
          Price,
          OriginalPrice,
          ImageUrl,
          Discount,
          Rating,
          Reviews,
          Description
        FROM Products
        WHERE Id = @id
      `);
    if (!prodRes.recordset.length) return res.status(404).json({ error: 'Product not found' });
    const product = prodRes.recordset[0];

    // aggregate reviews from Feedback table (approved only) if exists
    try {
      const agg = await pool.request().input('id', id).query(`SELECT AVG(CAST(Rating AS FLOAT)) AS AvgRating, COUNT(*) AS ReviewCount FROM Feedback WHERE ProductId = @id AND IsApproved = 1`);
      const row = agg.recordset[0] || { AvgRating: null, ReviewCount: 0 };
      const avg = row.AvgRating !== null ? Number(row.AvgRating) : (product.Rating ?? 0);
      const count = Number(row.ReviewCount || product.Reviews || 0);

      // fetch recent approved feedback (map DB Created_at to CreatedAt)
      let reviewsList = [];
      try {
        const revRes = await pool.request().input('id', id).query(`SELECT TOP (20) Id, ProductId, UserName, Comment, Rating, Created_at AS CreatedAt, IsApproved FROM Feedback WHERE ProductId = @id AND IsApproved = 1 ORDER BY Created_at DESC`);
        reviewsList = revRes.recordset || [];
      } catch (re) {
        console.warn('Failed to read Feedback list:', re);
        reviewsList = [];
      }

      // return combined product info
      const out = {
        Id: product.Id,
        Name: product.Name,
        Description: product.Description,
        Price: product.Price,
        OriginalPrice: product.OriginalPrice,
        ImageUrl: product.ImageUrl,
        Discount: product.Discount,
        Rating: +(avg).toFixed(2),
        Reviews: count,
        ReviewsList: reviewsList,
      };
      res.json(out);
    } catch (e) {
      // If Feedback table missing or aggregate fails, fallback to product values
      res.json({
        Id: product.Id,
        Name: product.Name,
        Description: product.Description,
        Price: product.Price,
        OriginalPrice: product.OriginalPrice,
        ImageUrl: product.ImageUrl,
        Discount: product.Discount,
        Rating: product.Rating,
        Reviews: product.Reviews,
        ReviewsList: [],
      });
    }
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
    const token = jwt.sign({ id: user.Id, role: user.Role, name: user.Name }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });

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
    const token = jwt.sign({ id: user.Id, role: user.Role || 'user', name: user.Name }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });

    res.json({ ok: true, user, token });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});


// Generic SQL executor (admin/debug) - use carefully
app.post('/api/query', authMiddleware(['admin']), async (req, res) => {
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
