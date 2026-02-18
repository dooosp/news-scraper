const gemini = require('./lib/providers/gemini');
const { generateBatch, generateCounterPerspective } = require('./lib/perspective-generator');
const { selectForAnalysis } = require('./lib/news-filter');
const templates = require('./templates/email-section');

// 초기화 함수
function initialize(apiKey) {
  const key = apiKey || process.env.GEMINI_API_KEY;
  gemini.initialize(key);
}

// 자동 초기화 (환경변수가 있으면)
if (process.env.GEMINI_API_KEY) {
  try {
    initialize();
  } catch {
    // 무시 - 나중에 수동 초기화 가능
  }
}

module.exports = {
  initialize,
  generateBatch,
  generateCounterPerspective,
  selectForAnalysis,
  templates
};
