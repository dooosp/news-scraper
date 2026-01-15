require('dotenv').config();
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const { fetchNaverITNews, saveNewsAndCreatePPT } = require('./news-fetcher');
const path = require('path');
const fs = require('fs');

// ===== 설정 =====
// 환경변수 또는 기본값 사용 (로컬에서는 .env 파일 사용)
const CONFIG = {
    // Gmail 설정
    email: process.env.GMAIL_USER || 'jangho1383@gmail.com',
    password: process.env.GMAIL_PASS || '',  // 환경변수 필수
    recipient: process.env.GMAIL_RECIPIENT || 'jangho1383@gmail.com',

    // 스케줄 설정 (매일 오전 7시)
    schedule: '0 7 * * *',

    // 서버 URL (ngrok 또는 로컬)
    serverUrl: process.env.SERVER_URL || 'http://localhost:3000'
};

// ===== 이메일 발송 함수 =====
async function sendNewsEmail(headlines, files) {
    // Gmail SMTP 설정
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: CONFIG.email,
            pass: CONFIG.password
        }
    });

    // 날짜 정보
    const today = new Date();
    const dateString = today.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
    });

    // HOT 뉴스와 일반 뉴스 분리
    const hotNews = headlines.filter(h => h.isHot);
    const regularNews = headlines.filter(h => !h.isHot);

    // HTML 이메일 본문 생성
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
        hotNews.forEach((news, index) => {
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
        <div style="text-align: center; padding: 20px; background: #f0f0f0;">
            <a href="${CONFIG.serverUrl}/send-email"
               style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                      color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px;
                      font-weight: bold; font-size: 16px;">
                🔄 최신 뉴스 새로고침
            </a>
            <p style="margin-top: 10px; font-size: 12px; color: #888;">버튼을 누르면 최신 뉴스를 다시 받을 수 있습니다</p>
        </div>
        <div class="footer">
            <p>이 이메일은 뉴스 스크래퍼에서 자동으로 발송되었습니다.</p>
            <p>수집 소스: 네이버 랭킹 | 구글 뉴스 | 연합뉴스</p>
        </div>
    </body>
    </html>
    `;

    // 첨부 파일 준비
    const attachments = [];
    const archiveDir = path.join(__dirname, 'archive');

    if (files && files.pptFile) {
        const pptPath = path.join(__dirname, files.pptFile);
        if (fs.existsSync(pptPath)) {
            attachments.push({
                filename: path.basename(pptPath),
                path: pptPath
            });
        }
    }

    // 이메일 발송
    const mailOptions = {
        from: `뉴스 스크래퍼 <${CONFIG.email}>`,
        to: CONFIG.recipient,
        subject: `📰 [${dateString}] 오늘의 인기 뉴스`,
        html: htmlContent,
        attachments: attachments
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ 이메일 발송 성공: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error(`❌ 이메일 발송 실패: ${error.message}`);
        return false;
    }
}

// ===== 뉴스 수집 및 이메일 발송 =====
async function collectAndSend() {
    console.log('\n========================================');
    console.log(`📧 뉴스 수집 및 이메일 발송 시작`);
    console.log(`   시간: ${new Date().toLocaleString('ko-KR')}`);
    console.log('========================================\n');

    try {
        // 뉴스 수집
        const headlines = await fetchNaverITNews();

        // 파일 저장
        const files = await saveNewsAndCreatePPT(headlines, __dirname);

        // 이메일 발송
        await sendNewsEmail(headlines, files);

        console.log('\n✅ 모든 작업 완료!\n');
    } catch (error) {
        console.error('\n❌ 작업 실패:', error.message);
    }
}

// ===== 스케줄러 시작 =====
function startScheduler() {
    console.log('========================================');
    console.log('📧 뉴스 이메일 스케줄러 시작');
    console.log(`   발송 대상: ${CONFIG.recipient}`);
    console.log(`   스케줄: ${CONFIG.schedule} (매일 오전 7시)`);
    console.log('========================================\n');

    // 크론 작업 등록
    cron.schedule(CONFIG.schedule, () => {
        collectAndSend();
    }, {
        timezone: 'Asia/Seoul'
    });

    console.log('⏰ 스케줄러가 실행 중입니다. 매일 오전 7시에 이메일이 발송됩니다.\n');
}

// ===== 실행 =====
// 명령줄 인자 확인
const args = process.argv.slice(2);

if (args.includes('--now') || args.includes('-n')) {
    // 즉시 실행
    console.log('🚀 즉시 실행 모드\n');
    collectAndSend();
} else if (args.includes('--test') || args.includes('-t')) {
    // 테스트 모드 (이메일만 테스트)
    console.log('🧪 테스트 모드 - 이메일 발송 테스트\n');
    const testHeadlines = [
        { title: '테스트 뉴스 1', sources: ['네이버', '구글뉴스'], isHot: true, links: [{source: '네이버', url: 'https://news.naver.com'}], summary: '테스트 요약입니다.' },
        { title: '테스트 뉴스 2', sources: ['연합뉴스'], isHot: false, links: [{source: '연합뉴스', url: 'https://www.yonhapnews.co.kr'}], summary: '' }
    ];
    sendNewsEmail(testHeadlines, null);
} else {
    // 스케줄러 모드
    startScheduler();
}

module.exports = { sendNewsEmail, collectAndSend };
