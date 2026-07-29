const llm = require('../config/groq');
const { getOrderDetails } = require('../services/mockErpService');
const { retrieveRelevantPolicy } = require('../services/ragService');

// 帶有 Timeout 限制的 LLM 呼叫 (6 秒)
const invokeLLMWithTimeout = async (prompt, fallbackText, timeoutMs = 6000) => {
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('LLM Response Timeout')), timeoutMs)
    );
    const response = await Promise.race([llm.invoke(prompt), timeoutPromise]);
    return response.content;
  } catch (err) {
    console.warn(`⚠️ [LLM Warning] 呼叫異常或逾時 (${err.message})，使用預設回應。`);
    return fallbackText;
  }
};

// Node 1: 意圖分類 (LLM 語意雙重確認，避免誤剔商品問句)
const classifyIntentNode = async (state) => {
  console.log('👉 [Exec] 開始執行 Node 1...');
  const { customerQuestion } = state;

  // 1. 第一階段：快速過濾無關閒聊或天氣
  const pureChitChat = ['天氣', '星期幾', '幾點', '你是誰', '講個笑話', '好餓', '早安'];
  if (pureChitChat.some((kw) => customerQuestion.includes(kw))) {
    console.log('⚠️ [Node 1] 偵測到純閒聊，直接觸發 Out of Scope');
    return {
      issueType: 'Out of Scope',
      isOutOfScope: true,
      statusLogs: ['🔍 問題分類完成：Out of Scope (非業務範疇)'],
    };
  }

  // 2. 第二階段：透過 LLM 進行雙重語意確認
  const prompt = `你是一個電商客服系統的安全護欄分類器 (Guardrail Classifier)。
請分析客戶問題並分類：
1. Order Status (查詢訂單狀態、送達時間)
2. Delivery Issue (包裹延誤、物流卡住、未收到)
3. Order Modification (修改地址、修改訂單)
4. Cancellation (取消訂單、可以取消嗎)
5. Return / Refund (退貨、退款、鑑賞期、商品瑕疵/損壞)
6. Out of Scope (僅限：純聊天、天氣、幾點、程式教學、法律問題)

判斷原則：
- 只要提及具體商品名詞（如：電視、螢幕、耳機、東西）且表達購買、品質、出貨或退換問題，絕對屬於 1-5 類，isOutOfScope 必須設為 false！

客戶問題：${customerQuestion}

請嚴格僅輸出標準 JSON 格式：
{"issueType": "Cancellation", "isOutOfScope": false}`;

  // 本地備援判定
  let fallbackType = 'Delivery Issue';
  let fallbackScope = false;

  if (customerQuestion.includes('取消')) fallbackType = 'Cancellation';
  else if (customerQuestion.includes('退') || customerQuestion.includes('鑑賞期')) fallbackType = 'Return / Refund';
  else if (customerQuestion.includes('改')) fallbackType = 'Order Modification';

  const defaultResult = JSON.stringify({ issueType: fallbackType, isOutOfScope: fallbackScope });
  const responseText = await invokeLLMWithTimeout(prompt, defaultResult, 6000);

  try {
    const jsonMatch = responseText ? responseText.match(/\{[\s\S]*\}/) : null;
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      const isOut = result.issueType === 'Out of Scope' || Boolean(result.isOutOfScope);
      return {
        issueType: isOut ? 'Out of Scope' : (result.issueType || fallbackType),
        isOutOfScope: isOut,
        statusLogs: [`🔍 問題分類完成：${isOut ? 'Out of Scope' : (result.issueType || fallbackType)}`],
      };
    }
    throw new Error('JSON 解析失敗');
  } catch (error) {
    return {
      issueType: fallbackType,
      isOutOfScope: fallbackScope,
      statusLogs: [`🔍 問題分類完成：${fallbackType}`],
    };
  }
};

// Node 2: 資料與政策檢索 (Out of Scope 時完全跳過調調取)
const retrieveDataAndPolicyNode = async (state) => {
  console.log('👉 [Exec] 開始執行 Node 2...');
  const { orderId, issueType, isOutOfScope } = state;

  if (isOutOfScope) {
    console.log('⏭️ [Node 2] 超出業務範疇，跳過所有 ERP 與物流明細調取');
    return {
      orderData: null,
      relevantPolicy: '',
      statusLogs: ['⏭️ 超出業務範疇問題，跳過 ERP 與政策檔案調取'],
    };
  }

  const orderData = orderId ? getOrderDetails(orderId) : null;
  const relevantPolicy = retrieveRelevantPolicy(issueType);

  console.log('✅ [Exec] Node 2 資料檢索完成');
  return {
    orderData,
    relevantPolicy,
    statusLogs: [
      `📡 資料調取完成：${orderData ? '成功取得訂單與物流明細' : '未找到訂單明細'}，政策檢索完成`,
    ],
  };
};

