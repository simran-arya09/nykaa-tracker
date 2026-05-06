const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const db = new sqlite3.Database('./tracker.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY, name TEXT, url TEXT UNIQUE, current_price REAL, added_date DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  db.run(`CREATE TABLE IF NOT EXISTS price_history (id INTEGER PRIMARY KEY, product_id INTEGER, price REAL, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  db.run(`CREATE TABLE IF NOT EXISTS alerts (id INTEGER PRIMARY KEY, product_id INTEGER, old_price REAL, new_price REAL, discount_percent REAL, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)`);
});

async function scrapeProduct(url) {
  try {
    await new Promise(r => setTimeout(r, 2000));
    const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 20000, validateStatus: () => true });
    if (res.status === 403) return { success: false, error: 'Blocked' };
    const $ = cheerio.load(res.data);
    const name = $('h1').first().text().trim() || 'Product';
    const price = parseFloat($('span.css-1jczs19').first().text().replace(/[^\d.]/g, ''));
    return price ? { name, currentPrice: price, success: true } : { success: false, error: 'No price' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

app.post('/api/products/add', async (req, res) => {
  const { url } = req.body;
  const data = await scrapeProduct(url);
  if (!data.success) return res.status(500).json({ error: data.error });
  db.run(`INSERT INTO products (name, url, current_price) VALUES (?, ?, ?)`, [data.name, url, data.currentPrice], function(e) {
    if (e) return res.status(500).json({ error: e.message });
    db.run(`INSERT INTO price_history (product_id, price) VALUES (?, ?)`, [this.lastID, data.currentPrice]);
    res.json({ id: this.lastID, name: data.name, url, current_price: data.currentPrice });
  });
});

app.get('/api/products', (req, res) => {
  db.all(`SELECT * FROM products`, (e, rows) => res.json(rows || []));
});

app.get('/api/products/:id/history', (req, res) => {
  db.all(`SELECT price, timestamp FROM price_history WHERE product_id = ?`, [req.params.id], (e, rows) => res.json(rows || []));
});

app.get('/api/alerts', (req, res) => {
  db.all(`SELECT a.*, p.name FROM alerts a JOIN products p ON a.product_id = p.id`, (e, rows) => res.json(rows || []));
});

app.post('/api/products/:id/refresh', async (req, res) => {
  db.get(`SELECT url, current_price FROM products WHERE id = ?`, [req.params.id], async (e, p) => {
    if (!p) return res.status(404).json({ error: 'Not found' });
    const data = await scrapeProduct(p.url);
    if (!data.success) return res.status(500).json({ error: data.error });
    db.run(`UPDATE products SET current_price = ? WHERE id = ?`, [data.currentPrice, req.params.id]);
    db.run(`INSERT INTO price_history (product_id, price) VALUES (?, ?)`, [req.params.id, data.currentPrice]);
    if (data.currentPrice < p.current_price) {
      const pct = ((p.current_price - data.currentPrice) / p.current_price) * 100;
      db.run(`INSERT INTO alerts VALUES (NULL, ?, ?, ?, ?, CURRENT_TIMESTAMP)`, [req.params.id, p.current_price, data.currentPrice, pct]);
    }
    res.json({ success: true });
  });
});

app.delete('/api/products/:id', (req, res) => {
  db.run(`DELETE FROM alerts WHERE product_id = ?`, [req.params.id]);
  db.run(`DELETE FROM price_history WHERE product_id = ?`, [req.params.id]);
  db.run(`DELETE FROM products WHERE id = ?`, [req.params.id]);
  res.json({ success: true });
});

cron.schedule('*/15 * * * *', () => {
  console.log('Checking prices...');
  db.all(`SELECT id, url, current_price FROM products`, async (e, ps) => {
    if (!ps) return;
    for (const p of ps) {
      const data = await scrapeProduct(p.url);
      if (data.success) {
        db.run(`UPDATE products SET current_price = ? WHERE id = ?`, [data.currentPrice, p.id]);
        db.run(`INSERT INTO price_history VALUES (NULL, ?, ?, CURRENT_TIMESTAMP)`, [p.id, data.currentPrice]);
      }
    }
  });
});

app.listen(5000, () => console.log('🚀 Server on http://localhost:5000'));