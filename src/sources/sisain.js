const Parser = require('rss-parser');
const axios = require('axios');
const { truncateSentence } = require('../utils');
const rssParser = new Parser({ timeout: 10000 });

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

        const candidates = feed.items.slice(0, MAX_ITEMS).map(item => ({
            title: item.title || '',
            url: item.link || '',
            summary: item.contentSnippet ? truncateSentence(item.contentSnippet, 200) : '',
            source: SOURCE_NAME,
            category: CATEGORY,
        }));

        const articles = await filterValidLinks(candidates, SOURCE_NAME);
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

async function filterValidLinks(articles, label) {
    const results = await Promise.allSettled(
        articles.map(a =>
            axios.head(a.url, { timeout: 3000, maxRedirects: 3 })
                .then(() => a)
                .catch(() => null)
        )
    );
    const valid = results
        .map(r => r.status === 'fulfilled' ? r.value : null)
        .filter(Boolean);
    const dropped = articles.length - valid.length;
    if (dropped > 0) console.log(`  [${label}] ${dropped}개 링크 404/무효 → 제외`);
    return valid;
}

module.exports = { name: SOURCE_NAME, category: CATEGORY, fetch };
