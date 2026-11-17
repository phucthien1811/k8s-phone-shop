const express = require('express');
const os = require('os');
const mysql = require('mysql2/promise');
const { initDatabase, resetStock } = require('./seed');
const { clusterStatus } = require('./k8s');

// ---- Cấu hình (lấy từ ConfigMap / Secret qua biến môi trường) ----
const PORT = Number(process.env.PORT || 3000);
const POD_NAME = process.env.POD_NAME || os.hostname();
const NODE_NAME = process.env.NODE_NAME || 'local';
const APP_VERSION = process.env.APP_VERSION || 'v1';
const FLASH_SALE_MINUTES = Number(process.env.FLASH_SALE_MINUTES || 60);
const STARTED_AT = Date.now();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'shop',
  password: process.env.DB_PASSWORD || 'shop',
  database: process.env.DB_NAME || 'phoneshop',
  waitForConnections: true,
  connectionLimit: 10,
});

let dbReady = false;
let requestCount = 0;
// Thời điểm kết thúc flash sale: tính theo giờ tròn để mọi Pod trả về cùng một giá trị
const flashSaleEnd = () => {
  const ms = FLASH_SALE_MINUTES * 60 * 1000;
  return Math.ceil(Date.now() / ms) * ms;
};

const app = express();
app.use(express.json());

// Mỗi phản hồi đều ghi rõ Pod nào đã xử lý -> thấy được cân bằng tải
app.use((req, res, next) => {
  requestCount++;
  res.set('X-Served-By', POD_NAME);
  res.set('X-Node-Name', NODE_NAME);
  next();
});

const wrap = (fn) => (req, res) =>
  fn(req, res).catch((err) => {
    console.error(err);
    res.status(500).json({ error: err.message });
  });

// ---- Sức khỏe (dùng cho readinessProbe) ----
app.get('/api/health', (req, res) => {
  if (!dbReady) return res.status(503).json({ status: 'starting' });
  res.json({ status: 'ok' });
});

// ---- Thông tin Pod đang phục vụ ----
app.get('/api/info', (req, res) => {
  res.json({
    pod: POD_NAME,
    node: NODE_NAME,
    version: APP_VERSION,
    uptimeSeconds: Math.round((Date.now() - STARTED_AT) / 1000),
    requestsServed: requestCount,
  });
});

// ---- Sản phẩm ----
app.get('/api/products', wrap(async (req, res) => {
  const { q, brand } = req.query;
  const where = [];
  const params = [];
  if (q) { where.push('name LIKE ?'); params.push(`%${q}%`); }
  if (brand) { where.push('brand = ?'); params.push(brand); }
  const [rows] = await pool.query(
    `SELECT id, name, brand, price, sale_price, stock, flash_sale, color FROM products
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY flash_sale DESC, id`,
    params
  );
  res.json(rows);
}));

app.get('/api/products/:id', wrap(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
  res.json(rows[0]);
}));

app.get('/api/flash-sale', wrap(async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id, name, brand, price, sale_price, stock, color FROM products WHERE flash_sale = 1 ORDER BY id'
  );
  res.json({ endsAt: flashSaleEnd(), products: rows });
}));

app.get('/api/brands', wrap(async (req, res) => {
  const [rows] = await pool.query('SELECT DISTINCT brand FROM products ORDER BY brand');
  res.json(rows.map((r) => r.brand));
}));

