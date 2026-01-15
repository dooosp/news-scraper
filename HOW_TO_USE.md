# 🚀 뉴스 스크래퍼 사용 설명서

## 웹 인터페이스로 사용하기 (추천!)

### 1. 서버 시작

```bash
cd ~/news-scraper
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
node server.js
```

### 2. 브라우저 접속

웹 브라우저를 열고 다음 주소로 접속:

```
http://localhost:3000
```

### 3. 리셋 버튼 클릭

- 페이지에 표시된 **"🔄 뉴스 새로고침 & PPT 생성"** 버튼을 클릭
- 자동으로 최신 IT 뉴스 5개를 수집
- Markdown 파일과 PPT 파일이 자동 생성
- 화면에 뉴스 헤드라인 표시
- 다운로드 버튼으로 파일 다운로드 가능

### 4. 원하는 만큼 반복

- 리셋 버튼을 누를 때마다 새로운 뉴스 수집
- 같은 날짜에 여러 번 클릭하면 최신 뉴스로 업데이트
- 날짜가 바뀌면 자동으로 새로운 파일 생성

### 5. 서버 종료

터미널에서 `Ctrl + C`를 누르면 서버 종료

---

## CLI로 사용하기

웹 인터페이스 없이 명령줄에서 직접 실행:

```bash
cd ~/news-scraper
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
node fetch-news.js
```

---

## 생성되는 파일

### 저장 위치
```
news-scraper/
└── archive/
    ├── news_2026-01-13.md              # 날짜별 뉴스 (Markdown)
    └── IT_News_Report_2026-01-13.pptx  # 날짜별 PPT
```

추가로:
- `~/today_news.md` - 항상 최신 뉴스

---

## 웹 인터페이스 기능

### 📊 실시간 통계
- 수집된 뉴스 개수 표시
- 생성된 파일 타입 표시

### 📰 뉴스 표시
- 각 뉴스의 제목, 요약, 링크 표시
- 뉴스 기사로 바로 이동 가능

### 📥 파일 다운로드
- Markdown 파일 다운로드
- PowerPoint 파일 다운로드
- 원클릭 다운로드

### 🎨 깔끔한 디자인
- 반응형 디자인 (모바일 지원)
- 부드러운 애니메이션
- 직관적인 인터페이스

---

## 자주 묻는 질문

### Q: 서버를 항상 실행시켜야 하나요?
A: 아니요. 필요할 때만 실행하고 종료하면 됩니다.

### Q: 하루에 여러 번 실행하면 어떻게 되나요?
A: 같은 날짜의 파일이 최신 뉴스로 업데이트됩니다.

### Q: 다른 포트를 사용하고 싶어요
A: `server.js` 파일에서 `PORT = 3000`을 원하는 포트로 변경하세요.

### Q: 외부에서 접속 가능한가요?
A: 현재는 localhost만 지원합니다. 외부 접속을 위해서는 별도 설정이 필요합니다.

---

## 백그라운드 실행 (선택)

서버를 백그라운드에서 계속 실행하고 싶다면:

```bash
cd ~/news-scraper
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nohup node server.js > server.log 2>&1 &
```

백그라운드 서버 종료:
```bash
pkill -f "node server.js"
```

---

## 문제 해결

### 포트가 이미 사용 중이라는 오류
```bash
# 3000번 포트를 사용하는 프로세스 찾기
lsof -i :3000

# 해당 프로세스 종료
kill -9 [프로세스ID]
```

### Node.js를 찾을 수 없음
```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

### 뉴스가 수집되지 않음
네이버 뉴스 웹사이트 구조가 변경되었을 수 있습니다.
`news-fetcher.js` 파일의 선택자를 업데이트해야 할 수 있습니다.

---

**💡 Tip:** 웹 브라우저를 북마크에 추가해두면 편리합니다!
