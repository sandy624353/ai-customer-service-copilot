const fs = require('fs');
const path = require('path');

// 1. 設定 3 個 JSON 檔案的絕對路徑
const ordersPath = path.join(__dirname, '../data/orders.json');
const shippingPath = path.join(__dirname, '../data/shipping.json');
// 請確認你的檔案名稱是 customers.json 還是 customer.json，以下以 customers.json 為例：
const customersPath = path.join(__dirname, '../data/customers.json');

const getOrderDetails = (orderId) => {
  try {
    // 2. 讀取 orders, shipping, customers 資料
    const orders = JSON.parse(fs.readFileSync(ordersPath, 'utf-8'));
    const shipping = JSON.parse(fs.readFileSync(shippingPath, 'utf-8'));
    const customers = fs.existsSync(customersPath)
      ? JSON.parse(fs.readFileSync(customersPath, 'utf-8'))
      : [];

    // 3. 尋找對應的訂單與物流資料
    const order = orders.find((o) => o.order_id === orderId) || null;
    const ship = shipping.find((s) => s.order_id === orderId) || null;

    // 4. 透過 order 中的 customer_id 匹配客戶資料
    let customer = null;
    if (order && order.customer_id) {
      customer = customers.find((c) => c.customer_id === order.customer_id) || null;
    }

    // 5. 組合完整的資料回傳
    return {
      order,
      shipping: ship,
      customer
    };
  } catch (err) {
    console.error('❌ [ERP Error] 讀取資料失敗:', err.message);
    return null;
  }
};

module.exports = { getOrderDetails };