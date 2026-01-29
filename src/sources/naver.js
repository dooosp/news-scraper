const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');

const SOURCE_NAME = '네이버';
const CATEGORY = 'domestic';
const MAX_ITEMS = 7;

/** @returns {Promise<import('../types').Article[]>} */
async function fetch() {
    console.log(`  [${SOURCE_NAME}] 랭킹 뉴스 수집 중...`);
    const url = 'https://news.naver.com/main/ranking/popularDay.naver';

    const response = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        timeout: 10000,
        responseType: 'arraybuffer',
    });

    const contentType = response.headers['content-type'] || '';
    const isEucKr = contentType.includes('euc-kr') || contentType.includes('EUC-KR');
    const html = isEucKr
        ? iconv.decode(Buffer.from(response.data), 'EUC-KR')
        : Buffer.from(response.data).toString('utf-8');

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

    console.log(`  [${SOURCE_NAME}] ${articles.length}개 수집 완료`);
    return articles;
}

module.exports = { name: SOURCE_NAME, category: CATEGORY, fetch };
