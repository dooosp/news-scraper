const assert = require('node:assert');
const { describe, it } = require('node:test');
const { renderNewsItem } = require('../src/templates/email');
const { extractKeywords, generateInsights } = require('../src/templates/ppt');
const { successPage, errorPage } = require('../src/templates/server-responses');

describe('renderNewsItem', () => {
    const article = {
        title: '테스트 뉴스 제목',
        sources: ['네이버', 'BBC'],
        links: [{ source: '네이버', url: 'https://example.com' }],
        summary: '테스트 요약입니다.',
        isHot: false,
        category: 'domestic',
    };

    it('일반 뉴스 아이템 렌더링', () => {
        const html = renderNewsItem(article, '', 1);
        assert.ok(html.includes('1. 테스트 뉴스 제목'));
        assert.ok(html.includes('news-item'));
        assert.ok(!html.includes('hot'));
    });
    it('HOT 뉴스 배지 표시', () => {
        const html = renderNewsItem(article, 'hot');
        assert.ok(html.includes('hot-badge'));
        assert.ok(html.includes('HOT'));
    });
    it('XSS 이스케이프', () => {
        const malicious = { ...article, title: '<script>alert(1)</script>' };
        const html = renderNewsItem(malicious, '', 1);
        assert.ok(!html.includes('<script>'));
        assert.ok(html.includes('&lt;script&gt;'));
    });
});

describe('extractKeywords', () => {
    it('빈도순 키워드 추출', () => {
        const articles = [
            { title: '삼성전자 실적 발표', summary: '삼성전자가 3분기 실적을 발표했다.' },
            { title: '삼성전자 주가 상승', summary: '삼성전자 주가가 상승세를 보이고 있다.' },
        ];
        const keywords = extractKeywords(articles);
        assert.ok(keywords.length > 0);
        assert.strictEqual(keywords[0].word, '삼성전자');
        assert.ok(keywords[0].count >= 2);
    });
    it('빈 배열 처리', () => {
        const keywords = extractKeywords([]);
        assert.strictEqual(keywords.length, 0);
    });
});

describe('generateInsights', () => {
    it('정치 키워드 인사이트', () => {
        const keywords = [{ word: '대통령', count: 5 }];
        const insights = generateInsights([], keywords);
        assert.ok(insights.some(i => i.includes('정치')));
    });
    it('키워드 없으면 기본 메시지', () => {
        const insights = generateInsights([], [{ word: '테스트', count: 1 }]);
        assert.ok(insights.some(i => i.includes('다양한')));
    });
});

describe('server-responses', () => {
    it('성공 페이지 HTML 포함', () => {
        const html = successPage();
        assert.ok(html.includes('이메일 발송 완료'));
        assert.ok(html.includes('<!DOCTYPE html>'));
    });
    it('에러 페이지 HTML 포함', () => {
        const html = errorPage();
        assert.ok(html.includes('발송 실패'));
    });
});
