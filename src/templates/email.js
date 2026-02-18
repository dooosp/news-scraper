const antiEcho = require('../../lib/anti-echo-chamber');
const { escapeHtml, formatSources } = require('../utils');
const { REFRESH_URL } = require('../config');

/**
 * @param {import('../types').Digest} digest
 * @returns {string}
 */
function renderEmailHtml(digest) {
    const { articles, dateDisplay, activeSources } = digest;
    const hotNews = articles.filter(a => a.isHot);
    const domestic = articles.filter(a => !a.isHot && (!a.category || a.category === 'domestic'));
    const tech = articles.filter(a => !a.isHot && a.category === 'tech');
    const economy = articles.filter(a => !a.isHot && a.category === 'economy');
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

    html += `<div class="header"><h1>📰 오늘의 인기 뉴스</h1><p>${dateDisplay}</p></div>`;
    html += `<div class="content">`;

    html += `<div class="stats">
<div class="stat"><div class="stat-number">${articles.length}</div><div class="stat-label">전체 뉴스</div></div>
<div class="stat"><div class="stat-number" style="color:#dc3545">${hotNews.length}</div><div class="stat-label">HOT 뉴스</div></div>
</div>`;

    if (hotNews.length > 0) {
        html += `<div class="section-title" style="color:#dc3545;border-bottom-color:#dc3545">🔥 HOT 뉴스</div>`;
        hotNews.forEach(a => { html += renderNewsItem(a, 'hot'); });
    }

    if (domestic.length > 0) {
        html += `<div class="section-title">🇰🇷 국내 주요 뉴스</div>`;
        domestic.forEach((a, i) => { html += renderNewsItem(a, '', i + 1); });
    }

    if (tech.length > 0) {
        html += `<div class="section-title" style="color:#8b5cf6;border-bottom-color:#8b5cf6">💻 테크</div>`;
        tech.forEach((a, i) => { html += renderNewsItem(a, 'tech', i + 1); });
    }

    if (economy.length > 0) {
        html += `<div class="section-title" style="color:#f59e0b;border-bottom-color:#f59e0b">💰 경제</div>`;
        economy.forEach((a, i) => { html += renderNewsItem(a, 'economy', i + 1); });
    }

    if (analysis.length > 0) {
        html += `<div class="section-title" style="color:#28a745;border-bottom-color:#28a745">📊 심층 분석 기사</div>`;
        analysis.forEach((a, i) => { html += renderNewsItem(a, 'analysis', i + 1); });
    }

    if (global.length > 0) {
        html += `<div class="section-title" style="color:#17a2b8;border-bottom-color:#17a2b8">🌍 글로벌 핫뉴스</div>`;
        global.forEach((a, i) => { html += renderNewsItem(a, 'global', i + 1); });
    }

    const withPerspective = articles.filter(a => a.counterView);
    if (withPerspective.length > 0) {
        try {
            const section = antiEcho.templates.renderSection(withPerspective.map(a => a.counterView));
            html += section;
        } catch (e) { console.warn(`반대관점 렌더링 실패: ${e.message}`); }
    }

    html += `</div>
<div style="text-align:center;padding:20px;background:#f0f0f0">
<a href="${REFRESH_URL}" style="display:inline-block;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;padding:15px 30px;text-decoration:none;border-radius:25px;font-weight:700;font-size:16px">🔄 최신 뉴스 새로고침</a>
<p style="margin-top:10px;font-size:12px;color:#888">클릭하면 1~2분 후 새 뉴스가 도착합니다</p>
</div>`;

    html += `<div class="footer">
<p>이 이메일은 자동으로 발송되었습니다.</p>
<p>수집 소스: ${formatSources(activeSources)}</p>
</div></body></html>`;

    return html;
}

function renderNewsItem(article, type, index) {
    const link = article.links && article.links.length > 0 ? escapeHtml(article.links[0].url) : '#';
    const prefix = index ? `${index}. ` : '';
    const borderColor = type === 'tech' ? '#8b5cf6' : type === 'economy' ? '#f59e0b' : type === 'analysis' ? '#28a745' : type === 'global' ? '#17a2b8' : '';
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

module.exports = { renderEmailHtml, renderNewsItem };
