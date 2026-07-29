const copilotWorkflow = require('./agent/workflow');

async function testFullWorkflow() {
  console.log('🚀 開始測試 LangGraph 完整 Copilot 工作流...\n');

  const initialInput = {
    customerQuestion: '我的訂單 ORD-10234 超過預計送達時間三天了，為什麼還沒收到？',
    orderId: 'ORD-10234',
  };

  // 執行工作流
  const finalState = await copilotWorkflow.invoke(initialInput);

  console.log('================ 📊 最終處理結果 ================');
  console.log('1. 問題分類:', finalState.issueType);
  console.log('2. 是否 Out of Scope:', finalState.isOutOfScope);
  console.log('3. 建議轉交部門:', finalState.recommendedDepartment);
  console.log('\n4. 步驟日誌 (Status Logs):\n', finalState.statusLogs.join('\n'));
  console.log('\n5. AI 分析結論:\n', finalState.analysis);
  console.log('\n6. 建議回覆草稿:\n', finalState.suggestedReply);
  console.log('=================================================');
}

testFullWorkflow();