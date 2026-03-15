const { truncateSentence } = require('../utils');

function cleanGoogleNewsTitle(title) {
    return title ? title.replace(/ - .*$/, '').trim() : '';
}

function normalizeNewsFeedItem(item, { source, category, summaryMaxLength = 200, titleTransform } = {}) {
    const rawTitle = item.title || '';
    const title = typeof titleTransform === 'function' ? titleTransform(rawTitle) : rawTitle;

    return {
        title,
        url: item.link || '',
        summary: item.contentSnippet ? truncateSentence(item.contentSnippet, summaryMaxLength) : '',
        source,
        category,
    };
}

module.exports = {
    cleanGoogleNewsTitle,
    normalizeNewsFeedItem,
};
