const express = require('express');
const app = express();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = 'dooosp';
const REPO_NAME = 'news-scraper';

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>뉴스 새로고침</title>
            <style>
                body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
                .card { background: white; padding: 40px; border-radius: 15px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
                h1 { color: #667eea; }
                a { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>📰 뉴스 스크래퍼</h1>
                <p>버튼을 누르면 최신 뉴스가 이메일로 발송됩니다.</p>
                <a href="/send">🔄 최신 뉴스 받기</a>
            </div>
        </body>
        </html>
    `);
});

app.get('/send', async (req, res) => {
    try {
        const response = await fetch(
            `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows/daily-news.yml/dispatches`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ref: 'main' })
            }
        );

        if (response.ok || response.status === 204) {
            res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>발송 완료</title>
                    <style>
                        body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: linear-gradient(135deg, #28a745 0%, #20c997 100%); }
                        .card { background: white; padding: 40px; border-radius: 15px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
                        h1 { color: #28a745; }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <h1>✅ 요청 완료!</h1>
                        <p>1~2분 후에 Gmail로 최신 뉴스가 도착합니다.</p>
                        <p style="color: #888; font-size: 14px;">이 창을 닫아도 됩니다.</p>
                    </div>
                </body>
                </html>
            `);
        } else {
            throw new Error(`GitHub API error: ${response.status}`);
        }
    } catch (error) {
        res.status(500).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>오류</title>
                <style>
                    body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f8d7da; }
                    .card { background: white; padding: 40px; border-radius: 15px; text-align: center; }
                    h1 { color: #dc3545; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h1>❌ 오류 발생</h1>
                    <p>${error.message}</p>
                </div>
            </body>
            </html>
        `);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Trigger server running on port ${PORT}`);
});