// ---- Đặt hàng: dùng transaction + khóa dòng để không bán quá tồn kho ----
app.post('/api/orders', wrap(async (req, res) => {
  const { customer, items } = req.body || {};
  if (!customer?.name || !customer?.phone || !customer?.address || !Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: 'Thiếu thông tin khách hàng hoặc giỏ hàng trống' });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    let total = 0;
    const lines = [];
    for (const { productId, quantity } of items) {
      const qty = Math.max(1, Number(quantity) || 1);
      const [[p]] = await conn.query('SELECT id, name, price, sale_price, stock FROM products WHERE id = ? FOR UPDATE', [productId]);
      if (!p) throw Object.assign(new Error(`Sản phẩm ${productId} không tồn tại`), { status: 400 });
      if (p.stock < qty) throw Object.assign(new Error(`${p.name} chỉ còn ${p.stock} sản phẩm`), { status: 409 });
      const price = p.sale_price ?? p.price;
      total += price * qty;
      lines.push([p.id, qty, price]);
      await conn.query('UPDATE products SET stock = stock - ? WHERE id = ?', [qty, p.id]);
    }
    const [r] = await conn.query(
      'INSERT INTO orders (customer_name, phone, address, total, served_by) VALUES (?,?,?,?,?)',
      [customer.name, customer.phone, customer.address, total, POD_NAME]
    );
    for (const [pid, qty, price] of lines) {
      await conn.query('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?,?,?,?)', [r.insertId, pid, qty, price]);
    }
    await conn.commit();
    res.status(201).json({ orderId: r.insertId, total, servedBy: POD_NAME, node: NODE_NAME });
  } catch (err) {
    await conn.rollback();
    if (err.status) return res.status(err.status).json({ error: err.message });
    throw err;
  } finally {
    conn.release();
  }
}));

// ---- Quản trị ----
app.get('/api/orders', wrap(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const [rows] = await pool.query(
    'SELECT id, customer_name, total, served_by, created_at FROM orders ORDER BY id DESC LIMIT ?', [limit]
  );
  res.json(rows);
}));

app.get('/api/stats', wrap(async (req, res) => {
  const [[s]] = await pool.query(`SELECT
      COUNT(*) AS totalOrders,
      COALESCE(SUM(total),0) AS revenue,
      SUM(created_at >= NOW(3) - INTERVAL 60 SECOND) AS ordersLastMinute
    FROM orders`);
  const [byPod] = await pool.query(
    `SELECT served_by AS pod, COUNT(*) AS orders FROM orders
     WHERE created_at >= NOW(3) - INTERVAL 10 MINUTE GROUP BY served_by ORDER BY orders DESC`
  );
  res.json({
    totalOrders: Number(s.totalOrders),
    revenue: Number(s.revenue),
    ordersLastMinute: Number(s.ordersLastMinute || 0),
    byPod,
  });
}));

app.get('/api/cluster', wrap(async (req, res) => {
  res.json(await clusterStatus());
}));

app.post('/api/admin/reset', wrap(async (req, res) => {
  await pool.query('DELETE FROM order_items');
  await pool.query('DELETE FROM orders');
  await resetStock(pool);
  res.json({ ok: true });
}));

// ---- Tạo tải CPU (để minh họa HPA) ----
app.get('/api/stress', (req, res) => {
  const ms = Math.min(Number(req.query.ms) || 300, 3000);
  const end = Date.now() + ms;
  let x = 0;
  while (Date.now() < end) x += Math.sqrt(Math.random());
  res.json({ pod: POD_NAME, burnedMs: ms, x: Math.round(x) });
});

// ---- Khởi động: chờ MySQL sẵn sàng rồi tạo bảng/dữ liệu mẫu ----
async function start() {
  for (let i = 1; ; i++) {
    try {
      const seeded = await initDatabase(pool);
      dbReady = true;
      console.log(`[${POD_NAME}] Kết nối MySQL thành công${seeded ? ', đã tạo dữ liệu mẫu' : ''}`);
      break;
    } catch (err) {
      console.log(`[${POD_NAME}] Chờ MySQL (lần ${i}): ${err.code || err.message}`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

const server = app.listen(PORT, () => console.log(`[${POD_NAME}] Backend ${APP_VERSION} lắng nghe cổng ${PORT}`));
start();

// Tắt êm khi Kubernetes gửi SIGTERM (rolling update, scale-in)
process.on('SIGTERM', () => {
  console.log(`[${POD_NAME}] Nhận SIGTERM, đóng kết nối...`);
  server.close(() => pool.end().then(() => process.exit(0)));
  setTimeout(() => process.exit(0), 10000).unref();
});
