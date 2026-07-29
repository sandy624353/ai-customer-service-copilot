<template>
  <div class="app-container">
    <header class="navbar">
      <div class="brand">
        <h1>Customer Service System</h1>
      </div>
      <div class="user-info">CSR Working Console | Logged in as Agent #802</div>
    </header>

    <main class="main-content">
      <section class="left-panel">
        <div class="card">
          <h2>📩 客戶來信 / Ticket 處理</h2>
          <div class="form-group">
            <label>訂單編號 (Order ID)</label>
            <input v-model="orderId" placeholder="例如: ORD-10234" />
          </div>
          <div class="form-group">
            <label>客戶問題內容 (Customer Question)</label>
            <textarea
              v-model="customerQuestion"
              rows="4"
              placeholder="請輸入客戶詢問的問題..."
            ></textarea>
          </div>
          <button
            class="primary-btn"
            :disabled="isProcessing"
            @click="startProcess"
          >
            {{ isProcessing ? '🤖 AI 分析處理中...' : ' AI 分析' }}
          </button>
        </div>

        <div class="card progress-card" v-if="statusLogs.length > 0">
          <h3>⚙️ AI 工作流即時狀態 (SSE Stream)</h3>
          <ul class="logs-list">
            <li v-for="(log, idx) in statusLogs" :key="idx" class="log-item">
              {{ log }}
            </li>
          </ul>
        </div>
      </section>

      <section class="right-panel">
        <div v-if="!resultData" class="empty-state card">
          <p>👈 請在左側輸入 Ticket 內容並啟動AI分析</p>
        </div>

        <div v-else class="results-wrapper">
          <div v-if="resultData.isOutOfScope" class="alert-banner warning">
            ⚠️ 警示：此問題屬於 Out of Scope / 人工接管需求，AI 僅提供基礎範本。
          </div>

          <div class="card erp-card" v-if="resultData.orderData">
            <h3>📦 關聯訂單與客戶資訊 (Mock ERP)</h3>
            <div class="erp-grid">
              <div><strong>客戶姓名：</strong> {{ resultData.orderData.customer?.name }} ({{ resultData.orderData.customer?.membership_tier }})</div>
              <div><strong>訂單狀態：</strong> <span class="status-tag">{{ resultData.orderData.order?.status }}</span></div>
              <div><strong>預計送達：</strong> {{ resultData.orderData.order?.expected_delivery }}</div>
              <div><strong>物流運送：</strong> {{ resultData.orderData.shipping?.carrier }} (延誤 {{ resultData.orderData.shipping?.delay_days }} 天)</div>
            </div>
          </div>

          <div class="card analysis-card">
            <h3>🧠 AI 診斷與政策比對報告</h3>
            <div class="badge-row">
              <span class="tag">問題類型: {{ resultData.issueType }}</span>
              <span class="tag department">建議轉交: {{ resultData.recommendedDepartment }}</span>
            </div>
            <pre class="analysis-text">{{ resultData.analysis }}</pre>
          </div>

          <div class="card reply-card">
            <div class="card-header">
              <h3>✍️ 建議回覆草稿</h3>
              <span class="hint">CSR 可直接修改內容後送出</span>
            </div>
            <textarea
              v-model="editableReply"
              rows="6"
              class="reply-editor"
            ></textarea>
            <div class="action-buttons">
              <button class="secondary-btn" @click="resetReply">重置草稿</button>
              <button class="success-btn" @click="sendFinalReply">
                ✅ 核準並發送回覆 (Send Reply)
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue';

// 表單狀態
const orderId = ref('ORD-10234');
const customerQuestion = ref('我的訂單 ORD-10234 超過預計送達時間三天了，為什麼還沒收到？');
const isProcessing = ref(false);

// 串流與結果狀態
const statusLogs = ref([]);
const resultData = ref(null);
const editableReply = ref('');

