const Parser = require('rss-parser');
const { truncateSentence } = require('../utils');
const rssParser = new Parser();

const SOURCE_NAME = 'BBC';
const CATEGORY = 'global';
const MAX_ITEMS = 5;

/** @returns {Promise<import('../types').Article[]>} */
async function fetch() {
    console.log(`  [${SOURCE_NAME}] 월드뉴스 수집 중...`);
    const url = 'http://feeds.bbci.co.uk/news/world/rss.xml';

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
