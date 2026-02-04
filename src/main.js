require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { sources } = require('./sources');
const { formatSources, normalizeSource } = require('./utils');
const antiEcho = require('../lib/anti-echo-chamber');
const { ARCHIVE_DIR, TODAY_NEWS_PATH, SIMILARITY_THRESHOLD, MAX_TOTAL, CATEGORY_MIN } = require('./config');

// ===== 중복 제거 =====

function calculateSimilarity(title1, title2) {
    const normalize = (str) => str.toLowerCase()
        .replace(/[^\w\sㄱ-ㅎㅏ-ㅣ가-힣]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 1);
    const words1 = normalize(title1);
    const words2 = normalize(title2);
    if (words1.length === 0 || words2.length === 0) return 0;
    const common = words1.filter(w => words2.includes(w));
    return (common.length * 2) / (words1.length + words2.length);
}

function mergeAndDeduplicate(allArticles) {
    const merged = [];

    allArticles.forEach(article => {
        let found = false;
        for (let i = 0; i < merged.length; i++) {
            if (calculateSimilarity(article.title, merged[i].title) >= SIMILARITY_THRESHOLD) {
                if (!merged[i].sources.includes(article.source)) {
                    merged[i].sources.push(article.source);
                }
                if (article.summary && article.summary.length > (merged[i].summary || '').length) {
                    merged[i].summary = article.summary;
                }
                if (article.url && !merged[i].links.some(l => l.source === article.source)) {
                    merged[i].links.push({ source: article.source, url: article.url });
                }
                found = true;
                break;
            }
        }

        if (!found) {
            merged.push({
                title: article.title,
                summary: article.summary || '',
                sources: [article.source],
                links: article.url ? [{ source: article.source, url: article.url }] : [],
                category: article.category || 'domestic',
                isHot: false,
                counterView: null,
            });
        }
    });

    merged.forEach(m => { m.isHot = m.sources.length >= 2; });
    merged.sort((a, b) => {
        if (a.isHot && !b.isHot) return -1;
        if (!a.isHot && b.isHot) return 1;
        return b.sources.length - a.sources.length;
    });

    return merged;
}

// ===== 스코어링 & 선별 =====

function scoreArticle(article) {
    let score = 0;
    if (article.isHot) score += 3;
    if (article.category === 'analysis') score += 1;
    if (article.summary && article.summary.length > 30) score += 1;
    score += Math.min(article.sources.length - 1, 2);
    return score;
}

function selectTopArticles(articles, maxTotal) {
    // 카테고리별 최소 보장 후 나머지 점수순 충원
    const selected = [];
    const pool = articles.map(a => ({ ...a, _score: scoreArticle(a) }));

    for (const [cat, min] of Object.entries(CATEGORY_MIN)) {
        const catItems = pool
            .filter(a => a.category === cat && !selected.includes(a))
            .sort((a, b) => b._score - a._score)
            .slice(0, min);
        selected.push(...catItems);
    }

    const remaining = pool
        .filter(a => !selected.includes(a))
        .sort((a, b) => b._score - a._score);
    const slotsLeft = maxTotal - selected.length;
    if (slotsLeft > 0) selected.push(...remaining.slice(0, slotsLeft));

    // _score 제거 후 반환
    return selected.map(({ _score, ...rest }) => rest);
}

// ===== 파이프라인 =====

/**
 * @param {Object} options
 * @param {boolean} [options.sendMail=true]
 * @param {boolean} [options.useLLM=true]
 * @returns {Promise<import('./types').Digest>}
 */
async function runDigest(options = {}) {
    const { sendMail = true, useLLM = true } = options;

    console.log('\n📰 멀티소스 뉴스 수집 시작...\n');

    // 1. 수집 (병렬, 부분 실패 허용)
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

    // 2. 중복 제거 + 병합
    const merged = mergeAndDeduplicate(allArticles);
    console.log(`📋 병합 후: ${merged.length}개`);

    // 3. 스코어링 + 선별 (MAX_TOTAL 제한)
    const articles = selectTopArticles(merged, MAX_TOTAL);
    const hotCount = articles.filter(a => a.isHot).length;
    console.log(`🔥 HOT: ${hotCount}개 | 📋 최종 선별: ${articles.length}개 (상위 ${MAX_TOTAL}개)\n`);

    // 4. Anti-Echo-Chamber (선택)
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

    // 5. 다이제스트 구성
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

    // 5b. JSON 저장 + 메모리 캐시 (intelligence-loop용)
    const digestJsonPath = path.join(ARCHIVE_DIR, 'latest-digest.json');
    fs.writeFileSync(digestJsonPath, JSON.stringify(digest, null, 2), 'utf8');
    console.log(`✓ 다이제스트 JSON 저장: ${digestJsonPath}`);
    runDigest._latestDigest = digest;

    // 6. 저장 (마크다운 + PPT)
    saveMarkdown(digest);
    const { saveResult, sendNewsEmail } = require('./services');
    await saveResult(digest);

    // 7. 이메일 발송 (옵션)
    if (sendMail) {
        await sendNewsEmail(digest);
    }

    console.log('✅ 완료!');
    return digest;
}

// ===== 임시 마크다운 저장 (1단계에서 templates.js로 이동) =====

function saveMarkdown(digest) {
    if (!fs.existsSync(ARCHIVE_DIR)) fs.mkdirSync(ARCHIVE_DIR, { recursive: true });

    const dateFormat = digest.date.slice(0, 10);
    let md = `# 오늘의 인기 뉴스\n\n`;
    md += `**날짜:** ${digest.dateDisplay}\n\n`;
    md += `**수집 소스:** ${formatSources(digest.activeSources)}\n\n---\n\n`;

    digest.articles.forEach((a, i) => {
        const hot = a.isHot ? '🔥 **[HOT]** ' : '';
        md += `## ${i + 1}. ${hot}${a.title}\n\n`;
        md += `**출처:** ${formatSources(a.sources)}\n\n`;
        if (a.summary) md += `**요약:** ${a.summary}\n\n`;
        if (a.links.length > 0) {
            md += `**링크:**\n`;
            a.links.forEach(l => { md += `- [${normalizeSource(l.source)}](${l.url})\n`; });
            md += '\n';
        }
        md += `---\n\n`;
    });

    const archivePath = path.join(ARCHIVE_DIR, `news_${dateFormat}.md`);
    fs.writeFileSync(archivePath, md, 'utf8');
    console.log(`✓ 아카이브 저장: ${archivePath}`);

    fs.writeFileSync(TODAY_NEWS_PATH, md, 'utf8');
    console.log(`✓ 최신 파일 저장: ${TODAY_NEWS_PATH}`);
}

// ===== CLI 실행 =====

if (require.main === module) {
    const args = process.argv.slice(2);
    const sendMail = !args.includes('--no-mail');
    const useLLM = !args.includes('--no-llm');

    runDigest({ sendMail, useLLM }).catch(err => {
        console.error('\n❌ 작업 실패:', err.message);
        process.exit(1);
    });
}

module.exports = { runDigest };
