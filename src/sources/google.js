const Parser = require('rss-parser');
const { truncateSentence } = require('../utils');
const rssParser = new Parser({ timeout: 10000 });

const SOURCE_NAME = '구글뉴스';
const CATEGORY = 'domestic';
const MAX_ITEMS = 7;

/** @returns {Promise<import('../types').Article[]>} */
async function fetch() {
    console.log(`  [구글] 탑 뉴스 수집 중...`);
    const url = 'https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko';

    const feed = await rssParser.parseURL(url);
    const articles = feed.items.slice(0, MAX_ITEMS).map(item => ({
        title: item.title ? item.title.replace(/ - .*$/, '').trim() : '',
        url: item.link || '',
        summary: truncateSentence(item.contentSnippet || '', 200),
        source: SOURCE_NAME,
        category: CATEGORY,
    }));

    console.log(`  [구글] ${articles.length}개 수집 완료`);
    return articles;
}

module.exports = { name: SOURCE_NAME, category: CATEGORY, fetch };
