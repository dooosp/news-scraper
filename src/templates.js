const PptxGenJS = require('pptxgenjs');
const antiEcho = require('../lib/anti-echo-chamber');
const { escapeHtml, formatSources } = require('./utils');

const REFRESH_URL = process.env.REFRESH_URL || 'https://news-trigger.jangho1383.workers.dev';

// ===== 이메일 HTML =====

/**
 * @param {import('./types').Digest} digest
 * @returns {string}
 */
function renderEmailHtml(digest) {
    const { articles, dateDisplay, activeSources } = digest;
    const hotNews = articles.filter(a => a.isHot);
    const domestic = articles.filter(a => !a.isHot && (!a.category || a.category === 'domestic'));
    const analysis = articles.filter(a => !a.isHot && a.category === 'analysis');
    const global = articles.filter(a => !a.isHot && a.category === 'global');

    let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
body{font-family:'Segoe UI',Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto}
.header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;padding:20px;text-align:center;border-radius:10px 10px 0 0}
.header h1{margin:0;font-size:24px}.header p{margin:5px 0 0;opacity:.9;font-size:14px}
.content{padding:20px;background:#f9f9f9}
.news-item{background:#fff;padding:15px;margin-bottom:10px;border-radius:8px;border-left:4px solid #667eea}
.news-item.hot{border-left-color:#dc3545;background:#fff5f5}
.hot-badge{background:#dc3545;color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700}
.news-title{font-size:16px;font-weight:700;margin-bottom:5px}
.news-title a{color:#333;text-decoration:none}
.news-sources{color:#666;font-size:12px;margin-bottom:5px}
.news-summary{color:#555;font-size:13px}
.section-title{font-size:18px;font-weight:700;color:#667eea;margin:20px 0 10px;padding-bottom:5px;border-bottom:2px solid #667eea}
.stats{display:flex;justify-content:space-around;margin-bottom:15px}
.stat{text-align:center}.stat-number{font-size:24px;font-weight:700;color:#667eea}
.stat-label{font-size:12px;color:#666}
.footer{background:#333;color:#aaa;padding:15px;text-align:center;font-size:12px;border-radius:0 0 10px 10px}
</style></head><body>`;

    // 헤더
    html += `<div class="header"><h1>📰 오늘의 인기 뉴스</h1><p>${dateDisplay}</p></div>`;
    html += `<div class="content">`;

    // 통계
    html += `<div class="stats">
<div class="stat"><div class="stat-number">${articles.length}</div><div class="stat-label">전체 뉴스</div></div>
<div class="stat"><div class="stat-number" style="color:#dc3545">${hotNews.length}</div><div class="stat-label">HOT 뉴스</div></div>
</div>`;

    // HOT 섹션
    if (hotNews.length > 0) {
        html += `<div class="section-title" style="color:#dc3545;border-bottom-color:#dc3545">🔥 HOT 뉴스</div>`;
        hotNews.forEach(a => { html += renderNewsItem(a, 'hot'); });
    }

    // 국내 섹션
    if (domestic.length > 0) {
        html += `<div class="section-title">🇰🇷 국내 주요 뉴스</div>`;
        domestic.forEach((a, i) => { html += renderNewsItem(a, '', i + 1); });
    }

    // 분석 섹션
    if (analysis.length > 0) {
        html += `<div class="section-title" style="color:#28a745;border-bottom-color:#28a745">📊 심층 분석 기사</div>`;
        analysis.forEach((a, i) => { html += renderNewsItem(a, 'analysis', i + 1); });
    }

    // 글로벌 섹션
    if (global.length > 0) {
        html += `<div class="section-title" style="color:#17a2b8;border-bottom-color:#17a2b8">🌍 글로벌 핫뉴스</div>`;
        global.forEach((a, i) => { html += renderNewsItem(a, 'global', i + 1); });
    }

    // Anti-Echo-Chamber 섹션
    const withPerspective = articles.filter(a => a.counterView);
    if (withPerspective.length > 0) {
        try {
            const section = antiEcho.templates.renderSection(withPerspective.map(a => a.counterView));
            html += section;
        } catch (e) { console.warn(`반대관점 렌더링 실패: ${e.message}`); }
    }

    // 새로고침 버튼
    html += `</div>
<div style="text-align:center;padding:20px;background:#f0f0f0">
<a href="${REFRESH_URL}" style="display:inline-block;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;padding:15px 30px;text-decoration:none;border-radius:25px;font-weight:700;font-size:16px">🔄 최신 뉴스 새로고침</a>
<p style="margin-top:10px;font-size:12px;color:#888">클릭하면 1~2분 후 새 뉴스가 도착합니다</p>
</div>`;

    // 푸터 (활성 소스 동적 생성)
    html += `<div class="footer">
<p>이 이메일은 자동으로 발송되었습니다.</p>
<p>수집 소스: ${formatSources(activeSources)}</p>
</div></body></html>`;

    return html;
}

function renderNewsItem(article, type, index) {
    const link = article.links && article.links.length > 0 ? escapeHtml(article.links[0].url) : '#';
    const prefix = index ? `${index}. ` : '';
    const borderColor = type === 'analysis' ? '#28a745' : type === 'global' ? '#17a2b8' : '';
    const style = borderColor ? ` style="border-left-color:${borderColor}"` : '';
    const cls = type === 'hot' ? ' hot' : '';
    const maxSummary = type === 'hot' ? 100 : 150;

    let html = `<div class="news-item${cls}"${style}>`;
    html += `<div class="news-title">`;
    if (type === 'hot') html += `<span class="hot-badge">HOT</span> `;
    html += `<a href="${link}" target="_blank">${prefix}${escapeHtml(article.title)}</a></div>`;
    html += `<div class="news-sources">출처: ${escapeHtml(formatSources(article.sources))}</div>`;
    if (article.summary) {
        html += `<div class="news-summary">${escapeHtml(article.summary.substring(0, maxSummary))}...</div>`;
    }
    html += `</div>`;
    return html;
}

// ===== PPT 생성 =====

/**
 * @param {import('./types').Digest} digest
 * @param {string} outputPath
 */
async function renderPpt(digest, outputPath) {
    const { articles, dateDisplay, activeSources } = digest;
    const pptx = new PptxGenJS();
    pptx.author = 'News Scraper';
    pptx.title = '오늘의 뉴스 리포트';

    const hotNews = articles.filter(a => a.isHot);
    const keywords = extractKeywords(articles);
    const insights = generateInsights(articles, keywords);

    // 슬라이드 1: 제목
    let s1 = pptx.addSlide();
    s1.background = { color: '0078D4' };
    s1.addText('오늘의 뉴스', { x: 0.5, y: 1.8, w: 9, h: 1.5, fontSize: 44, bold: true, color: 'FFFFFF', align: 'center' });
    s1.addText('멀티소스 인기 뉴스 리포트', { x: 0.5, y: 3.3, w: 9, h: 0.5, fontSize: 20, color: 'E0E0E0', align: 'center' });
    s1.addText(dateDisplay, { x: 0.5, y: 4.0, w: 9, h: 0.5, fontSize: 24, color: 'FFFFFF', align: 'center' });
    s1.addText(activeSources.join(' | '), { x: 0.5, y: 4.8, w: 9, h: 0.3, fontSize: 14, color: 'B0B0B0', align: 'center', italic: true });

    // 슬라이드 2: HOT 뉴스
    if (hotNews.length > 0) {
        let sHot = pptx.addSlide();
        sHot.background = { color: 'FFF5F5' };
        sHot.addText('HOT NEWS', { x: 0.5, y: 0.3, w: 9, h: 0.7, fontSize: 36, bold: true, color: 'D32F2F' });
        sHot.addText('여러 매체에서 동시에 보도된 주요 뉴스', { x: 0.5, y: 0.9, w: 9, h: 0.4, fontSize: 14, color: '666666', italic: true });
        let y = 1.5;
        hotNews.slice(0, 4).forEach((a, i) => {
            sHot.addText(`${i + 1}. ${a.title}`, { x: 0.5, y, w: 9, h: 0.5, fontSize: 16, bold: true, color: '333333' });
            sHot.addText(`출처: ${a.sources.join(', ')}`, { x: 0.8, y: y + 0.45, w: 8.7, h: 0.3, fontSize: 11, color: 'D32F2F', bold: true });
            if (a.summary) {
                const s = a.summary.length > 80 ? a.summary.substring(0, 80) + '...' : a.summary;
                sHot.addText(s, { x: 0.8, y: y + 0.75, w: 8.7, h: 0.35, fontSize: 10, color: '666666', italic: true });
                y += 1.3;
            } else { y += 1.0; }
        });
    }

    // 슬라이드 3: 전체 뉴스
    let s2 = pptx.addSlide();
    s2.addText('오늘의 뉴스', { x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 32, bold: true, color: '0078D4' });
    let y2 = 1.1;
    articles.slice(0, 6).forEach((a, i) => {
        const hot = a.isHot ? '[HOT] ' : '';
        s2.addText(`${i + 1}. ${hot}${a.title}`, { x: 0.5, y: y2, w: 9, h: 0.4, fontSize: 13, bold: true, color: a.isHot ? 'D32F2F' : '333333' });
        s2.addText(`[${a.sources.join(', ')}]`, { x: 0.8, y: y2 + 0.35, w: 8.7, h: 0.25, fontSize: 9, color: '888888' });
        y2 += 0.75;
    });

    // 슬라이드 4: 키워드 & 인사이트
    let s3 = pptx.addSlide();
    s3.addText('핵심 키워드 & 트렌드', { x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 32, bold: true, color: '0078D4' });
    s3.addText('핵심 키워드', { x: 0.5, y: 1.2, w: 4, h: 0.4, fontSize: 20, bold: true, color: '333333' });
    const kwText = keywords.slice(0, 8).map((k, i) => `${i + 1}. ${k.word} (${k.count}회)`).join('\n');
    s3.addText(kwText, { x: 0.5, y: 1.7, w: 4, h: 3, fontSize: 14, color: '555555', valign: 'top' });
    s3.addText('트렌드 인사이트', { x: 5.2, y: 1.2, w: 4.3, h: 0.4, fontSize: 20, bold: true, color: '333333' });
    s3.addText(insights.join('\n\n'), { x: 5.2, y: 1.7, w: 4.3, h: 3, fontSize: 12, color: '555555', valign: 'top' });

    // 슬라이드 5: 요약
    let s4 = pptx.addSlide();
    s4.addText('오늘의 요약', { x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 32, bold: true, color: '0078D4' });
    const topKw = keywords.slice(0, 3).map(k => k.word).join(', ');
    const summary = [
        `총 ${articles.length}개의 뉴스 분석 (${activeSources.length}개 소스)`,
        hotNews.length > 0 ? `HOT 뉴스 ${hotNews.length}개 (복수 매체 보도)` : '단독 보도 뉴스 위주',
        `핵심 키워드: ${topKw}`,
    ].map((s, i) => `${i + 1}. ${s}`).join('\n\n');
    s4.addText(summary, { x: 0.5, y: 1.5, w: 9, h: 3, fontSize: 16, color: '333333', valign: 'top' });

    return pptx.writeFile({ fileName: outputPath });
}

// ===== PPT 헬퍼 =====

function extractKeywords(articles) {
    const stopWords = ['은','는','이','가','을','를','의','에','에서','와','과','로','으로','도','만','까지','부터','한','및','등','더','약','위해','통해','대한','위한','따른','통한','년','월','일','때','것','수','개','명'];
    const counts = {};
    articles.forEach(a => {
        const words = (a.title + ' ' + (a.summary || '')).match(/[가-힣]+|[a-zA-Z]+|[0-9]+/g) || [];
        words.forEach(w => { if (w.length >= 2 && !stopWords.includes(w)) counts[w] = (counts[w] || 0) + 1; });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([word, count]) => ({ word, count }));
}

function generateInsights(articles, keywords) {
    const kw = keywords.map(k => k.word);
    const insights = [];
    if (kw.some(k => ['대통령','정부','국회','장관','총리','여당','야당'].includes(k)))
        insights.push('정치: 정치권의 주요 이슈가 뉴스의 중심에 있습니다.');
    if (kw.some(k => ['경제','주식','코스피','환율','금리','부동산','투자'].includes(k)))
        insights.push('경제: 경제 동향과 시장 변화가 주목받고 있습니다.');
    if (kw.some(k => ['AI','인공지능','기술','삼성','애플','IT'].includes(k)))
        insights.push('기술: IT와 기술 분야의 혁신이 이어지고 있습니다.');
    if (kw.some(k => ['사건','사고','검찰','경찰','재판','수사'].includes(k)))
        insights.push('사회: 주요 사건과 사회 이슈가 보도되고 있습니다.');
    if (kw.some(k => ['북한','미국','중국','일본','외교','안보'].includes(k)))
        insights.push('국제: 외교와 국제 정세가 관심을 받고 있습니다.');
    if (insights.length === 0) insights.push('다양한 분야에서 주요 뉴스가 보도되고 있습니다.');
    const hotCount = articles.filter(a => a.isHot).length;
    if (hotCount > 0) insights.push(`오늘 ${hotCount}개의 뉴스가 여러 매체에서 동시에 보도되었습니다.`);
    return insights;
}

module.exports = { renderEmailHtml, renderNewsItem, renderPpt };
