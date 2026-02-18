const assert = require('node:assert');
const { describe, it } = require('node:test');

// main.js에서 함수 직접 import 불가 → 같은 로직으로 독립 테스트
// 향후 리팩토링 시 별도 모듈로 분리 가능

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

describe('calculateSimilarity', () => {
    it('동일한 제목은 1.0', () => {
        assert.strictEqual(calculateSimilarity('삼성전자 실적 발표', '삼성전자 실적 발표'), 1.0);
    });
    it('유사한 제목은 높은 유사도', () => {
        const sim = calculateSimilarity(
            '삼성전자 3분기 실적 발표',
            '삼성전자 3분기 실적 공개'
        );
        assert.ok(sim >= 0.4, `유사도 ${sim}이 0.4 이상이어야 함`);
    });
    it('다른 제목은 낮은 유사도', () => {
        const sim = calculateSimilarity(
            '삼성전자 실적 발표',
            '미국 대선 결과 확정'
        );
        assert.ok(sim < 0.4, `유사도 ${sim}이 0.4 미만이어야 함`);
    });
    it('빈 문자열은 0', () => {
        assert.strictEqual(calculateSimilarity('', '테스트'), 0);
        assert.strictEqual(calculateSimilarity('테스트', ''), 0);
    });
    it('영문 제목 비교', () => {
        const sim = calculateSimilarity(
            'Apple announces new iPhone release',
            'Apple reveals new iPhone launch date'
        );
        assert.ok(sim >= 0.3, `유사도 ${sim}이 0.3 이상이어야 함`);
    });
});

describe('scoreArticle', () => {
    function scoreArticle(article) {
        let score = 0;
        if (article.isHot) score += 3;
        if (article.category === 'analysis') score += 1;
        if (article.summary && article.summary.length > 30) score += 1;
        score += Math.min(article.sources.length - 1, 2);
        return score;
    }

    it('HOT 기사는 +3점', () => {
        const score = scoreArticle({ isHot: true, category: 'domestic', sources: ['A'], summary: '' });
        assert.strictEqual(score, 3);
    });
    it('분석 카테고리는 +1점', () => {
        const score = scoreArticle({ isHot: false, category: 'analysis', sources: ['A'], summary: '' });
        assert.strictEqual(score, 1);
    });
    it('긴 요약은 +1점', () => {
        const score = scoreArticle({ isHot: false, category: 'domestic', sources: ['A'], summary: 'a'.repeat(31) });
        assert.strictEqual(score, 1);
    });
    it('복수 소스는 최대 +2점', () => {
        const score = scoreArticle({ isHot: false, category: 'domestic', sources: ['A', 'B', 'C', 'D'], summary: '' });
        assert.strictEqual(score, 2);
    });
});
