---
date: 2026-01-31
tags: [#news-scraper, #review-tester, #quality-improvement, #scoring]
project: news-scraper
---

## 해결 문제 (Context)
- review-tester 리뷰 결과(종합 5.5/10) 기반으로 news-scraper 5가지 품질 개선

## 최종 핵심 로직 (Solution)

### 1. 시사IN 링크 검증 (`src/sources/sisain.js`)
```javascript
// HEAD 요청으로 404 링크 자동 제외 (타임아웃 3초)
async function filterValidLinks(articles, label) {
    const results = await Promise.allSettled(
        articles.map(a =>
            axios.head(a.url, { timeout: 3000, maxRedirects: 3 })
                .then(() => a).catch(() => null)
        )
    );
    return results.map(r => r.status === 'fulfilled' ? r.value : null).filter(Boolean);
}
```

### 2. 기사 수 제한 + 스코어링 (`src/main.js`)
```javascript
const MAX_TOTAL = 15;
const CATEGORY_MIN = { domestic: 4, analysis: 2, global: 5 };

function scoreArticle(article) {
    let score = 0;
    if (article.isHot) score += 3;           // 복수 매체 보도
    if (article.category === 'analysis') score += 1;  // 심층 분석
    if (article.summary?.length > 30) score += 1;     // 요약 존재
    score += Math.min(article.sources.length - 1, 2); // 출처 수
    return score;
}
// 카테고리별 최소 보장 후 점수순 충원 → 상위 15개 선별
```

### 3. 요약 품질 개선
- **네이버** (`src/sources/naver.js`): og:description 메타태그 병렬 추출
- **전체 RSS** (7개 소스): `substring(0,200)` → `truncateSentence()` 문장 단위 절단
- 공용 함수 `truncateSentence()` → `src/utils.js`에 추가

### 4. 출처 표기 통일 (`src/utils.js`)
```javascript
const SOURCE_DISPLAY = { 'AP': 'AP통신', '네이버': '네이버뉴스', ... };
function formatSources(sources) { return sources.map(normalizeSource).join(' · '); }
```
- 이메일(`templates.js`) + 마크다운(`main.js`) 동일 포맷 적용

## 수정 파일 목록 (11개)

| 파일 | 변경 내용 |
|------|-----------|
| `src/main.js` | MAX_TOTAL, 스코어링, selectTopArticles, formatSources 적용 |
| `src/utils.js` | truncateSentence, normalizeSource, formatSources 추가 |
| `src/templates.js` | formatSources 적용 |
| `src/sources/sisain.js` | filterValidLinks 추가, truncateSentence 적용 |
| `src/sources/naver.js` | og:description 추출, truncateSentence 추가 |
| `src/sources/google.js` | truncateSentence 적용 |
| `src/sources/yonhap.js` | truncateSentence 적용 |
| `src/sources/bbc.js` | truncateSentence 적용 |
| `src/sources/cnn.js` | truncateSentence 적용 |
| `src/sources/guardian.js` | truncateSentence 적용 |
| `src/sources/ap.js` | truncateSentence 적용 |

## 핵심 통찰 (Learning & Decision)
- **Problem:** 46개 기사 무차별 전달 → 사용자 피로, 시사IN 링크 전부 404
- **Decision:** 스코어링 기반 선별(15개) + 카테고리 최소 보장으로 다양성 유지. 링크 검증은 HEAD 요청 3초 제한으로 수집 시간 영향 최소화
- **Finding:** 시사IN RSS 피드는 살아있으나 기사 URL이 전부 404 상태 (도메인 변경 추정)
- **Next Step:** 시사IN RSS URL 변경 또는 링크 0개 시 프레시안 폴백 자동 발동 검토
