console.log('🚀 開始執行 testData.js 測試...');

const { getOrderDetails } = require('./services/mockErpService');
const { retrieveRelevantPolicy } = require('./services/ragService');

console.log('=== 🧪 1. 測試 Mock ERP 調取 ORD-10234 ===');
const orderInfo = getOrderDetails('ORD-10234');
console.log(JSON.stringify(orderInfo, null, 2));

console.log('\n=== 🧪 2. 測試 Simple RAG 政策檢索 (Delivery Issue) ===');
const policy = retrieveRelevantPolicy('Delivery Issue');
console.log(policy);