const gemini = require('./providers/gemini');
const { selectForAnalysis } = require('./news-filter');

const SYSTEM_PROMPT = `당신은 비판적 사고를 돕는 분석가입니다.
주어진 뉴스에 대해 반대 관점을 제시해주세요.

규칙:
1. 뉴스의 핵심 주장을 한 문장으로 파악
2. 해당 주장에 대한 합리적인 반론 2개 제시
3. 대안적 관점 또는 누락된 맥락 1개 제시
4. 감정적이지 않고 논리적으로 분석
5. "틀렸다"가 아니라 "다른 관점도 있다"는 톤 유지
6. 한국어로 응답

반드시 아래 JSON 형식으로만 응답:
{
  "originalClaim": "핵심 주장 한 문장",
  "counterArguments": [
    {"point": "반론1 제목", "explanation": "설명 1-2문장"},
    {"point": "반론2 제목", "explanation": "설명 1-2문장"}
  ],
  "alternativeViewpoint": "대안적 관점 1-2문장"
}`;

async function generateCounterPerspective(newsItem) {
  const userPrompt = `뉴스 제목: ${newsItem.title}
요약: ${newsItem.summary || '(요약 없음)'}

위 뉴스에 대한 반대 관점을 분석해주세요.`;

  try {
    const result = await gemini.analyze(`${SYSTEM_PROMPT}\n\n${userPrompt}`);

    return {
      originalTitle: newsItem.title,
      originalClaim: result.originalClaim || '',
      counterArguments: result.counterArguments || [],
      alternativeViewpoint: result.alternativeViewpoint || '',
      isHot: newsItem.isHot || false,
      success: true
    };
  } catch (error) {
    console.error(`분석 실패: ${newsItem.title}`, error.message);
    return { originalTitle: newsItem.title, success: false, error: error.message };
  }
}

async function generateBatch(newsArray, options = {}) {
  const maxItems = options.maxItems || 3;
  const selected = selectForAnalysis(newsArray, maxItems);

  if (selected.length === 0) {
    return [];
  }

  // 병렬 처리
  const results = await Promise.all(
    selected.map(news => generateCounterPerspective(news))
  );

  // 성공한 것만 반환
  return results.filter(r => r.success);
}

module.exports = { generateCounterPerspective, generateBatch };
