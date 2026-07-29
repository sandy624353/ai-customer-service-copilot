const fs = require('fs');
const path = require('path'); // 1. 引入 path 模組

// 2. 使用 path.join 與 __dirname 定位絕對路徑
const ordersPath = path.join(__dirname, '../data/orders.json');
const shippingPath = path.join(__dirname, '../data/shipping.json');

const getOrderDetails = (orderId) => {
  try {
    const orders = JSON.parse(fs.readFileSync(ordersPath, 'utf-8'));
    const shipping = JSON.parse(fs.readFileSync(shippingPath, 'utf-8'));

    const order = orders.find((o) => o.order_id === orderId) || null;
    const ship = shipping.find((s) => s.order_id === orderId) || null;

    return { order, shipping: ship };
  } catch (err) {
    console.error('❌ [ERP Error] 讀取訂單或物流 JSON 失敗:', err.message);
    return null;
  }
};

module.exports = { getOrderDetails };