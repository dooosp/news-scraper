/**
 * 뉴스 스크래퍼 표준 데이터 모델
 *
 * 모든 소스/파이프라인/출력이 이 타입을 기준으로 동작한다.
 */

/**
 * 소스별 수집 결과 (정규화 전)
 * @typedef {Object} Article
 * @property {string} title
 * @property {string} url
 * @property {string} summary        - 최대 200자
 * @property {string} source         - '네이버'|'구글뉴스'|'연합뉴스'|'시사IN'|'BBC'|'CNN' 등
 * @property {string} category       - 'domestic'|'analysis'|'global'
 * @property {Date|null} [publishedAt]
 */

/**
 * 중복 제거 + 병합 후 결과
 * @typedef {Object} MergedArticle
 * @property {string} title
 * @property {string} summary
 * @property {string[]} sources
 * @property {{source: string, url: string}[]} links
 * @property {string} category       - 'domestic'|'analysis'|'global'
 * @property {boolean} isHot         - 2개 이상 소스에서 보도
 * @property {string|null} counterView - anti-echo-chamber 반대 관점
 */

/**
 * 최종 다이제스트 (파이프라인 출력)
 * @typedef {Object} Digest
 * @property {string} date           - ISO 문자열
 * @property {string} dateDisplay    - 한국어 날짜 (예: "2026년 1월 29일 목요일")
 * @property {MergedArticle[]} articles
 * @property {string[]} activeSources - 수집 성공한 소스 목록
 * @property {{source: string, error: string}[]} failures
 */

module.exports = {};