// 啟動 分析 流程 (讀取 SSE 串流)
const startProcess = async () => {
  if (!customerQuestion.value) return alert('請輸入客戶問題！');

  isProcessing.value = true;
  statusLogs.value = [];
  resultData.value = null;

  try {
    const response = await fetch('https://ai-customer-service-copilot.onrender.com/api/copilot/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerQuestion: customerQuestion.value,
        orderId: orderId.value,
      }),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop(); // 保留未完成的 chunk

      for (const block of lines) {
        if (!block.trim()) continue;

        const eventMatch = block.match(/event: (.*)/);
        const dataMatch = block.match(/data: (.*)/);

        if (eventMatch && dataMatch) {
          const eventType = eventMatch[1].trim();
          const eventData = JSON.parse(dataMatch[1].trim());

          if (eventType === 'status') {
            statusLogs.value.push(eventData.message);
          } else if (eventType === 'result') {
            resultData.value = eventData.data;
            editableReply.value = eventData.data.suggestedReply;
          }
        }
      }
    }
  } catch (error) {
    console.error('SSE Error:', error);
    alert('呼叫 AI  發生錯誤，請確認後端 Server 是否啟動！');
  } finally {
    isProcessing.value = false;
  }
};

// 輔助功能
const resetReply = () => {
  if (resultData.value) editableReply.value = resultData.value.suggestedReply;
};

const sendFinalReply = () => {
  alert('🚀 [Human Action Confirmed] 回覆已成功審核並送出至客戶信箱！');
};
</script>

<style scoped>
.app-container { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f4f6f8; min-height: 100vh; color: #333; }
.navbar { background: #1e293b; color: white; padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; }
.brand { display: flex; align-items: center; gap: 0.75rem; color: #ffffff;}
.brand h1 { font-size: 1.25rem; margin: 0;color: inherit; }
.badge { background: #3b82f6; font-size: 0.75rem; padding: 0.2rem 0.5rem; border-radius: 4px; }
.user-info { font-size: 0.875rem; color: #94a3b8; }

.main-content { display: grid; grid-template-columns: 1fr 1.5fr; gap: 1.5rem; padding: 1.5rem; max-width: 1400px; margin: 0 auto; }
.card { background: white; border-radius: 8px; padding: 1.25rem; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 1rem; }
.card h2, .card h3 { margin-top: 0; font-size: 1.1rem; color: #1e293b; }

.form-group { margin-bottom: 1rem; display: flex; flex-direction: column; gap: 0.4rem; }
.form-group label { font-size: 0.875rem; font-weight: 600; color: #475569; }
input, textarea { padding: 0.6rem; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.95rem; }
input:focus, textarea:focus { outline: none; border-color: #3b82f6; }

.primary-btn { width: 100%; padding: 0.75rem; background: #2563eb; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
.primary-btn:hover { background: #1d4ed8; }
.primary-btn:disabled { background: #94a3b8; cursor: not-allowed; }

.logs-list { list-style: none; padding: 0; margin: 0; font-size: 0.875rem; }
.log-item { padding: 0.4rem 0; border-bottom: 1px solid #f1f5f9; color: #334155; }

.erp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; font-size: 0.9rem; background: #f8fafc; padding: 0.75rem; border-radius: 6px; }
.status-tag { background: #dbeafe; color: #1e40af; padding: 0.1rem 0.4rem; border-radius: 4px; font-weight: 600; }

.badge-row { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; }
.tag { background: #e2e8f0; font-size: 0.8rem; padding: 0.2rem 0.6rem; border-radius: 12px; font-weight: 600; }
.tag.department { background: #fef3c7; color: #92400e; }

.analysis-text { white-space: pre-wrap; font-family: inherit; background: #f8fafc; padding: 0.75rem; border-radius: 6px; font-size: 0.9rem; color: #334155; line-height: 1.5; }

.reply-editor { width: 100%; box-sizing: border-box; line-height: 1.5; font-family: inherit; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.hint { font-size: 0.75rem; color: #64748b; }
.action-buttons { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1rem; }

.secondary-btn { padding: 0.5rem 1rem; background: #e2e8f0; border: none; border-radius: 6px; cursor: pointer; }
.success-btn { padding: 0.5rem 1.25rem; background: #16a34a; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; }
.success-btn:hover { background: #15803d; }

.alert-banner { padding: 0.75rem; border-radius: 6px; margin-bottom: 1rem; font-weight: 600; font-size: 0.9rem; }
.alert-banner.warning { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
.empty-state { text-align: center; color: #64748b; padding: 4rem 2rem; }
</style>