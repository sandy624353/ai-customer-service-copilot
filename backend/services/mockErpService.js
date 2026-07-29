const fs = require('fs');
const path = require('path');

// 讀取 JSON 的輔助函式
const readJsonFile = (filename) => {
  const filePath = path.join(__dirname, '../data', filename);
  const rawData = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(rawData);
};

// 根據 Order ID 調取整合訂單資料 (Join Order + Shipping + Customer)
const getOrderDetails = (orderId) => {
  const orders = readJsonFile('orders.json');
  const shippings = readJsonFile('shipping.json');
  const customers = readJsonFile('customers.json');

  const order = orders.find((o) => o.order_id === orderId);
  if (!order) return null;

  const shipping = shippings.find((s) => s.order_id === orderId) || {};
  const customer = customers.find((c) => c.customer_id === order.customer_id) || {};

  return {
    order,
    shipping,
    customer
  };
};

module.exports = {
  getOrderDetails
};