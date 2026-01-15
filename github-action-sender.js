const nodemailer = require('nodemailer');
const { fetchNaverITNews } = require('./news-fetcher');

// 환경변수에서 설정 읽기 (GitHub Secrets)
const CONFIG = {
    email: process.env.GMAIL_USER,
    password: process.env.GMAIL_PASS,
    recipient: process.env.GMAIL_RECIPIENT
};

// 이메일 발송 함수
async function sendNewsEmail(headlines) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: CONFIG.email,
            pass: CONFIG.password
        }
    });

    const today = new Date();
    const dateString = today.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
        timeZone: 'Asia/Seoul'
    });

    const hotNews = headlines.filter(h => h.isHot);
    const regularNews = headlines.filter(h => !h.isHot);

    let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { margin: 0; font-size: 24px; }
            .header p { margin: 5px 0 0; opacity: 0.9; font-size: 14px; }
            .content { padding: 20px; background: #f9f9f9; }
            .news-item { background: white; padding: 15px; margin-bottom: 10px; border-radius: 8px; border-left: 4px solid #667eea; }
            .news-item.hot { border-left-color: #dc3545; background: #fff5f5; }
            .hot-badge { background: #dc3545; color: white; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: bold; }
            .news-title { font-size: 16px; font-weight: bold; margin-bottom: 5px; }
            .news-title a { color: #333; text-decoration: none; }
            .news-title a:hover { color: #667eea; }
            .news-sources { color: #666; font-size: 12px; margin-bottom: 5px; }
            .news-summary { color: #555; font-size: 13px; }
            .section-title { font-size: 18px; font-weight: bold; color: #667eea; margin: 20px 0 10px; padding-bottom: 5px; border-bottom: 2px solid #667eea; }
            .section-title.hot { color: #dc3545; border-bottom-color: #dc3545; }
            .footer { background: #333; color: #aaa; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 10px 10px; }
            .stats { display: flex; justify-content: space-around; margin-bottom: 15px; }
            .stat { text-align: center; }
            .stat-number { font-size: 24px; font-weight: bold; color: #667eea; }
            .stat-label { font-size: 12px; color: #666; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>📰 오늘의 인기 뉴스</h1>
            <p>${dateString}</p>
        </div>
        <div class="content">
            <div class="stats">
                <div class="stat">
                    <div class="stat-number">${headlines.length}</div>
                    <div class="stat-label">전체 뉴스</div>
                </div>
                <div class="stat">
                    <div class="stat-number" style="color: #dc3545;">${hotNews.length}</div>
                    <div class="stat-label">HOT 뉴스</div>
                </div>
            </div>
    `;

    // HOT 뉴스 섹션
    if (hotNews.length > 0) {
        htmlContent += `<div class="section-title hot">🔥 HOT 뉴스</div>`;
        hotNews.forEach((news) => {
            const link = news.links && news.links.length > 0 ? news.links[0].url : '#';
            htmlContent += `
            <div class="news-item hot">
                <div class="news-title">
                    <span class="hot-badge">HOT</span>
                    <a href="${link}" target="_blank">${news.title}</a>
                </div>
                <div class="news-sources">출처: ${news.sources.join(', ')}</div>
                ${news.summary ? `<div class="news-summary">${news.summary.substring(0, 100)}...</div>` : ''}
            </div>
            `;
        });
    }

    // 일반 뉴스 섹션
    htmlContent += `<div class="section-title">📋 주요 뉴스</div>`;
    regularNews.slice(0, 10).forEach((news, index) => {
        const link = news.links && news.links.length > 0 ? news.links[0].url : '#';
        htmlContent += `
        <div class="news-item">
            <div class="news-title">
                <a href="${link}" target="_blank">${index + 1}. ${news.title}</a>
            </div>
            <div class="news-sources">출처: ${news.sources.join(', ')}</div>
        </div>
        `;
    });

    htmlContent += `
        </div>
        <div class="footer">
            <p>이 이메일은 GitHub Actions에서 자동으로 발송되었습니다.</p>
            <p>수집 소스: 네이버 랭킹 | 구글 뉴스 | 연합뉴스</p>
        </div>
    </body>
    </html>
    `;

    const mailOptions = {
        from: `뉴스 스크래퍼 <${CONFIG.email}>`,
        to: CONFIG.recipient,
        subject: `📰 [${dateString}] 오늘의 인기 뉴스`,
        html: htmlContent
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ 이메일 발송 성공: ${info.messageId}`);
}

// 메인 실행
async function main() {
    console.log('========================================');
    console.log('📧 GitHub Actions 뉴스 이메일 발송');
    console.log(`   시간: ${new Date().toISOString()}`);
    console.log('========================================\n');

    try {
        // 뉴스 수집
        const headlines = await fetchNaverITNews();

        // 이메일 발송
        await sendNewsEmail(headlines);

        console.log('\n✅ 모든 작업 완료!');
    } catch (error) {
        console.error('\n❌ 작업 실패:', error.message);
        process.exit(1);
    }
}

main();
