const axios = require('axios');
const cheerio = require('cheerio');
const Parser = require('rss-parser');
const iconv = require('iconv-lite');
const fs = require('fs');
const path = require('path');
const { createPresentation } = require('./create-ppt');

const rssParser = new Parser();

// ===== 소스별 뉴스 수집 함수 =====

// 1. 네이버 랭킹 뉴스 (가장 많이 본 뉴스)
async function fetchNaverNews() {
    try {
        console.log('  [네이버] 랭킹 뉴스 수집 중...');
        const url = 'https://news.naver.com/main/ranking/popularDay.naver';

        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000,
            responseType: 'arraybuffer'
        });

        // EUC-KR에서 UTF-8로 변환
        const html = iconv.decode(Buffer.from(response.data), 'EUC-KR');
        const $ = cheerio.load(html);
        const headlines = [];

        $('.rankingnews_box').each((boxIndex, box) => {
            if (headlines.length >= 7) return false;

            $(box).find('.rankingnews_list li').each((index, element) => {
                if (headlines.length >= 7) return false;

                const title = $(element).find('.list_title').text().trim();
                const link = $(element).find('a').attr('href');

                if (title && link) {
                    headlines.push({
                        title: title,
                        link: link.startsWith('http') ? link : `https://news.naver.com${link}`,
                        summary: '',
                        source: '네이버'
                    });
                }
            });
        });

        if (headlines.length === 0) {
            $('.rankingnews_list li a').each((index, element) => {
                if (index >= 7) return false;

                const title = $(element).text().trim();
                const link = $(element).attr('href');

                if (title && link) {
                    headlines.push({
                        title: title,
                        link: link.startsWith('http') ? link : `https://news.naver.com${link}`,
                        summary: '',
                        source: '네이버'
                    });
                }
            });
        }

        console.log(`  [네이버] ${headlines.length}개 수집 완료`);
        return headlines;
    } catch (error) {
        console.error(`  [네이버] 수집 실패: ${error.message}`);
        return [];
    }
}

// 2. 구글 뉴스 탑 스토리 (전체 분야)
async function fetchGoogleNews() {
    try {
        console.log('  [구글] 탑 뉴스 수집 중...');
        const url = 'https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko';

        const feed = await rssParser.parseURL(url);
        const headlines = [];

        feed.items.slice(0, 7).forEach(item => {
            headlines.push({
                title: item.title ? item.title.replace(/ - .*$/, '').trim() : '',
                link: item.link || '',
                summary: item.contentSnippet || '',
                source: '구글뉴스'
            });
        });

        console.log(`  [구글] ${headlines.length}개 수집 완료`);
        return headlines;
    } catch (error) {
        console.error(`  [구글] 수집 실패: ${error.message}`);
        return [];
    }
}

// 3. 연합뉴스 (종합 뉴스)
async function fetchYonhapNews() {
    try {
        console.log('  [연합뉴스] 주요 뉴스 수집 중...');
        const url = 'https://www.yonhapnewstv.co.kr/browse/feed/';

        const feed = await rssParser.parseURL(url);
        const headlines = [];

        feed.items.slice(0, 7).forEach(item => {
            headlines.push({
                title: item.title || '',
                link: item.link || '',
                summary: item.contentSnippet ? item.contentSnippet.substring(0, 200) : '',
                source: '연합뉴스'
            });
        });

        console.log(`  [연합뉴스] ${headlines.length}개 수집 완료`);
        return headlines;
    } catch (error) {
        console.error(`  [연합뉴스] 수집 실패: ${error.message}`);
        try {
            console.log('  [SBS] 대체 소스로 수집 중...');
            const sbsUrl = 'https://news.sbs.co.kr/news/SectionRssFeed.do?sectionId=01&plink=RSSREADER';
            const feed = await rssParser.parseURL(sbsUrl);
            const headlines = [];

            feed.items.slice(0, 7).forEach(item => {
                headlines.push({
                    title: item.title || '',
                    link: item.link || '',
                    summary: item.contentSnippet ? item.contentSnippet.substring(0, 200) : '',
                    source: 'SBS'
                });
            });

            console.log(`  [SBS] ${headlines.length}개 수집 완료`);
            return headlines;
        } catch (e) {
            console.error(`  [SBS] 수집 실패: ${e.message}`);
            return [];
        }
    }
}

// ===== 중복 검사 및 병합 로직 =====

function calculateSimilarity(title1, title2) {
    const normalize = (str) => str.toLowerCase()
        .replace(/[^\w\sㄱ-ㅎㅏ-ㅣ가-힣]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 1);

    const words1 = normalize(title1);
    const words2 = normalize(title2);

    if (words1.length === 0 || words2.length === 0) return 0;

    const commonWords = words1.filter(w => words2.includes(w));
    const similarity = (commonWords.length * 2) / (words1.length + words2.length);

    return similarity;
}

