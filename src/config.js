const path = require('path');
const os = require('os');

module.exports = {
    ARCHIVE_DIR: process.env.ARCHIVE_DIR || path.join(__dirname, '..', 'archive'),
    TODAY_NEWS_PATH: process.env.TODAY_NEWS_PATH || path.join(os.homedir(), 'today_news.md'),
    REFRESH_URL: process.env.REFRESH_URL || 'https://news-trigger.jangho1383.workers.dev',
    SIMILARITY_THRESHOLD: 0.4,
    MAX_TOTAL: 30,
    CATEGORY_MIN: { domestic: 3, tech: 5, economy: 3, global: 3, analysis: 2 },
    RSS_TIMEOUT: 10000,
    META_TIMEOUT: 5000,
    LINK_CHECK_TIMEOUT: 3000,
};
