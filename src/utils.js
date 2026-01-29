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

module.exports = { escapeHtml, fetchWithRetry };
