import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import sql from 'mssql';

dotenv.config();
const require = createRequire(import.meta.url);
const { getPool } = require('./db.cjs');
const app = express();
const fs = require('fs');
const path = require('path');

// Provide __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(cors());
app.use(bodyParser.json());

// Simple request logger for debugging route matching
app.use((req, res, next) => {
  try {
    console.log(`[api] ${req.method} ${req.originalUrl} - query:`, req.query);
  } catch (e) {}
  next();
});

// debug POST endpoint to verify POST handling
app.post('/api/debug', (req, res) => {
  console.log('[api] DEBUG POST received', req.method, req.originalUrl);
  res.json({ ok: true, now: new Date().toISOString() });
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
    // Detect if Feedback table has any UserId-like column (e.g. UserId, User_ID, userid)
    let hasUserId = false;
    let userIdCol = null;
    try {
      const colsRes = await pool.request().input('tbl', 'Feedback').query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @tbl");
      const names = (colsRes.recordset || []).map(r => String(r.COLUMN_NAME || ''));
      const found = names.find(n => /user.*id/i.test(n));
      if (found) { hasUserId = true; userIdCol = found; }
    } catch (e) {
      hasUserId = false; userIdCol = null;
    }

    // Detect which CreatedAt column variant exists (look for any column starting with "Created")
    let createdCol = 'CreatedAt';
    try {
      const cck = await pool.request().input('tbl', 'Feedback').query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @tbl AND COLUMN_NAME LIKE 'Created%'");
      if ((cck.recordset || []).length) createdCol = cck.recordset[0].COLUMN_NAME;
    } catch (e) {
      // keep default
    }

    // We will always insert a new feedback row. Previously we attempted to dedupe
    // and update an existing feedback per user; now we allow multiple reviews per
    // user for the same product. If a UserId-like column exists, include it on insert.
    let inserted = null;
    try {
      console.log('[reviews] about to insert feedback', { productId: id, userId: hasUserId ? userId : undefined, userName, rating, comment: text || '', createdCol });
      if (hasUserId && userIdCol) {
        const insQ = `INSERT INTO Feedback (ProductId, [${userIdCol}], UserName, Comment, Rating, ${createdCol}, IsApproved) OUTPUT INSERTED.* VALUES (@productId, @userId, @userName, @comment, @rating, GETDATE(), 1)`;
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
    // Prefer latest reply from FeedbackReplies if table exists, otherwise fall back to AdminReply columns on Feedback
    const q = `
      SELECT TOP (200)
        f.Id,
        f.ProductId,
        p.Name AS ProductName,
        f.UserName,
        f.Comment,
        f.Rating,
        f.IsApproved,
        f.${createdColForRead} AS CreatedAt,
        f.AdminReply,
        f.AdminReplyDate AS AdminReplyAt
      FROM Feedback f
      LEFT JOIN Products p ON p.Id = f.ProductId
      ORDER BY f.${createdColForRead} DESC
      `;

    const r = await pool.request().query(q);
    res.json(r.recordset || []);
  } catch (err) {
    console.error('ADMIN FEEDBACKS ERROR', err);
    res.status(500).json({ error: String(err) });
  }
});

// Admin: add or update a reply to a feedback (creates FeedbackReplies table if missing)
app.post('/api/admin/feedbacks/:id/reply', authMiddleware(['admin']), async (req, res) => {
  const fid = parseInt(req.params.id, 10);
  const { reply } = req.body;
  if (isNaN(fid)) return res.status(400).json({ error: 'Invalid feedback id' });
  if (!reply?.trim()) return res.status(400).json({ error: 'Reply text required' });

  try {
    const pool = await getPool();

    const upd = await pool.request()
      .input('fid', fid)
      .input('replyText', reply)
      .input('adminName', req.user.name)
      .query(`
        UPDATE Feedback
        SET AdminReply = @replyText,
            AdminReplyName = @adminName,
            AdminReplyDate = GETDATE()
        WHERE Id = @fid;

        SELECT Id, AdminReply, AdminReplyName, AdminReplyDate
        FROM Feedback WHERE Id = @fid
      `);
    
      // Also mirror the reply into the Feedback table's AdminReply columns so public product endpoints see it reliably
      try {
        await pool.request()
          .input('fid', fid)
          .input('replyText', reply)
          .input('adminName', req.user.name)
          .input('replyAt', new Date())
          .query('UPDATE Feedback SET AdminReply = @replyText, AdminReplyName = @adminName, AdminReplyDate = @replyAt WHERE Id = @fid');
      } catch (mirrorErr) {
        console.warn('Failed to mirror reply into Feedback table:', mirrorErr);
      }

    res.json({ ok: true, reply: upd.recordset[0] });

  } catch (err) {
    console.error(err);
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
      const orders = await pool.request().query(`
        SELECT TOP (200) o.*, (
          SELECT COUNT(*) FROM OrderItems oi WHERE oi.OrderId = o.Id
        ) AS ItemsCount
        FROM Orders o
        ORDER BY o.CreatedAt DESC
      `);
      let list = orders.recordset || [];
      // also include any fallback JSON-stored orders
      try {
        const storePath = path.join(__dirname, 'orders_store.json');
        if (fs.existsSync(storePath)) {
          const raw = fs.readFileSync(storePath, 'utf8');
          const fileOrders = JSON.parse(raw || '[]');
          // compute ItemsCount for fallback orders when possible
          const enrichedFileOrders = (fileOrders || []).map(o => {
            const items = o.items || o.Items || o.OrderItems || [];
            return { ...o, ItemsCount: Array.isArray(items) ? items.length : (o.ItemsCount || 0) };
          });
          list = list.concat(enrichedFileOrders);
        }
      } catch (fe) {
        console.warn('Failed to read orders_store.json', fe.message);
      }
      return res.json(list);
    } catch (e) {
      // Table missing or different schema
      console.warn('Orders table unavailable or different schema:', e.message);
      // return JSON-stored orders if available
      try {
        const storePath = path.join(__dirname, 'orders_store.json');
        if (fs.existsSync(storePath)) {
          const raw = fs.readFileSync(storePath, 'utf8');
          const fileOrders = JSON.parse(raw || '[]');
          return res.json(fileOrders || []);
        }
      } catch (fe) {
        console.warn('Failed to read orders_store.json', fe.message);
      }
      return res.json([]);
    }
  } catch (err) {
    console.error('ADMIN ORDERS ERROR', err);
    res.status(500).json({ error: String(err) });
  }
});

