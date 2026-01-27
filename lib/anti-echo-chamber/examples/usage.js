require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const antiEcho = require('../index');

// 테스트용 뉴스 데이터
const testNews = [
  {
    title: "정부, 기준금리 0.25%p 인하 결정",
    summary: "한국은행이 경기 부양을 위해 기준금리를 인하했다. 전문가들은 소비와 투자 활성화를 기대하고 있다.",
    sources: ["네이버", "연합뉴스"],
    category: "domestic",
    isHot: true
  },
  {
    title: "AI 반도체 수출 역대 최고치 기록",
    summary: "국내 반도체 기업들의 AI 칩 수출이 전년 대비 40% 증가했다.",
    sources: ["구글뉴스"],
    category: "domestic",
    isHot: false
  }
];

async function test() {
  console.log('🧪 Anti-Echo-Chamber 테스트 시작\n');

  try {
    // 1. 모듈 초기화
    antiEcho.initialize();
    console.log('✅ 모듈 초기화 성공\n');

    // 2. 반대 관점 생성
    console.log('🎭 반대 관점 생성 중...\n');
    const perspectives = await antiEcho.generateBatch(testNews, { maxItems: 2 });

    console.log(`✅ ${perspectives.length}개 결과 생성\n`);

    // 3. 결과 출력
    perspectives.forEach((p, i) => {
      console.log(`--- [${i + 1}] ${p.originalTitle} ---`);
      console.log(`핵심 주장: ${p.originalClaim}`);
      console.log('반론:');
      p.counterArguments.forEach(arg => {
        console.log(`  • ${arg.point}: ${arg.explanation}`);
      });
      console.log(`대안적 관점: ${p.alternativeViewpoint}\n`);
    });

    // 4. HTML 템플릿 테스트
    const html = antiEcho.templates.renderSection(perspectives);
    console.log('✅ HTML 템플릿 생성 성공');
    console.log(`   (${html.length} 글자)\n`);

    console.log('🎉 테스트 완료!');
  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
    process.exit(1);
  }
}

test();
