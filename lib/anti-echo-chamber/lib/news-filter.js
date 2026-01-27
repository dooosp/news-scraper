/**
 * 분석할 뉴스 선별
 * HOT 뉴스 우선, 그 다음 국내 뉴스
 */
function selectForAnalysis(newsArray, maxCount = 3) {
  if (!newsArray || newsArray.length === 0) {
    return [];
  }

  // 1. HOT 뉴스 우선 선택
  const hotNews = newsArray.filter(news => news.isHot);

  // 2. 국내 뉴스 (HOT 아닌 것)
  const domesticNews = newsArray.filter(
    news => !news.isHot && news.category !== 'global'
  );

  // 3. 우선순위: HOT → 국내 → 나머지
  const prioritized = [...hotNews, ...domesticNews];

  // 4. 최대 개수만큼 선택
  const selected = prioritized.slice(0, maxCount);

  // 5. 분석에 필요한 필드만 추출
  return selected.map(news => ({
    title: news.title,
    summary: news.summary || '',
    sources: news.sources || [],
    category: news.category || 'domestic',
    isHot: news.isHot || false
  }));
}

module.exports = { selectForAnalysis };
