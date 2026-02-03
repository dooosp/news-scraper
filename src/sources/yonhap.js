const Parser = require('rss-parser');
const { truncateSentence } = require('../utils');
const rssParser = new Parser({ timeout: 10000 });

const SOURCE_NAME = '연합뉴스';
const CATEGORY = 'domestic';
const MAX_ITEMS = 7;
const FALLBACK_NAME = 'SBS';
const FALLBACK_URL = 'https://news.sbs.co.kr/news/SectionRssFeed.do?sectionId=01&plink=RSSREADER';

/** @returns {Promise<import('../types').Article[]>} */
async function fetch() {
    try {
        console.log(`  [${SOURCE_NAME}] 주요 뉴스 수집 중...`);
        const url = 'https://www.yonhapnewstv.co.kr/browse/feed/';
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
    } catch (error) {
        console.error(`  [${SOURCE_NAME}] 수집 실패: ${error.message}`);
        console.log(`  [${FALLBACK_NAME}] 대체 소스로 수집 중...`);

        const feed = await rssParser.parseURL(FALLBACK_URL);
        const articles = feed.items.slice(0, MAX_ITEMS).map(item => ({
            title: item.title || '',
            url: item.link || '',
            summary: item.contentSnippet ? truncateSentence(item.contentSnippet, 200) : '',
            source: FALLBACK_NAME,
            category: CATEGORY,
        }));

        console.log(`  [${FALLBACK_NAME}] ${articles.length}개 수집 완료`);
        return articles;
    }
}

module.exports = { name: SOURCE_NAME, category: CATEGORY, fetch };
