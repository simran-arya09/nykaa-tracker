const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');
require('dotenv').config();

const app = express();
app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://simranarya8989_db_user:mpRLOYsjnHE66udZ@cluster0.lrffw9l.mongodb.net/nykaa';

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Error:', err));

// Schemas
const productSchema = new mongoose.Schema({
  name: String,
  url: { type: String, unique: true },
  current_price: Number,
  added_date: { type: Date, default: Date.now }
});

const priceHistorySchema = new mongoose.Schema({
  product_id: mongoose.Schema.Types.ObjectId,
  price: Number,
  timestamp: { type: Date, default: Date.now }
});

const alertSchema = new mongoose.Schema({
  product_id: mongoose.Schema.Types.ObjectId,
  old_price: Number,
  new_price: Number,
  discount_percent: Number,
  timestamp: { type: Date, default: Date.now }
});

const Product = mongoose.model('Product', productSchema);
const PriceHistory = mongoose.model('PriceHistory', priceHistorySchema);
const Alert = mongoose.model('Alert', alertSchema);

// Scraper
async function scrapeProduct(url) {
  try {
    await new Promise(r => setTimeout(r, 2000));
    const res = await axios.get(url, { 
      headers: { 'User-Agent': 'Mozilla/5.0' }, 
      timeout: 20000, 
      validateStatus: () => true 
    });
    if (res.status === 403) return { success: false, error: 'Blocked' };
    const $ = cheerio.load(res.data);
    const name = $('h1').first().text().trim() || 'Product';
    const price = parseFloat($('span.css-1jczs19').first().text().replace(/[^\d.]/g, ''));
    return price ? { name, currentPrice: price, success: true } : { success: false, error: 'No price' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// API Routes
app.post('/api/products/add', async (req, res) => {
  try {
    const { url } = req.body;
    const data = await scrapeProduct(url);
    if (!data.success) return res.status(500).json({ error: data.error });
    
    const product = new Product({ name: data.name, url, current_price: data.currentPrice });
    await product.save();
    
    await PriceHistory.create({ product_id: product._id, price: data.currentPrice });
    
    res.json({ id: product._id, name: product.name, url, current_price: product.current_price });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/products', async (req, res) => {
  const products = await Product.find().sort({ added_date: -1 });
  res.json(products);
});

app.get('/api/products/:id/history', async (req, res) => {
  const history = await PriceHistory.find({ product_id: req.params.id }).sort({ timestamp: 1 });
  res.json(history);
});

app.post('/api/products/:id/refresh', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Not found' });
    
    const data = await scrapeProduct(product.url);
    if (!data.success) return res.status(500).json({ error: data.error });
    
    const oldPrice = product.current_price;
    product.current_price = data.currentPrice;
    await product.save();
    
    await PriceHistory.create({ product_id: product._id, price: data.currentPrice });
    
    if (data.currentPrice < oldPrice) {
      const pct = ((oldPrice - data.currentPrice) / oldPrice) * 100;
      await Alert.create({ product_id: product._id, old_price: oldPrice, new_price: data.currentPrice, discount_percent: pct });
    }
    
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/alerts', async (req, res) => {
  const alerts = await Alert.find().sort({ timestamp: -1 });
  const enriched = await Promise.all(alerts.map(async (a) => {
    const p = await Product.findById(a.product_id);
    return { ...a.toObject(), name: p?.name };
  }));
  res.json(enriched);
});

app.delete('/api/products/:id', async (req, res) => {
  await Alert.deleteMany({ product_id: req.params.id });
  await PriceHistory.deleteMany({ product_id: req.params.id });
  await Product.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// Scheduler
cron.schedule('*/15 * * * *', async () => {
  console.log('Checking prices...');
  const products = await Product.find();
  for (const p of products) {
    const data = await scrapeProduct(p.url);
    if (data.success) {
      p.current_price = data.currentPrice;
      await p.save();
      await PriceHistory.create({ product_id: p._id, price: data.currentPrice });
    }
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server on :${PORT}`));