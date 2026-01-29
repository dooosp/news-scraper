# IMPLEMENTATION_PLAN: news-scraper Lite 리팩토링

> **Governance:** Standard Protocol (기존 프로젝트 리팩토링)
> **상태:** ✅ Phase 4 구현 완료 (0/1/2단계 전부 완료)
> **언어:** JavaScript (CommonJS) 유지, JSDoc 타입 힌트
> **이전 계획:** 뉴스 소스 확장 (완료됨 — 6개 소스 동작 중)

---

## 목표

기존 news-scraper의 **구조적 문제 8개 + 운영 리스크 5개**를 해결하되,
파일 수를 최소화한 "Lite 구조"로 리팩토링한다.

### 핵심 원칙
1. **단일 진입점** — 모든 실행 경로가 같은 파이프라인 사용
2. **표준 데이터 모델** — Article/Digest 스키마 통일
3. **템플릿 1벌** — 이메일 HTML 중복 제거
4. **중복 코드 제거** — fetch-news.js 구버전 삭제

---

## 현재 문제 → 해결 매핑

| # | 문제 | 해결 파일 | 단계 |
|---|------|----------|------|
| 1 | fetch-news.js/news-fetcher.js 코드 중복 | fetch-news.js 삭제, main.js로 통합 | 0 |
| 2 | email-scheduler.js가 analysis/global 무시 | templates.js 단일 템플릿 | 1 |
| 3 | HTML 이메일 템플릿 3벌 중복 | templates.js로 통합 | 1 |
| 4 | 하드코딩된 경로 (/home/taeho/) | main.js 상단 상수로 이동 | 0 |
| 5 | create-ppt.js 구버전 텍스트 (IT뉴스, 3소스) | templates.js에서 동적 생성 | 1 |
| 6 | server.js XSS 취약점 | services.js의 escapeHtml 유틸 | 2 |
| 7 | 네이버 EUC-KR 하드코딩 | sources/naver.js에서 charset 자동감지 | 2 |
| 8 | 이메일 내 localhost 링크 | main.js 상수 REFRESH_URL | 0 |
| A | 진입점 분산 | main.js 단일 진입점 | 0 |
| B | 소스 실패 시 전체 실패 | Promise.allSettled + 부분 실패 허용 | 2 |
| C | HTML escape 없음 | services.js escapeHtml 중앙화 | 2 |
| D | retry/backoff 없음 | services.js fetchWithRetry | 2 |

---

## 목표 디렉토리 구조

```
news-scraper/
├── src/
│   ├── sources/           # 소스별 수집기 (각각 독립)
│   │   ├── index.js       # 소스 목록 export
│   │   ├── naver.js
│   │   ├── google.js
│   │   ├── yonhap.js
│   │   ├── sisain.js
│   │   ├── bbc.js
│   │   └── cnn.js
│   ├── types.js           # JSDoc 타입 정의 (Article, Digest)
│   ├── services.js        # 유틸: escapeHtml, fetchWithRetry, sendEmail, saveResult
│   ├── templates.js       # HTML 이메일 + PPT + Markdown 렌더링
│   └── main.js            # 단일 파이프라인 (수집→중복제거→강화→저장→발송)
├── lib/
│   └── anti-echo-chamber/ # 기존 모듈 (변경 없음)
├── server.js              # Express 웹 서버 (main.js의 runDigest 호출)
├── trigger-server.js      # GitHub Actions 트리거 (변경 최소)
├── archive/               # 생성 파일 저장소
├── public/
│   └── index.html
├── package.json
└── .github/workflows/daily-news.yml
```

**새로 만드는 파일: 10개** (src/ 하위)
**삭제 파일: 4개** (fetch-news.js, email-scheduler.js, news-fetcher.js, create-ppt.js)
**수정 파일: 4개** (server.js, trigger-server.js, package.json, daily-news.yml)

---

## 표준 데이터 모델 (types.js)

