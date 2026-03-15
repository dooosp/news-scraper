const { loadEnv } = require('../lib/shared/config-loader');
loadEnv({ name: 'news-scraper' });
const newsOrchestrator = require('./orchestrator/news-orchestrator');

// ===== CLI 실행 =====

if (require.main === module) {
    const args = process.argv.slice(2);
    const sendMail = !args.includes('--no-mail');
    const useLLM = !args.includes('--no-llm');

    newsOrchestrator.runDigest({ sendMail, useLLM }).catch(err => {
        console.error('\n❌ 작업 실패:', err.message);
        process.exit(1);
    });
}

module.exports = newsOrchestrator;