// Node 3: 綜合交叉分析 (Out of Scope 專屬診斷報告)
const analyzeContextNode = async (state) => {
  console.log('👉 [Exec] 開始執行 Node 3...');
  const { customerQuestion, orderData, relevantPolicy, isOutOfScope, issueType } = state;

  if (isOutOfScope) {
    return {
      analysis: '⚠️ 診斷報告：此詢問不屬於訂單、物流或退換貨相關業務範疇（例如：一般閒聊、非電商業務問題）。\n系統已自動標記為 Out of Scope，建議轉由專人客服介入處理或提示客戶補充訂單相關問題。',
      statusLogs: ['🛑 超出業務範疇，標記人工審核需求'],
    };
  }

  const orderId = orderData?.order?.order_id || '該訂單';
  const orderStatus = orderData?.order?.status || 'Unknown';
  const isCancelEligible = Boolean(orderData?.order?.cancellation_eligible);
  const isReturnEligible = Boolean(orderData?.order?.return_eligible);

  const prompt = `你是客服營運分析師，請對照訂單資料與公司政策進行嚴密分析：

客戶問題：${customerQuestion}
問題分類：${issueType}
訂單狀態：${orderStatus}
取消資格 (cancellation_eligible)：${isCancelEligible}
退貨資格 (return_eligible)：${isReturnEligible}
物流備註：${orderData?.shipping?.notes || '無'}
公司政策：
${relevantPolicy}

請按以下邏輯生成診斷報告：
1. 訂單狀態與資格判定
2. 是否符合公司政策條款
3. 建議採取的處置動作 (若是取消申請且不可取消，必須明確指出『無法線上取消，建議收到後辦理退貨』)`;

  let defaultAnalysis = '';

  if (issueType === 'Cancellation') {
    if (isCancelEligible) {
      defaultAnalysis = `根據系統查詢：\n1. 訂單 ${orderId} 當前狀態為 ${orderStatus}。\n2. 取消資格核對：符合取消條件 (cancellation_eligible: true)，尚未進入出貨程序。\n3. 建議直接協助客戶執行訂單取消手續並辦理退款。`;
    } else {
      defaultAnalysis = `根據系統查詢：\n1. 訂單 ${orderId} 當前狀態為 ${orderStatus}（包裹已出貨/運送中）。\n2. 取消資格核對：不符合線上直接取消條件 (cancellation_eligible: false)。\n3. 建議告知客戶因包裹已發貨無法途中攔截，請客戶於收到商品後申請 7 天鑑賞期退貨程序。`;
    }
  } else if (issueType === 'Delivery Issue') {
    const delayDays = orderData?.shipping?.delay_days || 0;
    const notes = orderData?.shipping?.notes || '無特殊備註';
    defaultAnalysis = `根據系統查詢：\n1. 訂單 ${orderId} 物流狀態為 ${orderData?.shipping?.current_status || 'In Transit'}，包裹於 ${orderData?.shipping?.last_update_location || '轉運中心'} 延誤 ${delayDays} 天。\n2. 物流備註訊息：${notes}。\n3. 建議通報 Logistics 物流部門進行包裹追蹤。`;
  } else if (issueType === 'Return / Refund') {
    defaultAnalysis = `根據系統查詢：\n1. 訂單 ${orderId} 狀態為 Delivered (已送達)，具備退貨資格 (return_eligible: ${isReturnEligible})。\n2. 符合公司【7天鑑賞期政策】，商品保持全新未拆封即可申請免費退貨。\n3. 建議協助客戶辦理退貨流程。`;
  } else {
    defaultAnalysis = `根據系統查詢：\n1. 訂單 ${orderId} 狀態為 ${orderStatus}。\n2. 經核對政策條款，客戶申請符合相關規範。\n3. 建議協助客戶進行後續程序處理。`;
  }

  const analysis = await invokeLLMWithTimeout(prompt, defaultAnalysis, 6000);
  console.log('✅ [Exec] Node 3 完成');

  return {
    analysis,
    statusLogs: ['🤖 AI 完成訂單現況與政策比對分析'],
  };
};

