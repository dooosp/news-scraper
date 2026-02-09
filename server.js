const express = require('express');
const path = require('path');
const { runDigest } = require('./src/main');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use('/archive', express.static('archive'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/send-email', async (req, res) => {
    try {
        console.log('\n=== 이메일 발송 요청 ===');
        await runDigest({ sendMail: true, useLLM: true });

        res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>발송 완료</title>
<style>body{font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%)}.card{background:#fff;padding:40px;border-radius:15px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.2)}h1{color:#28a745}</style>
</head><body><div class="card"><h1>이메일 발송 완료!</h1><p>최신 뉴스가 Gmail로 발송되었습니다.</p></div></body></html>`);
    } catch (error) {
        console.error('이메일 발송 실패:', error);
        res.status(500).send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>실패</title>
<style>body{font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#f8d7da}.card{background:#fff;padding:40px;border-radius:15px;text-align:center}h1{color:#dc3545}</style>
</head><body><div class="card"><h1>발송 실패</h1><p>오류가 발생했습니다. 로그를 확인하세요.</p></div></body></html>`);
    }
});

app.get('/api/digest/latest', (req, res) => {
    // 1. 메모리 캐시 우선
    if (runDigest._latestDigest) {
        return res.json(runDigest._latestDigest);
    }
    // 2. 파일 fallback
    const fs = require('fs');
    const digestPath = path.join(__dirname, 'archive', 'latest-digest.json');
    if (fs.existsSync(digestPath)) {
        try {
            const data = JSON.parse(fs.readFileSync(digestPath, 'utf8'));
            return res.json(data);
        } catch (_e) { /* fall through */ }
    }
    res.status(404).json({ error: '아직 수집된 다이제스트가 없습니다.' });
});

app.post('/fetch-news', async (req, res) => {
    try {
        console.log('\n=== 새로운 뉴스 수집 요청 ===');
        const digest = await runDigest({ sendMail: false, useLLM: false });

        res.json({
            success: true,
            message: '뉴스가 성공적으로 수집되었습니다!',
            headlines: digest.articles,
            files: { dateFormat: digest.date.slice(0, 10) },
        });
    } catch (error) {
        console.error('에러:', error);
        res.status(500).json({
            success: false,
            message: '뉴스 수집 중 오류가 발생했습니다.',
        });
    }
});

app.listen(PORT, () => {
    console.log(`📰 뉴스 스크래퍼 웹 서버: http://localhost:${PORT}`);
});