// Admin: get single order with items (by id)
app.get('/api/admin/orders/:id', authMiddleware(['admin']), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid order id' });
  try {
    const pool = await getPool();
    try {
      // Select order
      const ordRes = await pool.request().input('id', id).query('SELECT TOP (1) * FROM Orders WHERE Id = @id');
      if (ordRes.recordset.length === 0) return res.status(404).json({ error: 'Order not found' });
      const order = ordRes.recordset[0];
      // select items
      let items = [];
      try {
        const itRes = await pool.request().input('orderId', id).query('SELECT * FROM OrderItems WHERE OrderId = @orderId');
        items = itRes.recordset || [];
      } catch (e) {
        items = [];
      }

      // normalize item fields and enrich from Products when snapshot fields missing
      const normalized = items.map(it => ({
        raw: it,
        productId: it.ProductId || it.productId || it.ProductID || null,
        productName: it.ProductName || it.Product_name || it.name || null,
        imageUrl: it.ImageUrl || it.Image || it.imageUrl || null,
        price: (it.Price !== undefined && it.Price !== null) ? Number(it.Price) : (it.price !== undefined ? Number(it.price) : null),
        qty: (it.Quantity !== undefined && it.Quantity !== null) ? Number(it.Quantity) : (it.qty !== undefined ? Number(it.qty) : 1)
      }));

      // find which productIds still need lookup
      const needLookup = Array.from(new Set(normalized.filter(n => (!n.productName || !n.imageUrl) && n.productId).map(n => n.productId)));
      const prodById = {};
      if (needLookup.length) {
        try {
          const ids = needLookup.map(v => Number(v)).filter(n => Number.isFinite(n));
          if (ids.length) {
            const q = `SELECT Id, Name, ImageUrl FROM Products WHERE Id IN (${ids.join(',')})`;
            const resProds = await pool.request().query(q);
            (resProds.recordset || []).forEach(p => { prodById[String(p.Id)] = p; });
          }
        } catch (pe) {
          console.warn('Product lookup failed when enriching order detail:', pe.message);
        }
      }

      const outItems = normalized.map(n => {
        const prod = n.productId ? prodById[String(n.productId)] : null;
        return {
          id: n.productId || null,
          name: n.productName || (prod && (prod.Name || prod.name)) || `Product ${n.productId || ''}`,
          imageUrl: n.imageUrl || (prod && (prod.ImageUrl || prod.imageUrl || prod.Image)) || '/placeholder.png',
          qty: n.qty || 1,
          price: n.price || 0
        };
      });

      const out = { ...order, items: outItems };
      return res.json(out);
    } catch (e) {
      // Orders table might not exist; fallback to JSON store
      console.warn('Orders table read failed:', e.message);
      try {
        const storePath = path.join(__dirname, 'orders_store.json');
        if (fs.existsSync(storePath)) {
          const raw = fs.readFileSync(storePath, 'utf8');
          const list = JSON.parse(raw || '[]');
          const found = list.find(o => String(o.id) === String(id) || String(o.Id) === String(id));
          if (found) return res.json(found);
        }
      } catch (fe) {
        console.warn('Failed to read orders_store.json', fe.message);
      }
      return res.status(404).json({ error: 'Order not found' });
    }
  } catch (err) {
    console.error('ADMIN ORDER DETAIL ERROR', err);
    res.status(500).json({ error: String(err) });
  }
});

