const Parser = require('rss-parser');
const rssParser = new Parser();

const SOURCE_NAME = '시사IN';
const CATEGORY = 'analysis';
const MAX_ITEMS = 5;
const FALLBACK_NAME = '프레시안';
const FALLBACK_URL = 'https://www.pressian.com/rss/section/news';

/** @returns {Promise<import('../types').Article[]>} */
async function fetch() {
    try {
        console.log(`  [${SOURCE_NAME}] 분석기사 수집 중...`);
        const url = 'https://www.sisain.co.kr/rss/allArticle.xml';
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
    } catch (error) {
        console.error(`  [${SOURCE_NAME}] 수집 실패: ${error.message}`);
        console.log(`  [${FALLBACK_NAME}] 대체 소스로 수집 중...`);

        const feed = await rssParser.parseURL(FALLBACK_URL);
        const articles = feed.items.slice(0, MAX_ITEMS).map(item => ({
            title: item.title || '',
            url: item.link || '',
            summary: item.contentSnippet ? item.contentSnippet.substring(0, 200) : '',
            source: FALLBACK_NAME,
            category: CATEGORY,
        }));

        console.log(`  [${FALLBACK_NAME}] ${articles.length}개 수집 완료`);
        return articles;
    }
}

module.exports = { name: SOURCE_NAME, category: CATEGORY, fetch };
