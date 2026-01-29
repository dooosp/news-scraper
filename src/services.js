const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const { renderEmailHtml, renderPpt } = require('./templates');

const ARCHIVE_DIR = process.env.ARCHIVE_DIR || path.join(__dirname, '..', 'archive');

// ===== 이메일 발송 =====

/**
 * @param {import('./types').Digest} digest
 */
async function sendNewsEmail(digest) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASS,
        },
    });

    const html = renderEmailHtml(digest);

    const mailOptions = {
        from: `뉴스 스크래퍼 <${process.env.GMAIL_USER}>`,
        to: process.env.GMAIL_RECIPIENT,
        subject: `📰 [${digest.dateDisplay}] 오늘의 인기 뉴스`,
        html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ 이메일 발송 성공: ${info.messageId}`);
}

// ===== 파일 저장 =====

/**
 * @param {import('./types').Digest} digest
 */
async function saveResult(digest) {
    if (!fs.existsSync(ARCHIVE_DIR)) fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
    const dateFormat = digest.date.slice(0, 10);

    const pptPath = path.join(ARCHIVE_DIR, `News_Report_${dateFormat}.pptx`);
    console.log('📊 PPT 생성 중...');
    await renderPpt(digest, pptPath);
    console.log(`✓ PPT 저장: ${pptPath}`);
}

module.exports = { sendNewsEmail, saveResult };
