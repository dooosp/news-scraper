function successPage() {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>발송 완료</title>
<style>body{font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%)}.card{background:#fff;padding:40px;border-radius:15px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.2)}h1{color:#28a745}</style>
</head><body><div class="card"><h1>이메일 발송 완료!</h1><p>최신 뉴스가 Gmail로 발송되었습니다.</p></div></body></html>`;
}

function errorPage() {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>실패</title>
<style>body{font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#f8d7da}.card{background:#fff;padding:40px;border-radius:15px;text-align:center}h1{color:#dc3545}</style>
</head><body><div class="card"><h1>발송 실패</h1><p>오류가 발생했습니다. 로그를 확인하세요.</p></div></body></html>`;
}

module.exports = { successPage, errorPage };
