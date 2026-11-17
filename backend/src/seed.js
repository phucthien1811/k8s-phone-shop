// Dữ liệu mẫu: tạo bảng và 20 sản phẩm nếu database còn trống.
// Chạy tự động mỗi khi backend khởi động (an toàn khi chạy nhiều lần).

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS products (
     id INT AUTO_INCREMENT PRIMARY KEY,
     name VARCHAR(120) NOT NULL,
     brand VARCHAR(40) NOT NULL,
     price INT NOT NULL,
     sale_price INT NULL,
     stock INT NOT NULL DEFAULT 0,
     flash_sale TINYINT(1) NOT NULL DEFAULT 0,
     color VARCHAR(20) NOT NULL DEFAULT '#1677ff',
     specs JSON NULL,
     description TEXT NULL
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS orders (
     id INT AUTO_INCREMENT PRIMARY KEY,
     customer_name VARCHAR(100) NOT NULL,
     phone VARCHAR(20) NOT NULL,
     address VARCHAR(255) NOT NULL,
     total INT NOT NULL,
     served_by VARCHAR(100) NOT NULL,
     created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
     INDEX idx_created (created_at)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS order_items (
     id INT AUTO_INCREMENT PRIMARY KEY,
     order_id INT NOT NULL,
     product_id INT NOT NULL,
     quantity INT NOT NULL,
     price INT NOT NULL,
     FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
     FOREIGN KEY (product_id) REFERENCES products(id)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

// [tên, hãng, giá gốc, giá sale (null = không sale), tồn kho, flash sale?, màu minh họa, thông số]
const PRODUCTS = [
  ['iPhone 16 Pro Max 256GB', 'Apple', 34990000, 17490000, 500, 1, '#2f2f2f', { 'Màn hình': '6.9" OLED 120Hz', Chip: 'A18 Pro', RAM: '8GB', Pin: '4685 mAh' }],
  ['iPhone 16 128GB', 'Apple', 22990000, null, 300, 0, '#6b8fd6', { 'Màn hình': '6.1" OLED', Chip: 'A18', RAM: '8GB', Pin: '3561 mAh' }],
  ['iPhone 15 128GB', 'Apple', 19990000, 15990000, 300, 0, '#f2c7d0', { 'Màn hình': '6.1" OLED', Chip: 'A16 Bionic', RAM: '6GB', Pin: '3349 mAh' }],
  ['iPhone 15 Plus 128GB', 'Apple', 22490000, null, 200, 0, '#c9e4c5', { 'Màn hình': '6.7" OLED', Chip: 'A16 Bionic', RAM: '6GB', Pin: '4383 mAh' }],
  ['Galaxy S25 Ultra 256GB', 'Samsung', 33990000, 16990000, 500, 1, '#4a4a5a', { 'Màn hình': '6.9" AMOLED 120Hz', Chip: 'Snapdragon 8 Elite', RAM: '12GB', Pin: '5000 mAh' }],
  ['Galaxy S25 256GB', 'Samsung', 22990000, null, 300, 0, '#9fb7d9', { 'Màn hình': '6.2" AMOLED', Chip: 'Snapdragon 8 Elite', RAM: '12GB', Pin: '4000 mAh' }],
  ['Galaxy Z Flip6 256GB', 'Samsung', 28990000, 21990000, 200, 0, '#b8e0d2', { 'Màn hình': '6.7" gập', Chip: 'Snapdragon 8 Gen 3', RAM: '12GB', Pin: '4000 mAh' }],
  ['Galaxy A56 5G 128GB', 'Samsung', 10490000, null, 400, 0, '#c7b9e8', { 'Màn hình': '6.7" AMOLED', Chip: 'Exynos 1580', RAM: '8GB', Pin: '5000 mAh' }],
  ['Xiaomi 15 Ultra 512GB', 'Xiaomi', 29990000, 14990000, 500, 1, '#e6e6e6', { 'Màn hình': '6.73" AMOLED', Chip: 'Snapdragon 8 Elite', RAM: '16GB', Pin: '5410 mAh' }],
  ['Xiaomi 14T Pro 256GB', 'Xiaomi', 16990000, null, 300, 0, '#3c5a7a', { 'Màn hình': '6.67" AMOLED 144Hz', Chip: 'Dimensity 9300+', RAM: '12GB', Pin: '5000 mAh' }],
  ['Redmi Note 14 Pro 256GB', 'Xiaomi', 7990000, 6990000, 400, 0, '#8bc6a8', { 'Màn hình': '6.67" AMOLED', Chip: 'Dimensity 7300', RAM: '8GB', Pin: '5110 mAh' }],
  ['OPPO Find X8 Pro 512GB', 'OPPO', 26990000, null, 200, 0, '#d9d3c7', { 'Màn hình': '6.78" AMOLED', Chip: 'Dimensity 9400', RAM: '16GB', Pin: '5910 mAh' }],
  ['OPPO Reno13 5G 256GB', 'OPPO', 12990000, 9990000, 300, 1, '#a7c7e7', { 'Màn hình': '6.59" AMOLED', Chip: 'Dimensity 8350', RAM: '12GB', Pin: '5600 mAh' }],
  ['OPPO A79 5G 128GB', 'OPPO', 6490000, null, 400, 0, '#5b4b8a', { 'Màn hình': '6.72" LCD', Chip: 'Dimensity 6020', RAM: '8GB', Pin: '5000 mAh' }],
  ['vivo X200 Pro 512GB', 'vivo', 24990000, null, 200, 0, '#3d3d3d', { 'Màn hình': '6.78" AMOLED', Chip: 'Dimensity 9400', RAM: '16GB', Pin: '6000 mAh' }],
  ['vivo V40 5G 256GB', 'vivo', 12990000, 10490000, 300, 0, '#cfd8e8', { 'Màn hình': '6.78" AMOLED', Chip: 'Snapdragon 7 Gen 3', RAM: '12GB', Pin: '5500 mAh' }],
  ['realme 13 Pro+ 256GB', 'realme', 11990000, null, 300, 0, '#9cc9a0', { 'Màn hình': '6.7" AMOLED', Chip: 'Snapdragon 7s Gen 2', RAM: '12GB', Pin: '5200 mAh' }],
  ['Google Pixel 9 Pro 256GB', 'Google', 25990000, 19990000, 200, 0, '#e8dccb', { 'Màn hình': '6.3" OLED', Chip: 'Tensor G4', RAM: '16GB', Pin: '4700 mAh' }],
  ['Nothing Phone (3a) 256GB', 'Nothing', 9490000, null, 300, 0, '#f0f0f0', { 'Màn hình': '6.77" AMOLED', Chip: 'Snapdragon 7s Gen 3', RAM: '12GB', Pin: '5000 mAh' }],
  ['ASUS ROG Phone 9 512GB', 'ASUS', 27990000, null, 150, 0, '#1f1f2e', { 'Màn hình': '6.78" AMOLED 185Hz', Chip: 'Snapdragon 8 Elite', RAM: '16GB', Pin: '5800 mAh' }],
];

async function initDatabase(pool) {
  for (const sql of SCHEMA) await pool.query(sql);
  const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM products');
  if (n > 0) return false;
  for (const [name, brand, price, sale, stock, flash, color, specs] of PRODUCTS) {
    await pool.query(
      'INSERT INTO products (name, brand, price, sale_price, stock, flash_sale, color, specs, description) VALUES (?,?,?,?,?,?,?,?,?)',
      [name, brand, price, sale, stock, flash, color, JSON.stringify(specs),
       `${name} chính hãng, bảo hành 12 tháng, hỗ trợ trả góp 0%.`]
    );
  }
  return true;
}

// Khôi phục tồn kho về giá trị ban đầu (dùng trước mỗi lần demo flash sale)
async function resetStock(pool) {
  for (const [name, , , , stock] of PRODUCTS) {
    await pool.query('UPDATE products SET stock = ? WHERE name = ?', [stock, name]);
  }
}

module.exports = { initDatabase, resetStock };
