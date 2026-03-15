const { CATEGORY_MIN } = require('../config');
const { scoreArticle } = require('../ranker/article-ranker');

function selectTopArticles(articles, maxTotal, categoryMin = CATEGORY_MIN) {
    const selected = [];
    const pool = articles.map(a => ({ ...a, _score: scoreArticle(a) }));

    for (const [cat, min] of Object.entries(categoryMin)) {
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

    return selected.map(({ _score, ...rest }) => rest);
}

module.exports = { selectTopArticles };
