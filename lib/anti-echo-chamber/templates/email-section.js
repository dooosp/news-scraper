function renderSingleItem(perspective) {
  const counterArgs = perspective.counterArguments
    .map(arg => `<li><strong>${arg.point}</strong> - ${arg.explanation}</li>`)
    .join('');

  return `
    <div style="background: white; padding: 15px; border-radius: 6px; margin-bottom: 15px; border: 1px solid #e0e0e0;">
      <h3 style="color: #2d3436; margin: 0 0 10px 0; font-size: 15px;">
        ${perspective.isHot ? '🔥 ' : '📰 '}"${perspective.originalTitle}"
      </h3>
      <div style="color: #636e72; font-size: 14px; line-height: 1.6;">
        <p style="margin: 0 0 10px 0;"><strong>핵심 주장:</strong> ${perspective.originalClaim}</p>
        <p style="color: #d63031; margin: 0 0 5px 0;"><strong>🤔 반론:</strong></p>
        <ul style="margin: 0 0 10px 0; padding-left: 20px;">${counterArgs}</ul>
        <p style="color: #0984e3; margin: 0;"><strong>💡 대안적 관점:</strong> ${perspective.alternativeViewpoint}</p>
      </div>
    </div>`;
}

function renderSection(perspectives) {
  if (!perspectives || perspectives.length === 0) {
    return '';
  }

  const items = perspectives.map(p => renderSingleItem(p)).join('');

  return `
    <div style="margin: 25px 0; padding: 20px; background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%); border-left: 4px solid #6c5ce7; border-radius: 8px;">
      <h2 style="color: #6c5ce7; margin: 0 0 8px 0; font-size: 18px;">🎭 다른 관점에서 보기</h2>
      <p style="color: #666; font-size: 13px; margin: 0 0 20px 0;">확증편향을 벗어나 다양한 시각을 경험해보세요</p>
      ${items}
      <p style="color: #b2bec3; font-size: 11px; margin: 15px 0 0 0; text-align: center;">
        ⚠️ AI(Gemini) 분석 기반 | 투자·의사결정 참고용이 아닙니다
      </p>
    </div>`;
}

module.exports = { renderSection, renderSingleItem };
