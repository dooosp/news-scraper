const express = require('express');
const fs = require('fs');
const path = require('path');
const { createServer, startServer } = require('server-base');
const { runDigest } = require('./src/main');
const { successPage, errorPage } = require('./src/templates/server-responses');

const PORT = process.env.PORT || 3100;
const ARCHIVE_DIR = path.join(__dirname, 'archive');

// ===== 키워드 추출 (stopword 필터링) =====
const STOPWORDS = new Set([
    '이', '그', '저', '것', '수', '등', '및', '중', '내', '위', '후', '간', '전', '대', '월', '일', '년',
    '에서', '으로', '에게', '까지', '부터', '이후', '관련', '대한', '통해', '하는', '있는', '되는', '된다',
    '위해', '따라', '대해', '있다', '없다', '했다', '한다', '된다', '같은', '모든', '이번',
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as',
    'and', 'or', 'but', 'not', 'no', 'it', 'its', 'this', 'that',
    'has', 'have', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'may', 'might', 'can', 'new', 'says', 'said', 'us', 'we', 'they', 'who', 'how',
]);

function extractKeywords(title) {
    return title
        .replace(/[^\w\sㄱ-ㅎㅏ-ㅣ가-힣]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 1 && !STOPWORDS.has(w.toLowerCase()))
        .map(w => w.toLowerCase());
}

// ===== 서버 생성 =====
const app = createServer({ name: 'news-scraper' });
app.use(express.static('public'));
app.use('/archive', express.static('archive'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/send-email', async (req, res) => {
    try {
        console.log('\n=== 이메일 발송 요청 ===');
        await runDigest({ sendMail: true, useLLM: true });
        res.send(successPage());
    } catch (error) {
        console.error('이메일 발송 실패:', error);
        res.status(500).send(errorPage());
    }
});

app.get('/api/digest/latest', (req, res) => {
    if (runDigest._latestDigest) {
        return res.json(runDigest._latestDigest);
    }
    const digestPath = path.join(ARCHIVE_DIR, 'latest-digest.json');
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
        res.status(500).json({ success: false, message: '뉴스 수집 중 오류가 발생했습니다.' });
    }
});

// ===== 아카이브 API =====

app.get('/api/archive/list', (req, res) => {
    if (!fs.existsSync(ARCHIVE_DIR)) return res.json([]);
    const files = fs.readdirSync(ARCHIVE_DIR)
        .filter(f => f.startsWith('digest_') && f.endsWith('.json'))
        .sort().reverse();

    const list = files.map(f => {
        const date = f.replace('digest_', '').replace('.json', '');
        try {
            const data = JSON.parse(fs.readFileSync(path.join(ARCHIVE_DIR, f), 'utf8'));
            return {
                date,
                dateDisplay: data.dateDisplay || date,
                articleCount: (data.articles || []).length,
                hotCount: (data.articles || []).filter(a => a.isHot).length,
            };
        } catch (_e) {
            return { date, dateDisplay: date, articleCount: 0, hotCount: 0 };
        }
    });
    res.json(list);
});

app.get('/api/archive/:date', (req, res) => {
    const { date } = req.params;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: '잘못된 날짜 형식' });
    }
    const filePath = path.join(ARCHIVE_DIR, `digest_${date}.json`);
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: '해당 날짜 다이제스트 없음' });
    }
    try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        res.json(data);
    } catch (_e) {
        res.status(500).json({ error: '파일 읽기 실패' });
    }
});

// ===== 분석 API =====

app.get('/api/keywords/trend', (req, res) => {
    if (!fs.existsSync(ARCHIVE_DIR)) return res.json({ dates: [], keywords: {} });
    const files = fs.readdirSync(ARCHIVE_DIR)
        .filter(f => f.startsWith('digest_') && f.endsWith('.json'))
        .sort().slice(-14);

    const dates = [];
    const keywordMap = {};

    files.forEach(f => {
        const date = f.replace('digest_', '').replace('.json', '');
        dates.push(date);
        try {
            const data = JSON.parse(fs.readFileSync(path.join(ARCHIVE_DIR, f), 'utf8'));
            (data.articles || []).forEach(a => {
                extractKeywords(a.title).forEach(kw => {
                    if (!keywordMap[kw]) keywordMap[kw] = { total: 0, byDate: {} };
                    keywordMap[kw].total++;
                    keywordMap[kw].byDate[date] = (keywordMap[kw].byDate[date] || 0) + 1;
                });
            });
        } catch (_e) { /* skip */ }
    });

    const topKeywords = Object.entries(keywordMap)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 10)
        .reduce((acc, [kw, data]) => {
            acc[kw] = { total: data.total, byDate: dates.map(d => data.byDate[d] || 0) };
            return acc;
        }, {});

    res.json({ dates, keywords: topKeywords });
});

app.get('/api/weekly-summary', (req, res) => {
    if (!fs.existsSync(ARCHIVE_DIR)) {
        return res.json({ totalArticles: 0, hotArticles: 0, keywords: [], sourceCounts: {}, dailyCounts: [] });
    }
    const files = fs.readdirSync(ARCHIVE_DIR)
        .filter(f => f.startsWith('digest_') && f.endsWith('.json'))
        .sort().slice(-7);

    let totalArticles = 0, hotArticles = 0;
    const sourceCounts = {};
    const dailyCounts = [];
    const keywordMap = {};

    files.forEach(f => {
        const date = f.replace('digest_', '').replace('.json', '');
        try {
            const data = JSON.parse(fs.readFileSync(path.join(ARCHIVE_DIR, f), 'utf8'));
            const articles = data.articles || [];
            totalArticles += articles.length;
            const hot = articles.filter(a => a.isHot).length;
            hotArticles += hot;
            dailyCounts.push({ date, count: articles.length, hot });

            articles.forEach(a => {
                (a.sources || []).forEach(s => { sourceCounts[s] = (sourceCounts[s] || 0) + 1; });
                extractKeywords(a.title).forEach(kw => { keywordMap[kw] = (keywordMap[kw] || 0) + 1; });
            });
        } catch (_e) { /* skip */ }
    });

    const keywords = Object.entries(keywordMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([keyword, count]) => ({ keyword, count }));

    res.json({ totalArticles, hotArticles, keywords, sourceCounts, dailyCounts });
});

startServer(app, PORT, { name: 'news-scraper' });
