const express = require('express');
const router = express.Router();
const copilotWorkflow = require('../agent/workflow');

// SSE Endpoint: /api/copilot/process
router.post('/process', async (req, res) => {
  const { customerQuestion, orderId } = req.body;

  // 1. 設定 SSE 必要的 Response Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders && res.flushHeaders(); // 確保立即發送 Header

  // 封裝 SSE 資料推播函式
  const sendSSEvent = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    sendSSEvent('status', { message: '開始分析...' });

    // 2. 訂閱 LangGraph 的流式事件 (streamEvents)
    const initialInput = {
      customerQuestion,
      orderId: orderId || null,
    };

    // 使用 LangGraph 的 .stream() 方法，即時捕捉每個 Node 的狀態更新
    const eventStream = await copilotWorkflow.stream(initialInput, {
      streamMode: 'updates',
    });

    let finalState = {};

    for await (const update of eventStream) {
      const nodeName = Object.keys(update)[0];
      const nodeOutput = update[nodeName];

      // 將目前 Node 的產出合併至 finalState
      finalState = { ...finalState, ...nodeOutput };

      // 若該 Node 有 statusLogs，推播最後一條 log 給前端
      if (nodeOutput.statusLogs && nodeOutput.statusLogs.length > 0) {
        const latestLog = nodeOutput.statusLogs[nodeOutput.statusLogs.length - 1];
        sendSSEvent('status', { message: latestLog, node: nodeName });
      }
    }

    // 3. 工作流全數執行完畢，推播最終結果檔
    sendSSEvent('result', {
      success: true,
      data: {
        issueType: finalState.issueType,
        isOutOfScope: finalState.isOutOfScope,
        orderData: finalState.orderData,
        relevantPolicy: finalState.relevantPolicy,
        analysis: finalState.analysis,
        recommendedDepartment: finalState.recommendedDepartment,
        suggestedReply: finalState.suggestedReply,
      },
    });

    // 4. 結束 SSE 串流
    sendSSEvent('complete', { message: '流程順利完成！' });
    res.end();
  } catch (error) {
    console.error('SSE Workflow Error:', error);
    sendSSEvent('error', { message: '處理過程發生錯誤：' + error.message });
    res.end();
  }
});

module.exports = router;