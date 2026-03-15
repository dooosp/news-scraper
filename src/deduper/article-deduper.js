const { SIMILARITY_THRESHOLD } = require('../config');

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

function mergeAndDeduplicate(allArticles, threshold = SIMILARITY_THRESHOLD) {
    const merged = [];

    allArticles.forEach(article => {
        let found = false;
        for (let i = 0; i < merged.length; i++) {
            if (calculateSimilarity(article.title, merged[i].title) >= threshold) {
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

module.exports = {
    calculateSimilarity,
    mergeAndDeduplicate,
};
