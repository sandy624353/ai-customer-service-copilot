const { StateGraph, START, END } = require('@langchain/langgraph');
const CopilotState = require('./state');
const {
  classifyIntentNode,
  retrieveDataAndPolicyNode,
  analyzeContextNode,
  generateRecommendationNode,
} = require('./nodes');

// 1. 初始化 StateGraph，使用我們定義的 CopilotState
const builder = new StateGraph(CopilotState);

// 2. 加入工作流節點 (Nodes)
builder.addNode('classifyIntent', classifyIntentNode);
builder.addNode('retrieveDataAndPolicy', retrieveDataAndPolicyNode);
builder.addNode('analyzeContext', analyzeContextNode);
builder.addNode('generateRecommendation', generateRecommendationNode);

// 3. 定義邊與流程邏輯 (Edges)
// 起點 -> 意圖分類
builder.addEdge(START, 'classifyIntent');

// 意圖分類 -> 資料與政策調取
builder.addEdge('classifyIntent', 'retrieveDataAndPolicy');

// 資料與政策調取 -> 綜合交叉分析
builder.addEdge('retrieveDataAndPolicy', 'analyzeContext');

// 綜合交叉分析 -> 建議動作與草稿生成
builder.addEdge('analyzeContext', 'generateRecommendation');

// 建議動作與草稿生成 -> 終點
builder.addEdge('generateRecommendation', END);

// 4. 編譯為可執行的 Workflow Graph
const copilotWorkflow = builder.compile();

module.exports = copilotWorkflow;