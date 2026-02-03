---
date: 2026-01-29
tags: [#refactoring, #architecture, #security, #news-scraper]
project: news-scraper
---

## 해결 문제 (Context)
- news-scraper의 구조적 문제 12개(코드 중복, 진입점 분산, 템플릿 3벌, XSS, 하드코딩 등)를 Lite 구조로 리팩토링

## 최종 핵심 로직 (Solution)

### 리팩토링 전후 구조
```
Before (7개 JS 파일, 역할 중복)          After (src/ 아래 정리)
─────────────────────────────           ──────────────────────
fetch-news.js (3소스, 구버전)     →     삭제
news-fetcher.js (6소스)           →     src/sources/ (소스별 분리)
email-scheduler.js (템플릿A)      →     삭제
github-action-sender.js (템플릿B) →     삭제
create-ppt.js                    →     삭제 (templates.js로 이동)
server.js                        →     server.js (runDigest 호출)
                                        src/main.js (단일 파이프라인)
                                        src/templates.js (HTML+PPT 1벌)
                                        src/services.js (이메일+저장)
                                        src/utils.js (escapeHtml 등)
                                        src/types.js (JSDoc 스키마)
```

### 표준 데이터 모델
```
Article → MergedArticle → Digest
(소스별)   (중복제거 후)    (최종 출력)
```

### 단일 진입점
```bash
node src/main.js              # 전체 (수집+LLM+이메일)
node src/main.js --no-mail    # 수집만
node src/main.js --no-llm     # LLM 없이 이메일
```

### 소스 추가 = 파일 1개 + index.js에 1줄
```js
// src/sources/index.js — 여기만 수정
const sources = [naver, google, yonhap, sisain, bbc, cnn, guardian, ap];
```

## 핵심 통찰 (Learning & Decision)

- **Problem 1:** fetch-news.js(3소스)와 news-fetcher.js(6소스)가 공존하여 실행 경로에 따라 결과가 달라짐
- **Decision:** 단일 파이프라인(main.js) + sources/ 분리. 진입점을 하나로 강제
- **Problem 2:** 이메일 HTML 템플릿이 3벌이라 기능 추가 시 3곳 동시 수정 필요
- **Decision:** templates.js 1벌로 통합. footer 소스 목록도 activeSources에서 자동 생성
- **Problem 3:** `templates.js → services.js → templates.js` 순환 의존성 발생
- **Decision:** escapeHtml/fetchWithRetry를 utils.js로 분리하여 순환 제거
- **Problem 4:** anti-echo-chamber가 `originalTitle` 필드를 반환하는데 `title`로 매칭해서 반대 관점이 이메일에 안 나옴
- **Decision:** `p.title` → `p.originalTitle`로 수정

## 커밋 이력

| 커밋 | 내용 |
|------|------|
| `412579f` | refactor: Lite 구조 리팩토링 (22파일, +1032/-1705) |
| `6383a49` | fix: 반대 관점 매칭 필드명 수정 |
| `7bf12f1` | feat: Guardian, AP News 소스 추가 (8개 소스) |

## 최종 소스 현황

| 카테고리 | 소스 | 수집 수 |
|---------|------|--------|
| 국내 | 네이버, 구글뉴스, 연합뉴스 | 21개 |
| 분석 | 시사IN | 5개 |
| 글로벌 | BBC, CNN, Guardian, AP | 20개 |
| **합계** | **8개 소스** | **최대 46개** |

## Next Step
- Promise.allSettled 적용 완료 — 부분 실패 시에도 나머지 소스로 이메일 발송
- fetchWithRetry 유틸은 준비됨, 소스별 적용은 미적용 상태
- 뉴스 영문 기사 한국어 요약 기능 검토 가능
