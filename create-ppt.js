const PptxGenJS = require('pptxgenjs');
const path = require('path');

// 키워드 추출 함수 (간단한 빈도 분석)
function extractKeywords(headlines) {
    const stopWords = ['은', '는', '이', '가', '을', '를', '의', '에', '에서', '와', '과', '로', '으로',
                       '도', '만', '까지', '부터', '한', '및', '등', '더', '약', '등', '위해', '통해',
                       '대한', '위한', '따른', '통한', '년', '월', '일', '때', '것', '수', '개', '명'];

    const wordCount = {};

    headlines.forEach(headline => {
        const text = headline.title + ' ' + (headline.summary || '');
        const words = text.match(/[가-힣]+|[a-zA-Z]+|[0-9]+/g) || [];

        words.forEach(word => {
            if (word.length >= 2 && !stopWords.includes(word)) {
                wordCount[word] = (wordCount[word] || 0) + 1;
            }
        });
    });

    const sorted = Object.entries(wordCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);

    return sorted.map(([word, count]) => ({ word, count }));
}

// 트렌드 인사이트 생성 함수
function generateInsights(headlines, keywords) {
    const insights = [];
    const keywordTexts = keywords.map(k => k.word);

    if (keywordTexts.some(k => ['대통령', '정부', '국회', '장관', '총리', '여당', '야당'].includes(k))) {
        insights.push('정치: 정치권의 주요 이슈가 뉴스의 중심에 있습니다.');
    }

    if (keywordTexts.some(k => ['경제', '주식', '코스피', '환율', '금리', '부동산', '투자'].includes(k))) {
        insights.push('경제: 경제 동향과 시장 변화가 주목받고 있습니다.');
    }

    if (keywordTexts.some(k => ['AI', '인공지능', '기술', '삼성', '애플', 'IT'].includes(k))) {
        insights.push('기술: IT와 기술 분야의 혁신이 이어지고 있습니다.');
    }

    if (keywordTexts.some(k => ['사건', '사고', '검찰', '경찰', '재판', '수사'].includes(k))) {
        insights.push('사회: 주요 사건과 사회 이슈가 보도되고 있습니다.');
    }

    if (keywordTexts.some(k => ['북한', '미국', '중국', '일본', '외교', '안보'].includes(k))) {
        insights.push('국제: 외교와 국제 정세가 관심을 받고 있습니다.');
    }

    if (insights.length === 0) {
        insights.push('다양한 분야에서 주요 뉴스가 보도되고 있습니다.');
    }

    // HOT 뉴스 수 기반 인사이트
    const hotCount = headlines.filter(h => h.isHot).length;
    if (hotCount > 0) {
        insights.push(`오늘 ${hotCount}개의 뉴스가 여러 매체에서 동시에 보도되었습니다.`);
    }

    return insights;
}

