const fs = require('fs');
const path = require('path');

// 讀取政策 TXT 的輔助函式
const getPolicyContent = (policyFilename) => {
  try {
    const filePath = path.join(__dirname, '../knowledge', policyFilename);
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    return '未找到相關公司政策條款。';
  }
};

// 根據 Issue Type 進行簡單 RAG 檢索
const retrieveRelevantPolicy = (issueType) => {
  switch (issueType) {
    case 'Delivery Issue':
    case 'Order Status':
      return getPolicyContent('shipping_policy.txt');
    case 'Cancellation':
      return getPolicyContent('cancellation_policy.txt');
    case 'Return / Refund':
      return getPolicyContent('return_policy.txt') + '\n\n' + getPolicyContent('refund_policy.txt');
    case 'Order Modification':
      return getPolicyContent('shipping_policy.txt') + '\n\n' + getPolicyContent('cancellation_policy.txt');
    default:
      return '適用標準客戶服務流程。';
  }
};

module.exports = {
  retrieveRelevantPolicy
};