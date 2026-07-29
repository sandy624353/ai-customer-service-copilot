const { ChatGroq } = require('@langchain/groq');
require('dotenv').config();

// 初始化 Groq LLM Client
const llm = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: 'llama-3.3-70b-versatile',     // 新版標準欄位
  modelName: 'llama-3.3-70b-versatile', // 相容舊版欄位
  temperature: 0.2,                     // 低 temperature 減少隨機性，防止幻覺
});

module.exports = llm;