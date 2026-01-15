const express = require('express');
const path = require('path');
const { fetchNaverITNews, saveNewsAndCreatePPT } = require('./news-fetcher');

const app = express();
const PORT = 3000;

// 정적 파일 제공
app.use(express.static('public'));
app.use('/archive', express.static('archive'));

// 메인 페이지
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 이메일 발송 API (GET으로도 호출 가능하게)
app.get('/send-email', async (req, res) => {
    try {
        console.log('\n=== 이메일 발송 요청 ===');

        const { collectAndSend } = require('./email-scheduler');
        await collectAndSend();

        // 성공 페이지 반환
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>이메일 발송 완료</title>
                <style>
                    body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
                    .card { background: white; padding: 40px; border-radius: 15px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
                    h1 { color: #28a745; margin-bottom: 10px; }
                    p { color: #666; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h1>✅ 이메일 발송 완료!</h1>
                    <p>최신 뉴스가 Gmail로 발송되었습니다.</p>
                    <p style="margin-top: 20px; font-size: 14px; color: #999;">이 창을 닫아도 됩니다.</p>
                </div>
            </body>
            </html>
        `);
    } catch (error) {
        console.error('이메일 발송 실패:', error);
        res.status(500).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>발송 실패</title>
                <style>
                    body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f8d7da; }
                    .card { background: white; padding: 40px; border-radius: 15px; text-align: center; }
                    h1 { color: #dc3545; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h1>❌ 발송 실패</h1>
                    <p>${error.message}</p>
                </div>
            </body>
            </html>
        `);
    }
});

// 뉴스 수집 API
app.post('/fetch-news', async (req, res) => {
    try {
        console.log('\n=== 새로운 뉴스 수집 요청 ===');

        // 뉴스 수집
        const headlines = await fetchNaverITNews();

        // 파일 저장 및 PPT 생성
        const files = await saveNewsAndCreatePPT(headlines, __dirname);

        console.log('✅ 모든 작업이 완료되었습니다!\n');

        // 성공 응답
        res.json({
            success: true,
            message: '뉴스가 성공적으로 수집되었습니다!',
            headlines: headlines,
            files: files
        });

    } catch (error) {
        console.error('에러:', error);
        res.status(500).json({
            success: false,
            message: '뉴스 수집 중 오류가 발생했습니다: ' + error.message
        });
    }
});

// 서버 시작
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║     📰 뉴스 스크래퍼 웹 서버가 실행 중입니다!       ║
║                                                       ║
║     🌐 브라우저에서 다음 주소로 접속하세요:         ║
║                                                       ║
║        http://localhost:${PORT}                          ║
║                                                       ║
║     💡 리셋 버튼을 클릭하여 뉴스를 수집하세요       ║
║                                                       ║
║     종료하려면: Ctrl + C                             ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
    `);
});
