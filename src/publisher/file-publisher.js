const fs = require('fs');
const path = require('path');
const { ARCHIVE_DIR, TODAY_NEWS_PATH } = require('../config');
const { formatSources, normalizeSource } = require('../utils');

function ensureArchiveDir(archiveDir = ARCHIVE_DIR) {
    if (!fs.existsSync(archiveDir)) {
        fs.mkdirSync(archiveDir, { recursive: true });
    }
}

function saveMarkdown(digest, options = {}) {
    const archiveDir = options.archiveDir || ARCHIVE_DIR;
    const todayNewsPath = options.todayNewsPath || TODAY_NEWS_PATH;

    ensureArchiveDir(archiveDir);

    const dateFormat = digest.date.slice(0, 10);
    let md = '# 오늘의 인기 뉴스\n\n';
    md += `**날짜:** ${digest.dateDisplay}\n\n`;
    md += `**수집 소스:** ${formatSources(digest.activeSources)}\n\n---\n\n`;

    digest.articles.forEach((article, index) => {
        const hot = article.isHot ? '🔥 **[HOT]** ' : '';
        md += `## ${index + 1}. ${hot}${article.title}\n\n`;
        md += `**출처:** ${formatSources(article.sources)}\n\n`;
        if (article.summary) md += `**요약:** ${article.summary}\n\n`;
        if (article.links.length > 0) {
            md += '**링크:**\n';
            article.links.forEach(link => {
                md += `- [${normalizeSource(link.source)}](${link.url})\n`;
            });
            md += '\n';
        }
        md += '---\n\n';
    });

    const archivePath = path.join(archiveDir, `news_${dateFormat}.md`);
    fs.writeFileSync(archivePath, md, 'utf8');
    console.log(`✓ 아카이브 저장: ${archivePath}`);

    const digestDatePath = path.join(archiveDir, `digest_${dateFormat}.json`);
    fs.writeFileSync(digestDatePath, JSON.stringify(digest, null, 2), 'utf8');
    console.log(`✓ 날짜별 다이제스트 JSON: ${digestDatePath}`);

    fs.writeFileSync(todayNewsPath, md, 'utf8');
    console.log(`✓ 최신 파일 저장: ${todayNewsPath}`);
}

function saveLatestDigest(digest, options = {}) {
    const archiveDir = options.archiveDir || ARCHIVE_DIR;

    ensureArchiveDir(archiveDir);

    const digestJsonPath = path.join(archiveDir, 'latest-digest.json');
    fs.writeFileSync(digestJsonPath, JSON.stringify(digest, null, 2), 'utf8');
    console.log(`✓ 다이제스트 JSON 저장: ${digestJsonPath}`);
}

module.exports = {
    ensureArchiveDir,
    saveMarkdown,
    saveLatestDigest,
};
