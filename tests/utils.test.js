const assert = require('node:assert');
const { describe, it } = require('node:test');
const { escapeHtml, truncateSentence, formatSources, normalizeSource } = require('../src/utils');

describe('escapeHtml', () => {
    it('이스케이프 처리', () => {
        assert.strictEqual(escapeHtml('<script>alert("xss")</script>'),
            '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });
    it('빈 문자열 처리', () => {
        assert.strictEqual(escapeHtml(''), '');
        assert.strictEqual(escapeHtml(null), '');
        assert.strictEqual(escapeHtml(undefined), '');
    });
});

describe('truncateSentence', () => {
    it('짧은 텍스트는 그대로 반환', () => {
        assert.strictEqual(truncateSentence('안녕하세요', 100), '안녕하세요');
    });
    it('빈 값 처리', () => {
        assert.strictEqual(truncateSentence('', 100), '');
        assert.strictEqual(truncateSentence(null, 100), '');
    });
    it('문장 단위로 절단', () => {
        const text = '첫 번째 문장입니다. 두 번째 문장입니다. 세 번째 문장입니다.';
        const result = truncateSentence(text, 25);
        assert.ok(result.endsWith('.') || result.endsWith('…'));
    });
    it('절단 지점이 없으면 말줄임표 추가', () => {
        const text = '가나다라마바사아자차카타파하가나다라마바사아자차카타파하';
        const result = truncateSentence(text, 10);
        assert.ok(result.endsWith('…'));
        assert.ok(result.length <= 11);
    });
});

describe('formatSources / normalizeSource', () => {
    it('소스명 정규화', () => {
        assert.strictEqual(normalizeSource('네이버'), '네이버뉴스');
        assert.strictEqual(normalizeSource('AP'), 'AP통신');
        assert.strictEqual(normalizeSource('알 수 없는'), '알 수 없는');
    });
    it('포맷팅', () => {
        const result = formatSources(['네이버', 'BBC']);
        assert.strictEqual(result, '네이버뉴스 · BBC');
    });
});
