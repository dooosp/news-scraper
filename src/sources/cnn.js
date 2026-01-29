const Parser = require('rss-parser');
const rssParser = new Parser();

const SOURCE_NAME = 'CNN';
const CATEGORY = 'global';
const MAX_ITEMS = 5;

/** @returns {Promise<import('../types').Article[]>} */
async function fetch() {
    console.log(`  [${SOURCE_NAME}] 월드뉴스 수집 중...`);
    const url = 'http://rss.cnn.com/rss/edition_world.rss';

    const feed = await rssParser.parseURL(url);
    const articles = feed.items.slice(0, MAX_ITEMS).map(item => ({
        title: item.title || '',
        url: item.link || '',
        summary: item.contentSnippet ? item.contentSnippet.substring(0, 200) : '',
        source: SOURCE_NAME,
        category: CATEGORY,
    }));

    console.log(`  [${SOURCE_NAME}] ${articles.length}개 수집 완료`);
    return articles;
}

module.exports = { name: SOURCE_NAME, category: CATEGORY, fetch };