// Node 4: 建議動作與草稿生成 (Out of Scope 專屬友善引導草稿)
const generateRecommendationNode = async (state) => {
  console.log('👉 [Exec] 開始執行 Node 4...');
  const { customerQuestion, analysis, isOutOfScope, issueType, orderData } = state;

  if (isOutOfScope) {
    return {
      recommendedDepartment: 'Human Review Needed',
      suggestedReply: '您好，我是 AI 訂單服務 Copilot。目前我主要協助處理訂單狀態查詢、包裹物流追蹤、取消訂單與退換貨申請。若您有其他非訂單相關的業務疑問，我們將為您轉接人工客服專員為您處理，謝謝！',
      statusLogs: ['📄 已生成 Out-of-Scope 友善引導草稿'],
    };
  }

  const orderId = orderData?.order?.order_id || '';
  const isCancelEligible = Boolean(orderData?.order?.cancellation_eligible);

  const prompt = `請根據分析結論產出回覆草稿：
分類：${issueType}
分析結論：${analysis}
客戶問題：${customerQuestion}

【強效約束規則】：
1. 你的輸出（包含 suggestedReply）必須 100% 使用「台灣繁體中文」，絕對禁止出現簡體字或大陸用語！
2. 草稿內容必須與分析結論 100% 一致！如果不可線上取消，絕對不能寫已成功取消！

請僅輸出標準 JSON 格式：
{
  "recommendedDepartment": "Logistics / Customer Operations / Warehouse",
  "suggestedReply": "寫給客戶的禮貌回覆草稿"
}`;

  let defaultDept = 'Customer Operations';
  let defaultReply = '';

  if (issueType === 'Cancellation') {
    if (isCancelEligible) {
      defaultDept = 'Customer Operations';
      defaultReply = `您好，感謝您聯繫我們。關於您的訂單 ${orderId} 取消申請，經查詢目前訂單尚未出貨，我們已成功為您辦理取消程序。若有刷卡付款，相應款項將於 3-5 個工作天內退回原付款帳戶，感謝您的理解。`;
    } else {
      defaultDept = 'Logistics / Customer Operations';
      defaultReply = `您好，感謝您聯繫我們！關於您的訂單 ${orderId} 取消申請，經查詢包裹目前已出貨運送中，因此無法直接為您攔截取消。建議您可以在收到包裹後，保持商品全新未拆封，聯絡我們辦理 7 天鑑賞期免費退貨流程，造成不便敬請見諒！`;
    }
  } else if (issueType === 'Delivery Issue') {
    defaultDept = 'Logistics';
    const notes = orderData?.shipping?.notes || '';
    defaultReply = `您好，非常抱歉讓您久等！關於您的訂單 ${orderId} 包裹運送狀況，系統顯示目前運送有所延誤${notes ? `（備註：${notes}）` : ''}。我們已緊急通報 Logistics 物流部門進行人工包裹追蹤與排查，有最新進展將第一時間通知您！`;
  } else if (issueType === 'Return / Refund') {
    defaultDept = 'Warehouse / Returns';
    defaultReply = `您好，感謝您的聯繫！關於訂單 ${orderId} 之退貨申請，本公司提供 7 天鑑賞期內免費退貨服務。請確保商品保持全新未拆封，我們將安排物流到府收件，倉庫審驗無誤後將完成退款。`;
  } else {
    defaultReply = `您好，感謝您的聯繫，我們已收到您的申請並為您處理中。`;
  }

  const defaultJson = JSON.stringify({
    recommendedDepartment: defaultDept,
    suggestedReply: defaultReply,
  });

  const responseText = await invokeLLMWithTimeout(prompt, defaultJson, 6000);
  console.log('✅ [Exec] Node 4 完成');

  let dept = defaultDept;
  let reply = defaultReply;

  try {
    const jsonMatch = responseText ? responseText.match(/\{[\s\S]*\}/) : null;
    if (jsonMatch) {
      const res = JSON.parse(jsonMatch[0]);
      dept = res.recommendedDepartment || dept;
      reply = res.suggestedReply || reply;
    }
  } catch (e) {
    dept = defaultDept;
    reply = defaultReply;
  }

  return {
    recommendedDepartment: dept,
    suggestedReply: reply,
    statusLogs: ['✨ 完成建議部門指派與繁體中文回覆草稿生成'],
  };
};

module.exports = {
  classifyIntentNode,
  retrieveDataAndPolicyNode,
  analyzeContextNode,
  generateRecommendationNode,
};