```js
/**
 * @typedef {Object} Article
 * @property {string} title
 * @property {string} url
 * @property {string} summary        - 최대 200자
 * @property {string} source         - '네이버'|'구글뉴스'|'연합뉴스'|'시사IN'|'BBC'|'CNN' 등
 * @property {string} category       - 'domestic'|'analysis'|'global'
 * @property {Date|null} publishedAt
 */

/**
 * @typedef {Object} MergedArticle
 * @property {string} title
 * @property {string} summary
 * @property {string[]} sources
 * @property {{source: string, url: string}[]} links
 * @property {string} category       - 'domestic'|'analysis'|'global'
 * @property {boolean} isHot
 * @property {string|null} counterView  - anti-echo-chamber 반대 관점
 */

/**
 * @typedef {Object} Digest
 * @property {string} date           - ISO 문자열
 * @property {string} dateDisplay    - 한국어 날짜 (예: "2026년 1월 29일 목요일")
 * @property {MergedArticle[]} articles
 * @property {string[]} activeSources - 실제 수집 성공한 소스 목록
 * @property {{source: string, error: string}[]} failures - 실패한 소스
 */
```

---

## 단계별 구현 계획

### 0단계: 단일 진입점 + 표준 스키마

**작업 목록:**

1. `src/types.js` 생성 — JSDoc 타입 정의
2. `src/sources/` 생성 — 기존 news-fetcher.js의 6개 함수를 개별 파일로 분리
   - 각 소스는 `async function fetch()` → `Article[]` 반환
   - 기존 fallback 로직(연합→SBS, 시사IN→프레시안) 유지
3. `src/sources/index.js` — 소스 레지스트리
4. `src/main.js` 생성 — 단일 파이프라인
   - `runDigest({ sendMail, useLLM })` 함수
   - 중복 제거 로직(calculateSimilarity, mergeAndDeduplicate) 포함
5. `fetch-news.js` 삭제 (구버전 3소스 코드)
6. `package.json` scripts 수정

**검증:** `node src/main.js --no-mail` → 6개 소스 수집 + MD 저장 확인

---

### 1단계: 템플릿 통합 + 출력 정리

**작업 목록:**

1. `src/templates.js` 생성
   - `renderEmailHtml(digest)` — 이메일 HTML (HOT/국내/분석/글로벌 섹션)
   - `renderMarkdown(digest)` — MD 파일 생성
   - `renderPpt(digest, outputPath)` — PPT 생성 (create-ppt.js 로직 이동)
   - footer 소스 목록 = `digest.activeSources`에서 자동 생성
   - 이메일 내 새로고침 버튼 URL = 상수 REFRESH_URL
2. `src/services.js` 생성
   - `sendEmail(html, subject)` — nodemailer 발송
   - `saveResult(digest)` — JSON + MD + PPT 저장
3. 구파일 삭제: email-scheduler.js, news-fetcher.js, create-ppt.js, github-action-sender.js
4. `server.js` 수정 — `runDigest()` 호출로 변경
5. `.github/workflows/daily-news.yml` 수정 → `node src/main.js`
6. PPT 텍스트 동적 생성 (하드코딩 제거)

**검증:** `node src/main.js` → 이메일 발송 + PPT 생성 확인

---

### 2단계: 신뢰성 + 보안

**작업 목록:**

1. `src/services.js`에 추가:
   - `escapeHtml(str)` — HTML 특수문자 이스케이프
   - `fetchWithRetry(fn, { retries, backoff })` — 지수 백오프 재시도
2. `src/main.js` 수정:
   - `Promise.all` → `Promise.allSettled` — 부분 실패 허용
   - 실패 소스를 `digest.failures`에 기록
   - 전체 0건이면 경고 로그
3. `src/templates.js` 수정:
   - 모든 뉴스 제목/요약/반대관점 → `escapeHtml()` 적용
   - 실패 소스 있으면 이메일 하단에 경고 표시
4. `src/sources/naver.js`:
   - Content-Type charset 자동 감지 (EUC-KR/UTF-8)
