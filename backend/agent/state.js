const { Annotation } = require('@langchain/langgraph');

// 定義 Copilot 在處理客戶問題時的共享狀態 (State Annotation)
const CopilotState = Annotation.Root({
  // 1. 輸入資訊
  customerQuestion: Annotation(), // 客戶原始問題
  orderId: Annotation(),          // 客戶提供的訂單單號 (如有)

  // 2. 分類與檢索結果 (Node 1 & Node 2 的產出)
  issueType: Annotation(),        // 分類結果 (e.g. Delivery Issue, Out of Scope)
  isOutOfScope: Annotation(),     // 是否超出處理範圍 (Boolean)
  orderData: Annotation(),        // 從 Mock ERP 撈出的訂單與物流明細
  relevantPolicy: Annotation(),   // 從 Knowledge Base 檢索出的公司政策條款

  // 3. AI 分析與建議 (Node 3 & Node 4 的產出)
  analysis: Annotation(),         // AI 綜合訂單與政策的分析結論
  recommendedDepartment: Annotation(), // 建議轉交部門 (e.g. Logistics, Operations)
  suggestedReply: Annotation(),   // AI 擬好的繁體中文建議回覆草稿
  statusLogs: Annotation({        // 用於 SSE 即時推播給前端的步驟紀錄
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
});

module.exports = CopilotState;