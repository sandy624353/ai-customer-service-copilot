const { classifyIntentNode, retrieveDataAndPolicyNode } = require('./agent/nodes');

async function test() {
  console.log('=== 🧪 測試 Node 1: Intent Classification ===');
  const state1 = { customerQuestion: '我的訂單 ORD-10234 超過預計送達時間三天了，為什麼還沒收到？' };
  const res1 = await classifyIntentNode(state1);
  console.log('Node 1 產出:', res1);

  console.log('\n=== 🧪 測試 Node 2: Data Retrieval ===');
  const state2 = { orderId: 'ORD-10234', issueType: res1.issueType, isOutOfScope: res1.isOutOfScope };
  const res2 = await retrieveDataAndPolicyNode(state2);
  console.log('Node 2 產出:', res2);
}

test();