function mergeAndDeduplicate(allNews) {
    const merged = [];
    const SIMILARITY_THRESHOLD = 0.4;

    allNews.forEach(news => {
        let found = false;

        for (let i = 0; i < merged.length; i++) {
            const similarity = calculateSimilarity(news.title, merged[i].title);

            if (similarity >= SIMILARITY_THRESHOLD) {
                if (!merged[i].sources.includes(news.source)) {
                    merged[i].sources.push(news.source);
                }
                if (news.summary && news.summary.length > (merged[i].summary || '').length) {
                    merged[i].summary = news.summary;
                }
                if (news.link && !merged[i].links.some(l => l.source === news.source)) {
                    merged[i].links.push({ source: news.source, url: news.link });
                }
                found = true;
                break;
            }
        }

        if (!found) {
            merged.push({
                title: news.title,
                summary: news.summary || '',
                sources: [news.source],
                links: news.link ? [{ source: news.source, url: news.link }] : [],
                isHot: false
            });
        }
    });

    merged.forEach(news => {
        if (news.sources.length >= 2) {
            news.isHot = true;
        }
    });

    merged.sort((a, b) => {
        if (a.isHot && !b.isHot) return -1;
        if (!a.isHot && b.isHot) return 1;
        return b.sources.length - a.sources.length;
    });

    return merged;
}

// ===== 메인 수집 함수 =====

async function fetchNaverITNews() {
    console.log('\n📰 멀티소스 인기 뉴스 수집 시작...\n');

    const [naverNews, googleNews, yonhapNews] = await Promise.all([
        fetchNaverNews(),
        fetchGoogleNews(),
        fetchYonhapNews()
    ]);

    const allNews = [...naverNews, ...googleNews, ...yonhapNews];
    console.log(`\n📊 총 ${allNews.length}개 뉴스 수집 완료`);

    const mergedNews = mergeAndDeduplicate(allNews);

    const hotCount = mergedNews.filter(n => n.isHot).length;
    console.log(`🔥 HOT 뉴스: ${hotCount}개`);
    console.log(`📋 최종 뉴스: ${mergedNews.length}개\n`);

    return mergedNews;
}

// ===== 파일 저장 =====

async function saveNewsAndCreatePPT(headlines, baseDir) {
    try {
        const archiveDir = path.join(baseDir, 'archive');
        if (!fs.existsSync(archiveDir)) {
            fs.mkdirSync(archiveDir, { recursive: true });
        }

        const today = new Date();
        const dateString = today.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        });

        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const dateFormat = `${year}-${month}-${day}`;

        let markdown = `# 오늘의 인기 뉴스\n\n`;
        markdown += `**날짜:** ${dateString}\n\n`;
        markdown += `**수집 소스:** 네이버 랭킹, 구글 뉴스, 연합뉴스\n\n`;
        markdown += `---\n\n`;

        headlines.forEach((headline, index) => {
            const hotTag = headline.isHot ? '🔥 **[HOT]** ' : '';
            markdown += `## ${index + 1}. ${hotTag}${headline.title}\n\n`;
            markdown += `**출처:** ${headline.sources.join(', ')}\n\n`;

            if (headline.summary) {
                markdown += `**요약:** ${headline.summary}\n\n`;
            }

            if (headline.links && headline.links.length > 0) {
                markdown += `**링크:**\n`;
                headline.links.forEach(link => {
                    markdown += `- [${link.source}](${link.url})\n`;
                });
                markdown += '\n';
            }

            markdown += `---\n\n`;
        });

        const archiveFilePath = path.join(archiveDir, `news_${dateFormat}.md`);
        fs.writeFileSync(archiveFilePath, markdown, 'utf8');
        console.log(`✓ 아카이브 저장: ${archiveFilePath}`);

        const todayFilePath = '/home/taeho/today_news.md';
        fs.writeFileSync(todayFilePath, markdown, 'utf8');
        console.log(`✓ 최신 파일 저장: ${todayFilePath}`);

        console.log('\n📊 PPT 생성 중...');
        const pptFileName = `News_Report_${dateFormat}.pptx`;
        const pptFilePath = path.join(archiveDir, pptFileName);
        await createPresentation(headlines, pptFilePath);
        console.log(`✓ PPT 저장: ${pptFilePath}`);

        return {
            mdFile: `archive/news_${dateFormat}.md`,
            pptFile: `archive/${pptFileName}`,
            dateFormat: dateFormat
        };

    } catch (error) {
        console.error('파일 저장 오류:', error.message);
        throw error;
    }
}

module.exports = {
    fetchNaverITNews,
    saveNewsAndCreatePPT
};
