/**
 * HTML 특수문자 이스케이프 (XSS 방지)
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
}

/**
 * 재시도 래퍼 (지수 백오프)
 * @param {() => Promise<any>} fn
 * @param {{ retries?: number, backoff?: number }} options
 */
async function fetchWithRetry(fn, { retries = 2, backoff = 1000 } = {}) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            if (attempt === retries) throw err;
            const delay = backoff * Math.pow(2, attempt);
            console.log(`  ↻ 재시도 ${attempt + 1}/${retries} (${delay}ms 후)...`);
            await new Promise(r => setTimeout(r, delay));
        }
    }
}

/**
 * 문장 단위로 절단 (중간에 잘리지 않도록)
 * @param {string} text
 * @param {number} maxLen
 * @returns {string}
 */
function truncateSentence(text, maxLen) {
    if (!text || text.length <= maxLen) return text || '';
    const cut = text.substring(0, maxLen);
    const lastEnd = Math.max(
        cut.lastIndexOf('. '),
        cut.lastIndexOf('다.'),
        cut.lastIndexOf('요.'),
        cut.lastIndexOf('음.')
    );
    if (lastEnd > maxLen * 0.5) return cut.substring(0, lastEnd + 1);
    return cut + '…';
}

const SOURCE_DISPLAY = {
    '네이버': '네이버뉴스',
    '구글뉴스': '구글뉴스',
    '연합뉴스': '연합뉴스',
    '시사IN': '시사IN',
    '프레시안': '프레시안',
    'BBC': 'BBC',
    'CNN': 'CNN',
    'Guardian': 'Guardian',
    'AP': 'AP통신',
    'SBS': 'SBS뉴스',
};

function normalizeSource(name) {
    return SOURCE_DISPLAY[name] || name;
}

function formatSources(sources) {
    return sources.map(normalizeSource).join(' · ');
}

module.exports = { escapeHtml, fetchWithRetry, truncateSentence, normalizeSource, formatSources };