// Create order endpoint: tries DB insert, falls back to JSON file storage
app.post('/api/orders', async (req, res) => {
  const payload = req.body || {};
  try {
    const pool = await getPool();
    try {
      // Attempt to insert into Orders and OrderItems according to provided schema
      const items = Array.isArray(payload.items) ? payload.items : [];
      const subtotal = items.reduce((s, it) => s + ((Number(it.price) || 0) * (Number(it.qty ?? it.quantity) || 1)), 0);
      const discount = Number(payload.discount ?? payload.Discount ?? 0) || 0;
      const totalFromPayload = Number(payload.total ?? payload.Total) || 0;
      const total = totalFromPayload || Math.max(0, subtotal - discount);

      let tx = null;
      tx = pool.transaction();
      await tx.begin();
      const req = tx.request();

      req.input('CustomerName', sql.NVarChar(150), payload.name || payload.CustomerName || null);
      req.input('Phone', sql.NVarChar(50), payload.phone || payload.Phone || null);
      req.input('Address', sql.NVarChar(300), payload.address || payload.Address || null);
      req.input('PaymentMethod', sql.NVarChar(50), payload.payment || payload.PaymentMethod || null);
      req.input('DeliveryMethod', sql.NVarChar(50), payload.deliveryMethod || payload.DeliveryMethod || null);
      req.input('Status', sql.NVarChar(50), payload.status || payload.Status || 'Pending');
      req.input('Subtotal', sql.Decimal(18,2), subtotal || 0);
      req.input('Discount', sql.Decimal(18,2), discount || 0);
      req.input('Total', sql.Decimal(18,2), total || 0);

      const insertOrderSql = `INSERT INTO Orders (CustomerName, Phone, Address, PaymentMethod, DeliveryMethod, Status, Subtotal, Discount, Total, CreatedAt) OUTPUT INSERTED.Id VALUES (@CustomerName, @Phone, @Address, @PaymentMethod, @DeliveryMethod, @Status, @Subtotal, @Discount, @Total, GETDATE())`;
      const inserted = await req.query(insertOrderSql);
      const orderId = inserted.recordset && inserted.recordset[0] && (inserted.recordset[0].Id || inserted.recordset[0].id || inserted.recordset[0].ID) || null;

      if (orderId && items.length) {
        // batch fetch product metadata for snapshot (Name, ImageUrl)
        const prodIds = Array.from(new Set(items.map((it) => it.id || it.productId || it.ProductId).filter(Boolean)));
        const prodById = {};
        if (prodIds.length) {
          try {
            const ids = prodIds.map(v => Number(v)).filter(n => Number.isFinite(n));
            if (ids.length) {
              const q = `SELECT Id, Name, ImageUrl FROM Products WHERE Id IN (${ids.join(',')})`;
              const resProds = await pool.request().query(q);
              (resProds.recordset || []).forEach((p) => { prodById[String(p.Id)] = p; });
            }
          } catch (pe) {
            // ignore product lookup failures
            console.warn('Product lookup failed for order snapshot:', pe.message);
          }
        }

        for (const it of items) {
          const r = tx.request();
          const pid = it.id || it.productId || it.ProductId || null;
          const prod = pid ? prodById[String(pid)] : null;
          const snapshotName = it.name || it.title || (prod && (prod.Name || prod.name)) || null;
          const snapshotImage = it.imageUrl || it.image || (prod && (prod.ImageUrl || prod.imageUrl || prod.Image)) || null;
          r.input('OrderId', sql.Int, orderId);
          r.input('ProductId', sql.Int, pid);
          r.input('ProductName', sql.NVarChar(200), snapshotName);
          r.input('ImageUrl', sql.NVarChar(500), snapshotImage);
          r.input('Price', sql.Decimal(18,2), it.price || 0);
          r.input('Quantity', sql.Int, it.qty || it.quantity || 1);
          await r.query('INSERT INTO OrderItems (OrderId, ProductId, ProductName, ImageUrl, Price, Quantity) VALUES (@OrderId, @ProductId, @ProductName, @ImageUrl, @Price, @Quantity)');
        }
      }

      await tx.commit();
      return res.json({ success: true, orderId });
    } catch (dbErr) {
      console.warn('DB insert failed, falling back to JSON store:', dbErr.message);
      try {
        if (tx) {
          try { await tx.rollback(); } catch (e) { /* ignore */ }
        }
      } catch (e) { /* ignore */ }
      // fallback to file store below
    }
  } catch (e) {
    console.warn('DB unavailable, falling back to JSON store:', e.message);
  }

  // Fallback: store in backend/orders_store.json
  try {
    const storePath = path.join(__dirname, 'orders_store.json');
    let list = [];
    if (fs.existsSync(storePath)) {
      const raw = fs.readFileSync(storePath, 'utf8');
      list = JSON.parse(raw || '[]');
    }
    const id = Date.now();
    const saved = { id, createdAt: new Date().toISOString(), ...payload };
    list.unshift(saved);
    fs.writeFileSync(storePath, JSON.stringify(list, null, 2), 'utf8');
    return res.json({ success: true, fallbackId: id });
  } catch (fe) {
    console.error('Failed to persist order in fallback store:', fe);
    return res.status(500).json({ error: 'Failed to persist order' });
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

        // include admin reply if present. Avoid referencing FeedbackReplies if the table doesn't exist.
        let repliesTableExists = false;
        try {
          const tcheck = await pool.request().input('tbl', 'FeedbackReplies').query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = @tbl");
          repliesTableExists = (tcheck.recordset || []).length > 0;
        } catch (tce) {
          repliesTableExists = false;
        }

        let revRes;
        if (repliesTableExists) {
          revRes = await pool.request().input('id', id).query(`
            SELECT TOP (20) f.Id, f.ProductId, f.UserName, f.Comment, f.Rating, f.${createdColForRead} AS CreatedAt, f.IsApproved,
              COALESCE((SELECT TOP 1 fr.ReplyText FROM FeedbackReplies fr WHERE fr.FeedbackId = f.Id ORDER BY fr.CreatedAt DESC), f.AdminReply) AS AdminReply,
              COALESCE((SELECT TOP 1 fr.CreatedAt FROM FeedbackReplies fr WHERE fr.FeedbackId = f.Id ORDER BY fr.CreatedAt DESC), f.AdminReplyDate) AS AdminReplyAt
            FROM Feedback f
            WHERE f.ProductId = @id AND f.IsApproved = 1
            ORDER BY f.${createdColForRead} DESC
          `);
        } else {
          revRes = await pool.request().input('id', id).query(`
            SELECT TOP (20) f.Id, f.ProductId, f.UserName, f.Comment, f.Rating, f.${createdColForRead} AS CreatedAt, f.IsApproved,
              f.AdminReply AS AdminReply,
              f.AdminReplyDate AS AdminReplyAt
            FROM Feedback f
            WHERE f.ProductId = @id AND f.IsApproved = 1
            ORDER BY f.${createdColForRead} DESC
          `);
        }
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
    // Detect surname-like column and include it in select if present
    let surnameColLogin = null;
    try {
      const cols = await pool.request().input('tbl', 'Users').query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @tbl");
      const names = (cols.recordset || []).map(r => String(r.COLUMN_NAME || ''));
      surnameColLogin = names.find(n => /surname|last.?name/i.test(n)) || null;
    } catch (e) {
      surnameColLogin = null;
    }

    const selectCols = ['Id', 'Name', 'Email', 'Password', 'Role', 'Status'];
    if (surnameColLogin) selectCols.push(`[${surnameColLogin}] AS Surname`);

    const result = await pool.request()
      .input('email', email)
      .query(`SELECT ${selectCols.join(', ')} FROM Users WHERE Email = @email`);

    if (result.recordset.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = result.recordset[0];

    // Check account status first
    const acctStatus = String(user.Status ?? user.status ?? 'active').toLowerCase();
    if (acctStatus === 'inactive') return res.status(403).json({ error: 'Sizin hesabiniz block olunub zehmet olmasa magaza ile elaqe saxlayin' });

    // Check password
    const valid = await bcrypt.compare(password, user.Password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    // JWT token (include display name combining Name + Surname when available)
    const displayName = user.Surname ? `${user.Name} ${user.Surname}` : user.Name;
    const token = jwt.sign({ id: user.Id, role: user.Role, name: displayName }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });

    const respUser = { Id: user.Id, Name: user.Name, Email: user.Email, Role: user.Role };
    if (user.Surname) respUser.Surname = user.Surname;
    res.json({ ok: true, user: respUser, token });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

app.post('/api/register', async (req, res) => {
  const { name, surname, email, password } = req.body;
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
    // Detect if Users table has a surname-like column
    let surnameCol = null;
    try {
      const cols = await pool.request().input('tbl', 'Users').query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @tbl");
      const names = (cols.recordset || []).map(r => String(r.COLUMN_NAME || ''));
      surnameCol = names.find(n => /surname|last.?name/i.test(n)) || null;
    } catch (e) {
      surnameCol = null;
    }

    let result;
    if (surnameCol) {
      const colsList = `Name, [${surnameCol}], Email, Password, Role, Created_at`;
      const vals = `@name, @surname, @email, @password, @role, GETDATE()`;
      result = await pool.request()
        .input('name', name)
        .input('surname', surname || '')
        .input('email', email)
        .input('password', hashed)
        .input('role', role)
        .query(`INSERT INTO Users (${colsList}) OUTPUT INSERTED.* VALUES (${vals})`);
    } else {
      // fallback: store full name in Name column
      const full = surname ? `${name} ${surname}` : name;
      result = await pool.request()
        .input('name', full)
        .input('email', email)
        .input('password', hashed)
        .input('role', role)
        .query(`INSERT INTO Users (Name, Email, Password, Role, Created_at) OUTPUT INSERTED.* VALUES (@name, @email, @password, @role, GETDATE())`);
    }

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