5. `server.js` + `trigger-server.js`:
   - 에러 메시지 `escapeHtml()` 적용

**검증:**
- 특정 소스 URL 변조하여 부분 실패 테스트
- XSS 페이로드 포함 제목으로 방어 확인

---

## 삭제 대상 파일

| 파일 | 이유 | 대체 |
|------|------|------|
| `fetch-news.js` | 구버전 3소스 중복 | `src/main.js --no-mail` |
| `news-fetcher.js` | sources/ + main.js로 분리 | `src/sources/` + `src/main.js` |
| `email-scheduler.js` | 템플릿 중복 + 구버전 | `src/main.js` + `src/templates.js` |
| `github-action-sender.js` | 템플릿 중복 | `src/main.js` |
| `create-ppt.js` | templates.js로 이동 | `src/templates.js` |

---

## 유지 파일 (변경 최소)

| 파일 | 변경 내용 |
|------|----------|
| `server.js` | `runDigest()` 호출 + escapeHtml 적용 |
| `trigger-server.js` | escapeHtml 적용만 |
| `lib/anti-echo-chamber/` | 변경 없음 |
| `public/index.html` | 변경 없음 |

---

## package.json scripts (최종)

```json
{
  "scripts": {
    "start": "node trigger-server.js",
    "server": "node server.js",
    "fetch": "node src/main.js --no-mail",
    "send": "node src/main.js",
    "send:no-llm": "node src/main.js --no-llm"
  }
}
```

---

## GitHub Actions yml (최종)

```yaml
- name: Send news email
  env:
    GMAIL_USER: ${{ secrets.GMAIL_USER }}
    GMAIL_PASS: ${{ secrets.GMAIL_PASS }}
    GMAIL_RECIPIENT: ${{ secrets.GMAIL_RECIPIENT }}
    GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
  run: node src/main.js
```

---

## Phase 3: 자가 비판

| 우려 | 대응 |
|------|------|
| 구파일 삭제 시 GitHub Actions 깨짐 | 0단계에서 main.js 먼저 만들고 검증, 1단계 마지막에 yml + 구파일 동시 교체 |
| anti-echo-chamber 인터페이스 변경? | 없음. `generateBatch(articles)` + `templates.renderSection()` 그대로 |
| sources/ 분리가 과도? | 6소스 × 30~50줄 = 합치면 300줄+. 소스 추가/삭제 빈번하므로 분리 적합 |
| server.js / trigger-server.js 역할 중복? | 용도 다름(로컬 웹UI vs GitHub 트리거). 유지 |
| 리팩토링 중 매일 아침 이메일 중단? | 구파일 삭제는 1단계 마지막. 0단계에서는 기존 파일과 공존 |

---

## 구현 순서 (50줄 이하 단위)

### 0단계 (5커밋)
1. `src/types.js` 생성 (~20줄)
2. `src/sources/naver.js` + `google.js` + `yonhap.js` (각 ~40줄)
3. `src/sources/sisain.js` + `bbc.js` + `cnn.js` (각 ~35줄)
4. `src/sources/index.js` (~15줄)
5. `src/main.js` — 수집 + 중복제거 + 저장 (~50줄)

### 1단계 (4커밋)
6. `src/services.js` — sendEmail + saveResult (~50줄)
7. `src/templates.js` — renderEmailHtml (~50줄)
8. `src/templates.js` 추가 — renderMarkdown + renderPpt (~50줄)
9. 구파일 삭제 + server.js/yml 수정 + package.json 수정

### 2단계 (3커밋)
10. `src/services.js`에 escapeHtml + fetchWithRetry (~30줄)
11. `src/main.js` Promise.allSettled + naver.js charset 자동감지
12. templates.js + server.js + trigger-server.js에 escapeHtml 적용

---

## 승인 요청

위 설계대로 진행해도 될까요?

- [ ] 승인 (LGTM)
- [ ] 수정 요청
