const { loadEnv } = require('../../lib/shared/config-loader');
loadEnv({ name: 'news-scraper' });
const { sources } = require('../sources');
const antiEcho = require('../../lib/anti-echo-chamber');
const { MAX_TOTAL } = require('../config');
const { mergeAndDeduplicate } = require('../deduper/article-deduper');
const { selectTopArticles } = require('../selector/article-selector');
const { saveLatestDigest, saveMarkdown } = require('../publisher/file-publisher');

async function runDigest(options = {}) {
    const { sendMail = true, useLLM = true } = options;

    console.log('\n📰 멀티소스 뉴스 수집 시작...\n');

    const settled = await Promise.allSettled(sources.map(s => s.fetch()));

    const allArticles = [];
    const failures = [];
    settled.forEach((result, i) => {
        if (result.status === 'fulfilled') {
            allArticles.push(...result.value);
        } else {
            console.error(`  [${sources[i].name}] 수집 실패: ${result.reason?.message}`);
            failures.push({ source: sources[i].name, error: result.reason?.message || 'unknown' });
        }
    });

    if (allArticles.length === 0) {
        console.error('❌ 전체 소스 수집 실패!');
        throw new Error('전체 소스 수집 실패');
    }

    const activeSources = [...new Set(allArticles.map(a => a.source))];
    if (failures.length > 0) {
        console.warn(`⚠️ ${failures.length}개 소스 실패: ${failures.map(f => f.source).join(', ')}`);
    }

    console.log(`\n📊 총 ${allArticles.length}개 뉴스 수집 (소스: ${activeSources.join(', ')})`);

    const merged = mergeAndDeduplicate(allArticles);
    console.log(`📋 병합 후: ${merged.length}개`);

    const articles = selectTopArticles(merged, MAX_TOTAL);
    const hotCount = articles.filter(a => a.isHot).length;
    console.log(`🔥 HOT: ${hotCount}개 | 📋 최종 선별: ${articles.length}개 (상위 ${MAX_TOTAL}개)\n`);

    if (useLLM) {
        try {
            console.log('🎭 반대 관점 생성 중...');
            const perspectives = await antiEcho.generateBatch(articles, { maxItems: 3 });
            perspectives.forEach(p => {
                const match = articles.find(a => a.title === p.originalTitle);
                if (match) match.counterView = p;
            });
            console.log(`✅ ${perspectives.length}개 반대 관점 생성 완료`);
        } catch (err) {
            console.log(`⚠️ 반대 관점 생성 실패 (무시): ${err.message}`);
        }
    }

    const now = new Date();
    const digest = {
        date: now.toISOString(),
        dateDisplay: now.toLocaleDateString('ko-KR', {
            year: 'numeric', month: 'long', day: 'numeric',
            weekday: 'long', timeZone: 'Asia/Seoul',
        }),
        articles,
        activeSources,
        failures,
    };

    saveLatestDigest(digest);
    runDigest._latestDigest = digest;

    saveMarkdown(digest);
    const { saveResult, sendNewsEmail } = require('../services');
    await saveResult(digest);

    if (sendMail) {
        await sendNewsEmail(digest);
    }

    console.log('✅ 완료!');
    return digest;
}

module.exports = { runDigest };
