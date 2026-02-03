const path = require('path');
const os = require('os');

module.exports = {
    ARCHIVE_DIR: process.env.ARCHIVE_DIR || path.join(__dirname, '..', 'archive'),
    TODAY_NEWS_PATH: process.env.TODAY_NEWS_PATH || path.join(os.homedir(), 'today_news.md'),
    REFRESH_URL: process.env.REFRESH_URL || 'https://news-trigger.jangho1383.workers.dev',
    SIMILARITY_THRESHOLD: 0.4,
    MAX_TOTAL: 15,
    CATEGORY_MIN: { domestic: 4, analysis: 2, global: 5 },
    RSS_TIMEOUT: 10000,
    META_TIMEOUT: 5000,
};
