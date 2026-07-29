const express = require('express');
const cors = require('cors');
require('dotenv').config();

const copilotRoutes = require('./routes/copilotRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// 中間件 Middleware
app.use(cors()); // 允許跨域請求 (提供給前端 Vue 3 連線)
app.use(express.json()); // 解析 JSON 請求體

// 註冊 Copilot 路由
app.use('/api/copilot', copilotRoutes);

// Health Check 測試 API
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'AI Copilot Backend Server running smoothly.' });
});

// 啟動 Server
app.listen(PORT, () => {
  console.log(`\n🚀 [Server Running] Express Server ready at http://localhost:${PORT}`);
  console.log(`📡 [SSE Endpoint] POST http://localhost:${PORT}/api/copilot/process`);
});