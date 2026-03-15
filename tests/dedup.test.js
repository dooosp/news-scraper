const assert = require('node:assert');
const { describe, it } = require('node:test');
const { calculateSimilarity } = require('../src/deduper/article-deduper');
const { scoreArticle } = require('../src/ranker/article-ranker');
const { selectTopArticles } = require('../src/selector/article-selector');

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

describe('selectTopArticles', () => {
    it('카테고리 최소 보장 후 나머지를 점수순으로 채운다', () => {
        const selected = selectTopArticles([
            { title: 'A', category: 'domestic', isHot: true, sources: ['A'], summary: '' },
            { title: 'B', category: 'tech', isHot: false, sources: ['A', 'B'], summary: 'x'.repeat(40) },
            { title: 'C', category: 'economy', isHot: false, sources: ['A'], summary: '' },
            { title: 'D', category: 'global', isHot: false, sources: ['A'], summary: '' },
            { title: 'E', category: 'analysis', isHot: false, sources: ['A'], summary: '' },
            { title: 'F', category: 'tech', isHot: true, sources: ['A', 'B'], summary: 'x'.repeat(40) },
        ], 3, { domestic: 1, tech: 1, economy: 0, global: 0, analysis: 0 });

        assert.strictEqual(selected.length, 3);
        assert.strictEqual(selected[0].title, 'A');
        assert.strictEqual(selected[1].title, 'F');
    });
});
