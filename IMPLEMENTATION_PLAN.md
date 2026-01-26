# IMPLEMENTATION_PLAN: 뉴스 소스 확장

## 📋 요구사항
1. **분석기사 소스 추가** - 깊이 있는 분석/오피니언 기사
2. **해외 핫뉴스 소스 추가** - 글로벌 주요 뉴스

---

## 🔍 Phase 1: 분석 (현재 상태)

### 현재 아키텍처
```
fetchNaverITNews()
    ├── fetchNaverNews()      → 7개 (인기순)
    ├── fetchGoogleNews()     → 7개 (알고리즘)
    └── fetchYonhapNews()     → 7개 (속보)

    → mergeAndDeduplicate()   → 중복 제거 + HOT 판별
    → 최종 출력
```

### 확장 포인트
- `Promise.all()`에 새 소스 추가 용이
- 각 소스는 독립적 함수로 분리됨
- RSS 파싱 인프라 이미 존재 (`rss-parser`)

---

## 🎯 Phase 2: 설계

### 추가할 소스

#### 1. 분석기사 소스
| 소스 | URL | 특징 |
|------|-----|------|
| **시사IN** | `https://www.sisain.co.kr/rss/allArticle.xml` | 심층 분석, 탐사보도 |
| **한겨레21** | `https://h21.hani.co.kr/rss/` | 주간지, 깊이 있는 기사 |
| **프레시안** | `https://www.pressian.com/rss/section/news` | 독립언론, 분석기사 |

→ **채택: 시사IN** (가장 안정적인 RSS, 분석기사 특화)

#### 2. 해외 핫뉴스 소스
| 소스 | URL | 특징 |
|------|-----|------|
| **BBC World** | `http://feeds.bbci.co.uk/news/world/rss.xml` | 글로벌 표준, 안정적 |
| **Reuters** | API 필요 또는 스크래핑 | 속보성 강함 |
| **The Guardian** | `https://www.theguardian.com/world/rss` | 유럽 시각 |
| **CNN** | `http://rss.cnn.com/rss/edition_world.rss` | 미국 시각 |

→ **채택: BBC World + CNN** (다양한 시각, 안정적 RSS)

---

### 새 함수 설계

```javascript
// 4. 분석기사 (시사IN)
async function fetchAnalysisNews() {
    // URL: https://www.sisain.co.kr/rss/allArticle.xml
    // 수집: 5개 (분석기사는 양보다 질)
    // 태그: '분석' 표시
}

// 5. BBC 월드뉴스
async function fetchBBCNews() {
    // URL: http://feeds.bbci.co.uk/news/world/rss.xml
    // 수집: 5개
    // 영문 제목 그대로 또는 간단 번역 표시
}

// 6. CNN 월드뉴스
async function fetchCNNNews() {
    // URL: http://rss.cnn.com/rss/edition_world.rss
    // 수집: 5개
    // 영문 제목 그대로 또는 간단 번역 표시
}
```

### 메인 함수 수정

```javascript
async function fetchNaverITNews() {
    const [
        naverNews,
        googleNews,
        yonhapNews,
        analysisNews,  // NEW
        bbcNews,       // NEW
        cnnNews        // NEW
    ] = await Promise.all([
        fetchNaverNews(),
        fetchGoogleNews(),
        fetchYonhapNews(),
        fetchAnalysisNews(),  // NEW
        fetchBBCNews(),       // NEW
        fetchCNNNews()        // NEW
    ]);

    // ... 병합 로직
}
```

### 이메일/출력 구조 변경

```
📰 오늘의 뉴스

🔥 HOT 뉴스 (2개 이상 소스)
─────────────────────────

🇰🇷 국내 주요 뉴스
─────────────────────────
(네이버, 구글, 연합뉴스)

📊 심층 분석 기사        ← NEW
─────────────────────────
(시사IN)

🌍 글로벌 핫뉴스         ← NEW
─────────────────────────
(BBC, CNN)
```

---

## ⚠️ Phase 3: 자가 비판

### 취약점 및 대응

| 취약점 | 위험도 | 대응 방안 |
|--------|--------|-----------|
| 해외 RSS 차단 가능성 | 중 | try-catch + 폴백 소스 |
| 영문 제목 가독성 | 중 | 원문 유지 + 🌍 이모지로 구분 |
| 총 뉴스 수 증가 (21→36개) | 저 | 이메일 섹션 분리로 해결 |
| 시사IN RSS 불안정 | 중 | 프레시안을 폴백으로 설정 |

### Edge Cases
1. 해외 뉴스와 국내 뉴스 중복 (같은 사건) → 유사도 검사에 포함
2. RSS 타임아웃 → 개별 소스 실패 시 빈 배열 반환 (현재 로직 유지)
3. 영문 특수문자 → 정규식에 영문 포함 (이미 대응됨)

---

## 📝 Phase 4: 구현 계획

### Step 1: 분석기사 함수 추가 (20줄)
- `fetchAnalysisNews()` 함수 작성
- 시사IN RSS 파싱
- 폴백: 프레시안

### Step 2: BBC 뉴스 함수 추가 (20줄)
- `fetchBBCNews()` 함수 작성
- BBC World RSS 파싱

### Step 3: CNN 뉴스 함수 추가 (20줄)
- `fetchCNNNews()` 함수 작성
- CNN World RSS 파싱

### Step 4: 메인 함수 수정 (10줄)
- `fetchNaverITNews()`에 새 소스 통합
- Promise.all 확장

### Step 5: 출력 포맷 개선 (30줄)
- 이메일 템플릿에 섹션 구분 추가
- "심층 분석", "글로벌 뉴스" 섹션

### Step 6: 테스트
- 각 소스별 독립 테스트
- 전체 통합 테스트
- 이메일 발송 테스트

---

## 📊 예상 결과

| 항목 | Before | After |
|------|--------|-------|
| 소스 수 | 3개 | 6개 |
| 최대 뉴스 | 21개 | 36개 |
| 분야 | 인기뉴스 위주 | 인기 + 분석 + 글로벌 |
| 이메일 구조 | 단일 리스트 | 섹션별 구분 |

---

## ✅ 승인 요청

위 설계대로 진행해도 될까요?

- [ ] 승인 (LGTM)
- [ ] 수정 요청
