const cheerio = require('cheerio');
const iconv = require('iconv-lite');
const { httpGet } = require('http-client');
const { truncateSentence } = require('../utils');

const SOURCE_NAME = '네이버';
const CATEGORY = 'domestic';
const MAX_ITEMS = 7;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

/** @returns {Promise<import('../types').Article[]>} */
async function fetch() {
    console.log(`  [${SOURCE_NAME}] 랭킹 뉴스 수집 중...`);
    const url = 'https://news.naver.com/main/ranking/popularDay.naver';

    // arraybuffer for EUC-KR support — native fetch
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const response = await globalThis.fetch(url, {
        headers: { 'User-Agent': UA },
        signal: controller.signal,
    });
    clearTimeout(timer);
    const buffer = Buffer.from(await response.arrayBuffer());

    const contentType = response.headers.get('content-type') || '';
    const isEucKr = contentType.includes('euc-kr') || contentType.includes('EUC-KR');
    const html = isEucKr
        ? iconv.decode(buffer, 'EUC-KR')
        : buffer.toString('utf-8');

    const $ = cheerio.load(html);
    const articles = [];

    $('.rankingnews_box').each((_, box) => {
        if (articles.length >= MAX_ITEMS) return false;
        $(box).find('.rankingnews_list li').each((_, el) => {
            if (articles.length >= MAX_ITEMS) return false;
            const title = $(el).find('.list_title').text().trim();
            const link = $(el).find('a').attr('href');
            if (title && link) {
                articles.push({
                    title,
                    url: link.startsWith('http') ? link : `https://news.naver.com${link}`,
                    summary: '',
                    source: SOURCE_NAME,
                    category: CATEGORY,
                });
            }
        });
    });

    if (articles.length === 0) {
        $('.rankingnews_list li a').each((i, el) => {
            if (i >= MAX_ITEMS) return false;
            const title = $(el).text().trim();
            const link = $(el).attr('href');
            if (title && link) {
                articles.push({
                    title,
                    url: link.startsWith('http') ? link : `https://news.naver.com${link}`,
                    summary: '',
                    source: SOURCE_NAME,
                    category: CATEGORY,
                });
            }
        });
    }

    // meta description 병렬 추출 (요약 보강)
    await Promise.allSettled(articles.map(async (a) => {
        try {
            const html2 = await httpGet(a.url, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                timeout: 5000,
                parseJson: false,
                retries: 1,
                label: 'naver-meta'
            });
            const $2 = cheerio.load(html2);
            const desc = $2('meta[property="og:description"]').attr('content')
                || $2('meta[name="description"]').attr('content') || '';
            if (desc) a.summary = truncateSentence(desc, 200);
        } catch (e) { console.warn(`  [네이버] 요약 추출 실패(${a.title.slice(0, 20)}): ${e.message}`); }
    }));

    console.log(`  [${SOURCE_NAME}] ${articles.length}개 수집 완료`);
    return articles;
}

module.exports = { name: SOURCE_NAME, category: CATEGORY, fetch };
