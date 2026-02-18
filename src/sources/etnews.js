const Parser = require('rss-parser');
const { truncateSentence } = require('../utils');
const rssParser = new Parser({ timeout: 10000 });

const SOURCE_NAME = '전자신문';
const CATEGORY = 'tech';
const MAX_ITEMS = 5;

/** @returns {Promise<import('../types').Article[]>} */
async function fetch() {
    console.log(`  [${SOURCE_NAME}] IT/과학 뉴스 수집 중...`);
    const url = 'https://rss.etnews.com/Section901.xml';

    const feed = await rssParser.parseURL(url);
    const articles = feed.items.slice(0, MAX_ITEMS).map(item => ({
        title: item.title || '',
        url: item.link || '',
        summary: item.contentSnippet ? truncateSentence(item.contentSnippet, 200) : '',
        source: SOURCE_NAME,
        category: CATEGORY,
    }));

    console.log(`  [${SOURCE_NAME}] ${articles.length}개 수집 완료`);
    return articles;
}

module.exports = { name: SOURCE_NAME, category: CATEGORY, fetch };
