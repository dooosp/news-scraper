const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI = null;
let model = null;

function initialize(apiKey) {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY가 필요합니다');
  }
  genAI = new GoogleGenerativeAI(apiKey);
  model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
}

async function analyze(prompt, options = {}) {
  if (!model) {
    throw new Error('Gemini가 초기화되지 않았습니다. initialize()를 먼저 호출하세요.');
  }

  const timeout = options.timeout || 30000;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const result = await model.generateContent(prompt);
    clearTimeout(timeoutId);

    const response = result.response;
    const text = response.text();

    // JSON 추출 시도 (마크다운 코드블록 strip)
    const stripped = text.replace(/```(?:json)?\s*/g, '').replace(/```/g, '');
    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return { raw: text };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Gemini API 타임아웃');
    }
    throw error;
  }
}

module.exports = { initialize, analyze };
