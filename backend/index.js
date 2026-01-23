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

    if (roles.length) {
      const userRole = String(decoded.role || '').toLowerCase();
      const allowed = roles.map(r => String(r).toLowerCase());
      if (!allowed.includes(userRole)) return res.status(403).json({ error: 'Forbidden' });
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
app.post('/api/products/:id/reviews', authMiddleware(), async (req, res) => {
  // Accept optional token: if Authorization header present verify, else proceed as anonymous
  console.log('[reviews] ENTER', req.method, req.originalUrl, 'auth=', req.headers.authorization, 'body=', req.body);
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

    // Detect which CreatedAt column variant exists (look for any column starting with "Created")
    let createdCol = 'CreatedAt';
    try {
      const cck = await pool.request().input('tbl', 'Feedback').query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @tbl AND COLUMN_NAME LIKE 'Created%'");
      if ((cck.recordset || []).length) createdCol = cck.recordset[0].COLUMN_NAME;
    } catch (e) {
      // keep default
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
        const updQ = `UPDATE Feedback SET Rating = @rating, Comment = @comment, ${createdCol} = GETDATE(), IsApproved = 1 WHERE Id = @id; SELECT TOP 1 * FROM Feedback WHERE Id = @id`;
        console.log('[reviews] update query:', updQ, 'params=', { id: existing.Id, rating, comment: text || '' });
        const upd = await updReq.query(updQ);
        inserted = upd.recordset && upd.recordset.length ? upd.recordset[0] : null;
        console.log('[reviews] updated feedback:', inserted);
      } catch (ue) {
        console.error('Update feedback failed', ue);
        return res.status(500).json({ error: 'Failed to update feedback', detail: String(ue) });
      }
    } else {
      // insert new feedback (include UserId if column exists)
      try {
        console.log('[reviews] about to insert feedback', { productId: id, userId: hasUserId ? userId : undefined, userName, rating, comment: text || '', createdCol });
        if (hasUserId) {
          const insQ = `INSERT INTO Feedback (ProductId, UserId, UserName, Comment, Rating, ${createdCol}, IsApproved) OUTPUT INSERTED.* VALUES (@productId, @userId, @userName, @comment, @rating, GETDATE(), 1)`;
          const ins = await pool.request()
            .input('productId', id)
            .input('userId', userId)
            .input('userName', userName)
            .input('rating', rating)
            .input('comment', text || '')
            .query(insQ);
          inserted = ins.recordset && ins.recordset.length ? ins.recordset[0] : null;
          console.log('[reviews] inserted feedback:', inserted);
        } else {
          const insQ = `INSERT INTO Feedback (ProductId, UserName, Comment, Rating, ${createdCol}, IsApproved) OUTPUT INSERTED.* VALUES (@productId, @userName, @comment, @rating, GETDATE(), 1)`;
          const ins = await pool.request()
            .input('productId', id)
            .input('userName', userName)
            .input('rating', rating)
            .input('comment', text || '')
            .query(insQ);
          inserted = ins.recordset && ins.recordset.length ? ins.recordset[0] : null;
          console.log('[reviews] inserted feedback:', inserted);
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
    console.log('[reviews] aggregate row for product', id, row);
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

// Admin: list recent feedbacks (requires admin)
app.get('/api/admin/feedbacks', authMiddleware(['admin']), async (req, res) => {
  try {
    const pool = await getPool();

    // detect created column name
    let createdColForRead = 'CreatedAt';
    try {
      const cck2 = await pool.request().input('tbl','Feedback').query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @tbl AND COLUMN_NAME LIKE 'Created%'");
      if ((cck2.recordset || []).length) createdColForRead = cck2.recordset[0].COLUMN_NAME;
    } catch (e) {}

    // attempt to join Feedback with Products to show product name
    const q = `SELECT TOP (200) f.Id, f.ProductId, p.Name AS ProductName, f.UserName, f.Comment, f.Rating, f.IsApproved, f.${createdColForRead} AS CreatedAt FROM Feedback f LEFT JOIN Products p ON p.Id = f.ProductId ORDER BY f.${createdColForRead} DESC`;
    const r = await pool.request().query(q);
    res.json(r.recordset || []);
  } catch (err) {
    console.error('ADMIN FEEDBACKS ERROR', err);
    res.status(500).json({ error: String(err) });
  }
});

// Admin: create product
app.post('/api/admin/products', authMiddleware(['admin']), async (req, res) => {
  const allowed = ['Name','name','Price','price','OriginalPrice','ImageUrl','Description','Discount','Rating','Reviews','Stock','Category','Status'];
  const body = req.body || {};
  // normalize image property casing and ensure non-null ImageUrl to satisfy DB NOT NULL constraint
  if (!body.ImageUrl && body.imageUrl) body.ImageUrl = body.imageUrl;
  if (!body.ImageUrl) body.ImageUrl = '/images/placeholder.png';
  // compute Discount automatically: percent off from OriginalPrice
  try {
    const priceNum = Number(body.Price ?? body.price);
    const originalNum = Number(body.OriginalPrice ?? body.originalPrice);
    if (Number.isFinite(priceNum) && Number.isFinite(originalNum) && originalNum > 0 && priceNum < originalNum) {
      body.Discount = Math.round(((originalNum - priceNum) / originalNum) * 100);
    } else {
      body.Discount = 0;
    }
  } catch (e) {
    body.Discount = 0;
  }
  const keys = Object.keys(body).filter(k => allowed.includes(k));
  if (!keys.length) return res.status(400).json({ error: 'No valid fields to create' });
  try {
    const pool = await getPool();
    // Build INSERT with parameters
    const cols = keys.map(k => `[${k}]`).join(', ');
    const vals = keys.map((k, i) => `@v${i}`).join(', ');
    const reqP = pool.request();
    keys.forEach((k, i) => reqP.input(`v${i}`, body[k]));
    const q = `INSERT INTO Products (${cols}) OUTPUT INSERTED.* VALUES (${vals})`;
    const r = await reqP.query(q);
    res.json(r.recordset && r.recordset[0] ? r.recordset[0] : {});
  } catch (err) {
    console.error('Admin create product error', err);
    res.status(500).json({ error: String(err) });
  }
});

// Admin: update product (partial fields allowed)
app.put('/api/admin/products/:id', authMiddleware(['admin']), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid product id' });
  const allowed = ['Name','name','Price','price','OriginalPrice','ImageUrl','Description','Discount','Rating','Reviews','Stock','Category','Status'];
  const updates = req.body || {};
  const keys = Object.keys(updates).filter(k => allowed.includes(k));
  if (!keys.length) return res.status(400).json({ error: 'No valid fields to update' });
  try {
    const pool = await getPool();
    // If Price or OriginalPrice changed, compute new Discount (use existing DB values when needed)
    const priceChanged = keys.some(k => k.toLowerCase() === 'price');
    const originalChanged = keys.some(k => k.toLowerCase() === 'originalprice');
    if (priceChanged || originalChanged) {
      const cur = await pool.request().input('id', id).query('SELECT Price, OriginalPrice FROM Products WHERE Id = @id');
      if (!cur.recordset.length) return res.status(404).json({ error: 'Product not found' });
      const current = cur.recordset[0] || {};
      const newPrice = Number(updates.Price ?? updates.price ?? current.Price);
      const newOriginal = Number(updates.OriginalPrice ?? updates.originalPrice ?? current.OriginalPrice);
      let disc = 0;
      if (Number.isFinite(newPrice) && Number.isFinite(newOriginal) && newOriginal > 0 && newPrice < newOriginal) {
        disc = Math.round(((newOriginal - newPrice) / newOriginal) * 100);
      }
      updates.Discount = disc;
      if (!keys.includes('Discount')) keys.push('Discount');
    }

    // Build SET clause safely using parameters
    const sets = keys.map((k, i) => `[${k}] = @v${i}`).join(', ');
    const reqP = pool.request();
    keys.forEach((k, i) => reqP.input(`v${i}`, updates[k]));
    reqP.input('id', id);
    // always update the updated timestamp when modifying a product
    const q = `UPDATE Products SET ${sets}, updated_at = GETDATE() WHERE Id = @id; SELECT TOP 1 * FROM Products WHERE Id = @id`;
    const r = await reqP.query(q);
    res.json(r.recordset && r.recordset[0] ? r.recordset[0] : {});
  } catch (err) {
    console.error('Admin update product error', err);
    res.status(500).json({ error: String(err) });
  }
});

// Admin: delete product
app.delete('/api/admin/products/:id', authMiddleware(['admin']), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid product id' });
  try {
    const pool = await getPool();
    // Delete product (best-effort). If foreign keys exist, this may fail.
    await pool.request().input('id', id).query('DELETE FROM Products WHERE Id = @id');
    res.json({ ok: true, deletedId: id });
  } catch (err) {
    console.error('Admin delete product error', err);
    res.status(500).json({ error: String(err) });
  }
});

// Admin stats endpoint: counts + top products by Reviews
app.get('/api/admin/stats', authMiddleware(['admin']), async (req, res) => {
  try {
    const pool = await getPool();
    const totalProductsRes = await pool.request().query('SELECT COUNT(*) AS cnt FROM Products');
    const totalUsersRes = await pool.request().query('SELECT COUNT(*) AS cnt FROM Users');
    const totalReviewsRes = await pool.request().query('SELECT COUNT(*) AS cnt FROM Feedback');

    const topProductsRes = await pool.request().query(`SELECT TOP (6) Id, Name, Price, ImageUrl, Rating, Reviews FROM Products ORDER BY Reviews DESC`);

    const totalProducts = totalProductsRes.recordset[0].cnt || 0;
    const totalUsers = totalUsersRes.recordset[0].cnt || 0;
    const totalReviews = totalReviewsRes.recordset[0].cnt || 0;
    const topProducts = topProductsRes.recordset || [];

    // For charts, if Orders table doesn't exist we return empty monthly data
    // Attempt to compute last 6 months sales if Orders/OrderItems tables exist (best-effort)
    let monthly = [];
    try {
      const q = await pool.request().query(`
        SELECT TOP (6) DATENAME(MONTH, o.CreatedAt) AS month, SUM(oi.Price * oi.Quantity) AS sales, COUNT(DISTINCT o.Id) AS orders
        FROM Orders o
        JOIN OrderItems oi ON oi.OrderId = o.Id
        WHERE o.CreatedAt >= DATEADD(MONTH, -6, GETDATE())
        GROUP BY DATENAME(MONTH, o.CreatedAt), MONTH(o.CreatedAt)
        ORDER BY MONTH(o.CreatedAt)
      `);
      monthly = q.recordset || [];
    } catch (e) {
      // orders not available; fallback to zeros
      monthly = [
        { month: 'Jan', sales: 0, orders: 0 },
        { month: 'Feb', sales: 0, orders: 0 },
        { month: 'Mar', sales: 0, orders: 0 },
        { month: 'Apr', sales: 0, orders: 0 },
        { month: 'May', sales: 0, orders: 0 },
        { month: 'Jun', sales: 0, orders: 0 }
      ];
    }

    res.json({ totalProducts, totalUsers, totalReviews, topProducts, monthly });
  } catch (err) {
    console.error('ADMIN STATS ERROR', err);
    res.status(500).json({ error: String(err) });
  }
});

// Admin orders endpoint (best-effort, returns empty list if Orders table missing)
app.get('/api/admin/orders', authMiddleware(['admin']), async (req, res) => {
  try {
    const pool = await getPool();
    // Try basic Orders table; adapt as needed for your schema
    try {
      const orders = await pool.request().query('SELECT TOP (200) * FROM Orders ORDER BY CreatedAt DESC');
      return res.json(orders.recordset || []);
    } catch (e) {
      // Table missing or different schema
      console.warn('Orders table unavailable or different schema:', e.message);
      return res.json([]);
    }
  } catch (err) {
    console.error('ADMIN ORDERS ERROR', err);
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
app.get('/api/products/:id', async (req, res) => {
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

      // fetch recent approved feedback (map DB created column to CreatedAt)
      let reviewsList = [];
      try {
        // detect created column (handle CreatedAt or Created_at)
        let createdColForRead = 'CreatedAt';
        try {
          const cck2 = await pool.request().input('tbl','Feedback').query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @tbl AND COLUMN_NAME LIKE 'Created%'");
          if ((cck2.recordset || []).length) createdColForRead = cck2.recordset[0].COLUMN_NAME;
        } catch (e) {}

        const revRes = await pool.request().input('id', id).query(`SELECT TOP (20) Id, ProductId, UserName, Comment, Rating, ${createdColForRead} AS CreatedAt, IsApproved FROM Feedback WHERE ProductId = @id AND IsApproved = 1 ORDER BY ${createdColForRead} DESC`);
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
    // include Created_at and Status so front-end can show join date and active/inactive
    const result = await pool.request().query('SELECT Id, Name, Email, Role, Status, Created_at FROM Users');
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
      .query('SELECT Id, Name, Email, Password, Role, Status FROM Users WHERE Email = @email');

    if (result.recordset.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = result.recordset[0];

    // Check account status first
    const acctStatus = String(user.Status ?? user.status ?? 'active').toLowerCase();
    if (acctStatus === 'inactive') return res.status(403).json({ error: 'Sizin hesabiniz block olunub zehmet olmasa magaza ile elaqe saxlayin' });

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

// Admin: update user (name, email, role, status)
app.put('/api/admin/users/:id', authMiddleware(['admin']), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid user id' });
  const allowed = ['Name','name','Email','email','Role','role','Status','status'];
  const body = req.body || {};
  const keys = Object.keys(body).filter(k => allowed.includes(k));
  if (!keys.length) return res.status(400).json({ error: 'No valid fields to update' });
  try {
    const pool = await getPool();
    const sets = keys.map((k, i) => {
      const col = (k === 'name') ? 'Name' : (k === 'email') ? 'Email' : (k === 'role') ? 'Role' : (k === 'status') ? 'Status' : k;
      return `[${col}] = @v${i}`;
    }).join(', ');
    const reqP = pool.request();
    keys.forEach((k, i) => reqP.input(`v${i}`, body[k]));
    reqP.input('id', id);
    const q = `UPDATE Users SET ${sets} WHERE Id = @id; SELECT TOP 1 Id, Name, Email, Role, Status, Created_at FROM Users WHERE Id = @id`;
    const r = await reqP.query(q);
    res.json(r.recordset && r.recordset[0] ? r.recordset[0] : {});
  } catch (err) {
    console.error('Admin update user error', err);
    res.status(500).json({ error: String(err) });
  }
});

// Admin: delete user
app.delete('/api/admin/users/:id', authMiddleware(['admin']), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid user id' });
  try {
    const pool = await getPool();
    await pool.request().input('id', id).query('DELETE FROM Users WHERE Id = @id');
    res.json({ ok: true, deletedId: id });
  } catch (err) {
    console.error('Admin delete user error', err);
    res.status(500).json({ error: String(err) });
  }
});

// Admin: create user (name, email, role, optional password)
app.post('/api/admin/users', authMiddleware(['admin']), async (req, res) => {
  const { name, email, role, password } = req.body || {};
  if (!name || !email) return res.status(400).json({ error: 'Name and email required' });
  try {
    const pool = await getPool();
    // check existing
    const exists = await pool.request().input('email', email).query('SELECT Id FROM Users WHERE Email = @email');
    if (exists.recordset.length > 0) return res.status(400).json({ error: 'Email already exists' });

    const plain = password && String(password).trim() ? String(password) : Math.random().toString(36).slice(-8);
    const hashed = await bcrypt.hash(plain, 10);
    const userRole = role ? String(role) : 'user';
    const userStatus = req.body && req.body.status ? String(req.body.status) : 'active';
    const ins = await pool.request()
      .input('name', name)
      .input('email', email)
      .input('password', hashed)
      .input('role', userRole)
      .input('status', userStatus)
      .query("INSERT INTO Users (Name, Email, Password, Role, Status, Created_at) OUTPUT INSERTED.Id, INSERTED.Name, INSERTED.Email, INSERTED.Role, INSERTED.Status, INSERTED.Created_at VALUES (@name, @email, @password, @role, @status, GETDATE())");

    const created = ins.recordset && ins.recordset[0] ? ins.recordset[0] : null;
    return res.json({ ok: true, user: created, password: plain });
  } catch (err) {
    console.error('Admin create user error', err);
    res.status(500).json({ error: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});

export default app;