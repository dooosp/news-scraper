function scoreArticle(article) {
    let score = 0;
    if (article.isHot) score += 3;
    if (article.category === 'analysis') score += 1;
    if (article.summary && article.summary.length > 30) score += 1;
    score += Math.min(article.sources.length - 1, 2);
    return score;
}

module.exports = { scoreArticle };