// PPT 생성 함수
function createPresentation(headlines, outputPath) {
    const pptx = new PptxGenJS();

    pptx.author = 'News Scraper';
    pptx.company = 'News Analysis';
    pptx.subject = 'Daily News Report';
    pptx.title = '오늘의 인기 뉴스 리포트';

    const today = new Date();
    const dateString = today.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
    });

    const keywords = extractKeywords(headlines);
    const insights = generateInsights(headlines, keywords);

    // HOT 뉴스와 일반 뉴스 분리
    const hotNews = headlines.filter(h => h.isHot);
    const regularNews = headlines.filter(h => !h.isHot);

    // ===== 슬라이드 1: 제목 =====
    let slide1 = pptx.addSlide();
    slide1.background = { color: '0078D4' };

    slide1.addText('오늘의 인기 뉴스', {
        x: 0.5, y: 1.8, w: 9, h: 1.5,
        fontSize: 44, bold: true, color: 'FFFFFF', align: 'center'
    });

    slide1.addText('멀티소스 인기 뉴스 리포트', {
        x: 0.5, y: 3.3, w: 9, h: 0.5,
        fontSize: 20, color: 'E0E0E0', align: 'center'
    });

    slide1.addText(dateString, {
        x: 0.5, y: 4.0, w: 9, h: 0.5,
        fontSize: 24, color: 'FFFFFF', align: 'center'
    });

    // 소스 표시
    slide1.addText('네이버 랭킹 | 구글 뉴스 | 연합뉴스', {
        x: 0.5, y: 4.8, w: 9, h: 0.3,
        fontSize: 14, color: 'B0B0B0', align: 'center', italic: true
    });

    // ===== 슬라이드 2: HOT 뉴스 (있을 경우) =====
    if (hotNews.length > 0) {
        let slideHot = pptx.addSlide();
        slideHot.background = { color: 'FFF5F5' };

        slideHot.addText('HOT NEWS', {
            x: 0.5, y: 0.3, w: 9, h: 0.7,
            fontSize: 36, bold: true, color: 'D32F2F'
        });

        slideHot.addText('여러 매체에서 동시에 보도된 주요 뉴스', {
            x: 0.5, y: 0.9, w: 9, h: 0.4,
            fontSize: 14, color: '666666', italic: true
        });

        let yPos = 1.5;
        hotNews.slice(0, 4).forEach((headline, index) => {
            // HOT 배지 + 제목
            slideHot.addText(`${index + 1}. ${headline.title}`, {
                x: 0.5, y: yPos, w: 9, h: 0.5,
                fontSize: 16, bold: true, color: '333333'
            });

            // 출처 표시
            const sourcesText = `출처: ${headline.sources.join(', ')}`;
            slideHot.addText(sourcesText, {
                x: 0.8, y: yPos + 0.45, w: 8.7, h: 0.3,
                fontSize: 11, color: 'D32F2F', bold: true
            });

            // 요약
            if (headline.summary) {
                const summary = headline.summary.length > 80
                    ? headline.summary.substring(0, 80) + '...'
                    : headline.summary;
                slideHot.addText(summary, {
                    x: 0.8, y: yPos + 0.75, w: 8.7, h: 0.35,
                    fontSize: 10, color: '666666', italic: true
                });
                yPos += 1.3;
            } else {
                yPos += 1.0;
            }
        });
    }

    // ===== 슬라이드 3: 전체 뉴스 목록 =====
    let slide2 = pptx.addSlide();
    slide2.addText('오늘의 IT 뉴스', {
        x: 0.5, y: 0.3, w: 9, h: 0.6,
        fontSize: 32, bold: true, color: '0078D4'
    });

    let yPos = 1.1;
    const displayNews = headlines.slice(0, 6); // 최대 6개 표시

    displayNews.forEach((headline, index) => {
        const hotBadge = headline.isHot ? '[HOT] ' : '';
        const titleColor = headline.isHot ? 'D32F2F' : '333333';

        // 제목
        slide2.addText(`${index + 1}. ${hotBadge}${headline.title}`, {
            x: 0.5, y: yPos, w: 9, h: 0.4,
            fontSize: 13, bold: true, color: titleColor
        });

        // 출처
        const sourcesText = headline.sources ? headline.sources.join(', ') : '알 수 없음';
        slide2.addText(`[${sourcesText}]`, {
            x: 0.8, y: yPos + 0.35, w: 8.7, h: 0.25,
            fontSize: 9, color: '888888'
        });

        yPos += 0.75;
    });

    // ===== 슬라이드 4: 키워드 & 인사이트 =====
    let slide3 = pptx.addSlide();
    slide3.addText('핵심 키워드 & 트렌드', {
        x: 0.5, y: 0.3, w: 9, h: 0.6,
        fontSize: 32, bold: true, color: '0078D4'
    });

    // 키워드 섹션
    slide3.addText('핵심 키워드', {
        x: 0.5, y: 1.2, w: 4, h: 0.4,
        fontSize: 20, bold: true, color: '333333'
    });

    let keywordText = keywords.slice(0, 8).map((k, i) =>
        `${i + 1}. ${k.word} (${k.count}회)`
    ).join('\n');

    slide3.addText(keywordText, {
        x: 0.5, y: 1.7, w: 4, h: 3,
        fontSize: 14, color: '555555', valign: 'top'
    });

    // 인사이트 섹션
    slide3.addText('트렌드 인사이트', {
        x: 5.2, y: 1.2, w: 4.3, h: 0.4,
        fontSize: 20, bold: true, color: '333333'
    });

    let insightText = insights.join('\n\n');

    slide3.addText(insightText, {
        x: 5.2, y: 1.7, w: 4.3, h: 3,
        fontSize: 12, color: '555555', valign: 'top'
    });

    // ===== 슬라이드 5: 요약 =====
    let slide4 = pptx.addSlide();
    slide4.addText('오늘의 요약', {
        x: 0.5, y: 0.3, w: 9, h: 0.6,
        fontSize: 32, bold: true, color: '0078D4'
    });

    const topKeywords = keywords.slice(0, 3).map(k => k.word).join(', ');
    const hotCount = hotNews.length;

    let summaryItems = [
        `총 ${headlines.length}개의 IT 뉴스 분석 (3개 소스)`,
        hotCount > 0 ? `HOT 뉴스 ${hotCount}개 (복수 매체 보도)` : '단독 보도 뉴스 위주',
        `핵심 키워드: ${topKeywords}`,
        'IT 업계는 지속적인 혁신을 보여주고 있습니다.'
    ];

    slide4.addText(summaryItems.map((item, i) => `${i + 1}. ${item}`).join('\n\n'), {
        x: 0.5, y: 1.5, w: 9, h: 3,
        fontSize: 16, color: '333333', valign: 'top'
    });

    slide4.addText('다음 리포트를 기대해주세요!', {
        x: 0.5, y: 4.8, w: 9, h: 0.5,
        fontSize: 18, color: '666666', align: 'center', italic: true
    });

    // PPT 파일 저장
    return pptx.writeFile({ fileName: outputPath });
}

module.exports = { createPresentation };
