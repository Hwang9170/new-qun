/* 펀더멘탈 랩 — UI 로직 */
(function () {
  const { SAMPLE_COMPANIES, FIELDS } = window.FAData;
  const FA = window.FA;
  const STORE_KEY = 'fundamental-lab.companies.v1';
  const CURRENT_KEY = 'fundamental-lab.current';
  const THEME_KEY = 'fundamental-lab.theme';

  const $ = (id) => document.getElementById(id);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- 저장소 ----------
  const storage = {
    get(k) {
      try { return localStorage.getItem(k); } catch { return null; }
    },
    set(k, v) {
      try { localStorage.setItem(k, v); } catch { /* 저장 불가 환경 무시 */ }
    }
  };

  function loadCompanies() {
    try {
      const raw = storage.get(STORE_KEY);
      const list = raw ? JSON.parse(raw) : null;
      if (Array.isArray(list) && list.length) return list;
    } catch { /* fallthrough */ }
    return clone(SAMPLE_COMPANIES);
  }

  const state = {
    companies: loadCompanies(),
    currentId: storage.get(CURRENT_KEY),
    analysis: null
  };
  if (!state.companies.some((c) => c.id === state.currentId)) state.currentId = state.companies[0].id;

  const persist = () => {
    storage.set(STORE_KEY, JSON.stringify(state.companies));
    storage.set(CURRENT_KEY, state.currentId);
  };
  const current = () => state.companies.find((c) => c.id === state.currentId);

  // ---------- 포맷 ----------
  const nf = (d = 0) => new Intl.NumberFormat('ko-KR', { maximumFractionDigits: d, minimumFractionDigits: d });
  const fmt = {
    amt(v) {
      if (v == null || !Number.isFinite(v)) return '–';
      const a = Math.abs(v);
      if (a >= 10000) return nf(a >= 100000 ? 0 : 1).format(v / 10000) + '조';
      return nf(0).format(v) + '억';
    },
    num: (v, d = 0) => (v == null || !Number.isFinite(v) ? '–' : nf(d).format(v)),
    won: (v) => (v == null || !Number.isFinite(v) ? '–' : nf(0).format(v) + '원'),
    pct: (v, d = 1) => (v == null || !Number.isFinite(v) ? '–' : nf(d).format(v * 100) + '%'),
    x: (v, d = 1) => (v == null || !Number.isFinite(v) ? '–' : nf(d).format(v) + '배'),
    signedPct: (v) => (v == null || !Number.isFinite(v) ? '–' : (v > 0 ? '+' : '') + nf(1).format(v * 100) + '%')
  };

  // 지표 평가 기준 → good | warning | critical
  const RULES = {
    roe: (v) => (v >= 0.15 ? 'good' : v >= 0.07 ? 'warning' : 'critical'),
    roic: (v) => (v >= 0.12 ? 'good' : v >= 0.06 ? 'warning' : 'critical'),
    operatingMargin: (v) => (v >= 0.12 ? 'good' : v >= 0.04 ? 'warning' : 'critical'),
    debtRatio: (v) => (v <= 1 ? 'good' : v <= 2 ? 'warning' : 'critical'),
    currentRatio: (v) => (v >= 1.5 ? 'good' : v >= 1 ? 'warning' : 'critical'),
    interestCoverage: (v) => (v >= 5 ? 'good' : v >= 1.5 ? 'warning' : 'critical'),
    per: (v) => (v <= 12 ? 'good' : v <= 25 ? 'warning' : 'critical'),
    pbr: (v) => (v <= 1.5 ? 'good' : v <= 3 ? 'warning' : 'critical'),
    fcfYield: (v) => (v >= 0.05 ? 'good' : v >= 0.02 ? 'warning' : 'critical')
  };
  const STATUS = {
    good: { icon: '●', label: '양호' },
    warning: { icon: '▲', label: '보통' },
    critical: { icon: '■', label: '주의' }
  };
  const statusOf = (key, v) => (RULES[key] && v != null && Number.isFinite(v) ? RULES[key](v) : null);
  const badge = (st) => (st ? `<span class="status status-${st}"><span aria-hidden="true">${STATUS[st].icon}</span>${STATUS[st].label}</span>` : '');

  // ---------- 렌더: 헤더 ----------
  function renderSelect() {
    const sel = $('companySelect');
    sel.innerHTML = state.companies
      .map((c) => `<option value="${esc(c.id)}">${esc(c.name)}${c.ticker ? ' (' + esc(c.ticker) + ')' : ''}</option>`)
      .join('');
    sel.value = state.currentId;
  }

  function renderHeader(c) {
    $('companyName').textContent = c.name || '이름 없는 기업';
    $('companyTicker').textContent = c.ticker || '';
    $('companyTicker').hidden = !c.ticker;
    $('companySector').textContent = c.sector || '';
    $('companySector').hidden = !c.sector;
    $('sampleBadge').hidden = !c.sample;
    $('companyDesc').textContent = c.description || '';
    $('priceInput').value = c.price || '';
  }

  // ---------- 렌더: 개요 ----------
  function renderOverview(a) {
    const sc = a.scorecard;
    $('gradeBadge').textContent = sc.grade;
    $('gradeBadge').className = 'grade grade-' + sc.grade;
    $('totalScore').textContent = sc.total == null ? '-' : Math.round(sc.total);
    $('categoryBars').innerHTML = sc.categories
      .map(
        (cat) => `
      <div class="cat-row">
        <div class="cat-label"><b>${cat.label}</b><span class="muted small">${cat.desc}</span></div>
        <div class="meter" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(cat.score ?? 0)}" aria-label="${cat.label}">
          <div class="meter-fill" style="width:${Math.max(2, cat.score ?? 0)}%"></div>
        </div>
        <div class="cat-score">${cat.score == null ? '–' : Math.round(cat.score)}</div>
      </div>`
      )
      .join('');

    const m = a.latest;
    const v = a.valuation;
    const kpis = [
      { label: '시가총액', value: fmt.amt(v.marketCap), sub: `EV ${fmt.amt(v.ev)}` },
      { label: 'PER', value: v.per == null ? '적자' : fmt.x(v.per), st: statusOf('per', v.per), sub: `EPS ${fmt.won(m.eps)}` },
      { label: 'PBR', value: fmt.x(v.pbr, 2), st: statusOf('pbr', v.pbr), sub: `BPS ${fmt.won(m.bps)}` },
      { label: 'ROE', value: fmt.pct(m.roe), st: statusOf('roe', m.roe), sub: `ROIC ${fmt.pct(m.roic)}` },
      { label: '영업이익률', value: fmt.pct(m.operatingMargin), st: statusOf('operatingMargin', m.operatingMargin), sub: `순이익률 ${fmt.pct(m.netMargin)}` },
      { label: '매출 성장률', value: fmt.signedPct(m.revenueGrowth), sub: `${a.growth.periods}년 CAGR ${fmt.pct(a.growth.revenueCagr)}` },
      { label: '부채비율', value: fmt.pct(m.debtRatio, 0), st: statusOf('debtRatio', m.debtRatio), sub: `유동비율 ${fmt.pct(m.currentRatio, 0)}` },
      { label: 'FCF 수익률', value: fmt.pct(v.fcfYield), st: statusOf('fcfYield', v.fcfYield), sub: `FCF ${fmt.amt(m.fcf)}` },
      { label: '배당수익률', value: fmt.pct(v.dividendYield, 2), sub: `배당성향 ${fmt.pct(m.payoutRatio, 0)}` }
    ];
    $('kpiGrid').innerHTML = kpis
      .map(
        (k) => `<div class="kpi"><div class="kpi-label">${k.label}${badge(k.st)}</div><div class="kpi-value">${k.value}</div><div class="kpi-sub muted">${k.sub}</div></div>`
      )
      .join('');

    $('insightList').innerHTML = a.insights.length
      ? a.insights.map((i) => `<li>${badge(i.tone)}<span>${esc(i.text)}</span></li>`).join('')
      : '<li class="muted">특이 사항이 없습니다.</li>';
  }

  // ---------- 렌더: 차트 ----------
  function renderCharts(a) {
    const cats = a.metrics.map((m) => String(m.year));
    const col = (k, mul = 1) => a.metrics.map((m) => (m[k] == null ? null : m[k] * mul));
    const pctFmt = (v) => nf(1).format(v) + '%';
    const pctAxis = (v) => nf(0).format(v) + '%';
    const amtFmt = (v) => nf(0).format(v) + '억';
    const R = window.FACharts.render;
    R($('chartIncome'), { type: 'bar', categories: cats, format: amtFmt, axisFormat: (v) => nf(0).format(v), series: [{ name: '매출액', values: col('revenue') }, { name: '영업이익', values: col('operatingIncome') }, { name: '순이익', values: col('netIncome') }] });
    R($('chartMargins'), { type: 'line', categories: cats, format: pctFmt, axisFormat: pctAxis, series: [{ name: '매출총이익률', values: col('grossMargin', 100) }, { name: '영업이익률', values: col('operatingMargin', 100) }, { name: '순이익률', values: col('netMargin', 100) }] });
    R($('chartReturns'), { type: 'line', categories: cats, format: pctFmt, axisFormat: pctAxis, series: [{ name: 'ROE', values: col('roe', 100) }, { name: 'ROA', values: col('roa', 100) }, { name: 'ROIC', values: col('roic', 100) }] });
    R($('chartCash'), { type: 'bar', categories: cats, format: amtFmt, axisFormat: (v) => nf(0).format(v), series: [{ name: '영업현금흐름', values: col('operatingCashFlow') }, { name: '설비투자', values: col('capex') }, { name: '잉여현금흐름', values: col('fcf') }] });
    R($('chartStability'), { type: 'line', categories: cats, format: pctFmt, axisFormat: pctAxis, series: [{ name: '부채비율', values: col('debtRatio', 100) }, { name: '유동비율', values: col('currentRatio', 100) }] });
    R($('chartPerShare'), { type: 'bar', categories: cats, format: (v) => nf(0).format(v) + '원', axisFormat: (v) => nf(0).format(v), series: [{ name: 'EPS', values: col('eps') }, { name: 'DPS', values: col('dps') }] });
  }

  // ---------- 렌더: 비율 표 ----------
  const RATIO_ROWS = [
    ['수익성', [['매출총이익률', 'grossMargin', 'pct'], ['영업이익률', 'operatingMargin', 'pct'], ['순이익률', 'netMargin', 'pct'], ['ROE', 'roe', 'pct'], ['ROA', 'roa', 'pct'], ['ROIC', 'roic', 'pct']]],
    ['성장성', [['매출 증가율', 'revenueGrowth', 'signedPct'], ['영업이익 증가율', 'operatingIncomeGrowth', 'signedPct'], ['EPS 증가율', 'epsGrowth', 'signedPct']]],
    ['안정성', [['부채비율', 'debtRatio', 'pct0'], ['자기자본비율', 'equityRatio', 'pct'], ['유동비율', 'currentRatio', 'pct0'], ['이자보상배율', 'interestCoverage', 'x'], ['순차입금/EBITDA', 'netDebtToEbitda', 'x']]],
    ['효율성·현금흐름', [['총자산회전율', 'assetTurnover', 'x2'], ['FCF 마진', 'fcfMargin', 'pct'], ['영업CF/순이익', 'cashConversion', 'x2'], ['배당성향', 'payoutRatio', 'pct0']]],
    ['주당 지표', [['EPS', 'eps', 'won'], ['BPS', 'bps', 'won'], ['주당 FCF', 'fcfps', 'won'], ['DPS', 'dps', 'won']]]
  ];
  const fmtBy = (kind, v) =>
    ({ pct: () => fmt.pct(v), pct0: () => fmt.pct(v, 0), signedPct: () => fmt.signedPct(v), x: () => fmt.x(v), x2: () => fmt.x(v, 2), won: () => fmt.won(v) }[kind]());

  function renderRatios(a) {
    const head = `<thead><tr><th>지표</th>${a.metrics.map((m) => `<th>${m.year}</th>`).join('')}</tr></thead>`;
    const body = RATIO_ROWS.map(
      ([group, rows]) =>
        `<tr class="group-row"><th colspan="${a.metrics.length + 1}">${group}</th></tr>` +
        rows
          .map(([label, key, kind]) => {
            const cells = a.metrics
              .map((m) => {
                const v = m[key];
                const neg = v != null && v < 0 && kind !== 'won' ? ' neg' : '';
                return `<td class="num${neg}">${fmtBy(kind, v)}</td>`;
              })
              .join('');
            return `<tr><th scope="row">${label}</th>${cells}</tr>`;
          })
          .join('')
    ).join('');
    $('ratioTable').innerHTML = head + `<tbody>${body}</tbody>`;
  }

  // ---------- 렌더: 건전성 ----------
  function renderHealth(a) {
    const f = a.piotroski;
    if (!f) {
      $('fscore').innerHTML = '<p class="muted">2개 연도 이상의 데이터가 필요합니다.</p>';
    } else {
      $('fscore').innerHTML = `
        <div class="big-score"><span class="big-num">${f.score}</span><span class="muted">/ 9</span>${badge(f.verdict)}</div>
        <div class="pips" aria-hidden="true">${f.items.map((i) => `<span class="pip ${i.pass ? 'on' : ''}"></span>`).join('')}</div>
        <ul class="checklist">${f.items
          .map((i) => `<li class="${i.pass ? 'pass' : 'fail'}"><span class="check" aria-label="${i.pass ? '충족' : '미충족'}">${i.pass ? '✓' : '✕'}</span><span>${i.label}</span><span class="muted small">${i.group}</span></li>`)
          .join('')}</ul>`;
    }

    const z = a.altman;
    if (!z) {
      $('zscore').innerHTML = '<p class="muted">계산에 필요한 데이터가 부족합니다.</p>';
    } else {
      const zoneMap = { safe: ['good', '안전'], grey: ['warning', '회색지대'], distress: ['critical', '부실 위험'] };
      const [st, zl] = zoneMap[z.zone];
      const pos = Math.min(100, Math.max(0, (z.z / 5) * 100));
      $('zscore').innerHTML = `
        <div class="big-score"><span class="big-num">${nf(2).format(z.z)}</span><span class="status status-${st}"><span aria-hidden="true">${STATUS[st].icon}</span>${zl}</span></div>
        <div class="zbar" aria-hidden="true">
          <div class="zseg z-distress" style="width:36.2%"></div><div class="zseg z-grey" style="width:23.6%"></div><div class="zseg z-safe" style="width:40.2%"></div>
          <div class="zmarker" style="left:${pos}%"></div>
        </div>
        <div class="zscale muted small"><span>0</span><span style="left:36.2%">1.81</span><span style="left:59.8%">2.99</span><span style="left:100%">5+</span></div>
        <table class="data-table compact"><thead><tr><th>구성 요소</th><th>값</th><th>가중치</th><th>기여</th></tr></thead><tbody>
        ${z.components.map((c) => `<tr><th scope="row">${c.label}</th><td class="num">${nf(3).format(c.value)}</td><td class="num">×${c.weight}</td><td class="num">${nf(2).format(c.value * c.weight)}</td></tr>`).join('')}
        </tbody></table>`;
    }
  }

  // ---------- 렌더: 가치평가 ----------
  let dcfInitFor = null;
  function initDcfDefaults(a) {
    if (dcfInitFor === a.company.id) return;
    dcfInitFor = a.company.id;
    const g = a.growth.revenueCagr;
    $('dcfGrowth').value = g == null ? 5 : Math.round(Math.min(15, Math.max(0, g * 100)) * 2) / 2;
    $('dcfBase').value = a.metrics.length >= 3 ? 'avg3' : 'latest';
  }

  function dcfOpts(a) {
    const recent = a.metrics.slice(-3);
    const base = $('dcfBase').value === 'avg3' ? recent.reduce((s, m) => s + m.fcf, 0) / recent.length : a.latest.fcf;
    return {
      baseFcf: base,
      growth: parseFloat($('dcfGrowth').value) / 100 || 0,
      years: Math.max(1, Math.min(20, parseInt($('dcfYears').value, 10) || 5)),
      discount: parseFloat($('dcfDiscount').value) / 100 || 0.09,
      terminal: parseFloat($('dcfTerminal').value) / 100 || 0,
      netDebt: a.latestRaw.debt - a.latestRaw.cash,
      shares: a.latestRaw.shares
    };
  }

  function upside(value, price) {
    if (value == null || !price) return '';
    const u = value / price - 1;
    const cls = u >= 0 ? 'up' : 'down';
    return `<span class="delta ${cls}">${u >= 0 ? '▲' : '▼'} ${fmt.signedPct(u)}</span>`;
  }

  function renderValuation(a) {
    initDcfDefaults(a);
    const o = dcfOpts(a);
    const price = a.company.price;
    const res = o.baseFcf > 0 ? FA.dcf(o) : null;
    if (!res) {
      $('dcfResult').innerHTML = `<p class="warn-text">${
        o.baseFcf <= 0 ? '기준 FCF가 0 이하라 DCF가 의미 없습니다. 다른 방법(S-RIM, PBR)을 참고하세요.' : '할인율이 영구성장률보다 커야 합니다.'
      }</p>`;
    } else {
      $('dcfResult').innerHTML = `
        <div class="dcf-head"><div><div class="muted small">주당 내재가치</div><div class="big-num">${fmt.won(res.perShare)}</div></div><div>${upside(res.perShare, price)}<div class="muted small">현재가 ${fmt.won(price)} 대비</div></div></div>
        <dl class="dl">
          <dt>기준 FCF</dt><dd>${fmt.amt(o.baseFcf)}</dd>
          <dt>예측기간 현재가치 합</dt><dd>${fmt.amt(res.pvSum)}</dd>
          <dt>잔존가치 현재가치</dt><dd>${fmt.amt(res.pvTerminal)} <span class="muted small">(EV의 ${fmt.pct(res.terminalShare, 0)})</span></dd>
          <dt>기업가치 (EV)</dt><dd>${fmt.amt(res.enterpriseValue)}</dd>
          <dt>순차입금</dt><dd>${fmt.amt(o.netDebt)}</dd>
          <dt>주주가치</dt><dd>${fmt.amt(res.equityValue)}</dd>
        </dl>`;
    }

    // 적정가치 비교
    const m = a.latest;
    const r = o.discount;
    const srim = m.bps > 0 && m.roe != null ? (m.bps * m.roe) / r : null;
    const items = [
      { label: 'DCF', value: res ? res.perShare : null, note: `할인율 ${fmt.pct(r)}` },
      { label: 'S-RIM', value: srim != null && srim > 0 ? srim : null, note: 'BPS × ROE ÷ 요구수익률' },
      { label: '그레이엄 넘버', value: a.valuation.grahamNumber, note: '√(22.5 × EPS × BPS)' },
      { label: '현재 주가', value: price, note: '', current: true }
    ];
    const max = Math.max(...items.map((i) => i.value || 0), 1);
    $('fairValues').innerHTML = items
      .map(
        (i) => `<div class="fv-row ${i.current ? 'fv-current' : ''}">
        <div class="fv-label"><b>${i.label}</b><span class="muted small">${i.note}</span></div>
        <div class="fv-bar"><div style="width:${i.value ? Math.max(1, (i.value / max) * 100) : 0}%"></div></div>
        <div class="fv-val">${i.value ? fmt.won(i.value) : '<span class="muted">산출 불가</span>'} ${i.current ? '' : upside(i.value, price)}</div>
      </div>`
      )
      .join('');

    // 민감도 표
    if (!(o.baseFcf > 0)) {
      $('sensitivity').innerHTML = '<tbody><tr><td class="muted">FCF가 양수일 때 표시됩니다.</td></tr></tbody>';
      return;
    }
    const rs = [-0.02, -0.01, 0, 0.01, 0.02].map((d) => +(o.discount + d).toFixed(4));
    const gs = [-0.01, -0.005, 0, 0.005, 0.01].map((d) => +(o.terminal + d).toFixed(4));
    const grid = FA.dcfSensitivity(o, rs, gs);
    $('sensitivity').innerHTML =
      `<thead><tr><th>WACC \\ g</th>${gs.map((g) => `<th>${fmt.pct(g)}</th>`).join('')}</tr></thead><tbody>` +
      rs
        .map(
          (rr, i) =>
            `<tr><th scope="row">${fmt.pct(rr)}</th>${grid[i]
              .map((v, j) => {
                const center = i === 2 && j === 2 ? ' center' : '';
                if (v == null) return `<td class="num${center}">–</td>`;
                const cls = v >= price ? 'up' : 'down';
                return `<td class="num ${cls}${center}"><span aria-hidden="true">${v >= price ? '▲' : '▼'}</span> ${nf(0).format(v)}</td>`;
              })
              .join('')}</tr>`
        )
        .join('') +
      '</tbody>';
  }

  // ---------- 렌더: 기업 비교 ----------
  function renderCompare() {
    const rows = state.companies
      .map((c) => ({ c, a: c.years.length ? FA.analyze(c) : null }))
      .filter((x) => x.a);
    const cols = [
      ['종합', (a) => (a.scorecard.total == null ? '–' : `<b>${Math.round(a.scorecard.total)}</b> <span class="grade-mini grade-${a.scorecard.grade}">${a.scorecard.grade}</span>`)],
      ['시가총액', (a) => fmt.amt(a.valuation.marketCap)],
      ['매출 CAGR', (a) => fmt.pct(a.growth.revenueCagr)],
      ['영업이익률', (a) => fmt.pct(a.latest.operatingMargin)],
      ['ROE', (a) => fmt.pct(a.latest.roe)],
      ['부채비율', (a) => fmt.pct(a.latest.debtRatio, 0)],
      ['PER', (a) => (a.valuation.per == null ? '적자' : fmt.x(a.valuation.per))],
      ['PBR', (a) => fmt.x(a.valuation.pbr, 2)],
      ['FCF 수익률', (a) => fmt.pct(a.valuation.fcfYield)],
      ['배당수익률', (a) => fmt.pct(a.valuation.dividendYield, 2)],
      ['F-Score', (a) => (a.piotroski ? a.piotroski.score + '/9' : '–')],
      ['Z-Score', (a) => (a.altman ? nf(2).format(a.altman.z) : '–')]
    ];
    $('compareTable').innerHTML =
      `<thead><tr><th>기업</th>${cols.map(([h]) => `<th>${h}</th>`).join('')}</tr></thead><tbody>` +
      rows
        .map(
          ({ c, a }) =>
            `<tr class="clickable ${c.id === state.currentId ? 'selected' : ''}" data-id="${esc(c.id)}" tabindex="0"><th scope="row">${esc(c.name)}<div class="muted small">${esc(c.sector || '')}</div></th>${cols
              .map(([, f]) => `<td class="num">${f(a)}</td>`)
              .join('')}</tr>`
        )
        .join('') +
      '</tbody>';
  }

  // ---------- 데이터 입력 ----------
  function renderEditor(c) {
    $('edName').value = c.name || '';
    $('edTicker').value = c.ticker || '';
    $('edSector').value = c.sector || '';
    $('edDesc').value = c.description || '';
    const years = [...c.years].sort((a, b) => a.year - b.year);
    let lastGroup = '';
    const head = `<thead><tr><th>항목</th>${years.map((y, i) => `<th><input class="year-input" data-col="${i}" type="number" value="${y.year}" aria-label="연도" /></th>`).join('')}</tr></thead>`;
    const body = FIELDS.map((f, r) => {
      let g = '';
      if (f.group !== lastGroup) {
        lastGroup = f.group;
        g = `<tr class="group-row"><th colspan="${years.length + 1}">${f.group}</th></tr>`;
      }
      return (
        g +
        `<tr><th scope="row">${f.label} <span class="muted small">${f.unit}</span></th>${years
          .map((y, i) => `<td><input type="number" step="any" data-row="${r}" data-col="${i}" data-key="${f.key}" value="${y[f.key] ?? ''}" aria-label="${y.year} ${f.label}" /></td>`)
          .join('')}</tr>`
      );
    }).join('');
    $('editorTable').innerHTML = head + `<tbody>${body}</tbody>`;
    showWarnings(FA.validate(c));
  }

  function showWarnings(list) {
    $('editorWarnings').innerHTML = list.length ? list.map((w) => `<div>${badge('warning')} ${esc(w)}</div>`).join('') : '';
  }

  function readEditor() {
    const c = current();
    const yearInputs = [...document.querySelectorAll('#editorTable .year-input')];
    const years = yearInputs.map((inp) => ({ year: parseInt(inp.value, 10) }));
    document.querySelectorAll('#editorTable input[data-key]').forEach((inp) => {
      const v = parseFloat(inp.value);
      years[+inp.dataset.col][inp.dataset.key] = Number.isFinite(v) ? v : 0;
    });
    return {
      ...c,
      name: $('edName').value.trim() || '이름 없는 기업',
      ticker: $('edTicker').value.trim(),
      sector: $('edSector').value.trim(),
      description: $('edDesc').value.trim(),
      years: years.filter((y) => Number.isFinite(y.year)).sort((a, b) => a.year - b.year)
    };
  }

  function updateCurrent(next) {
    const i = state.companies.findIndex((c) => c.id === state.currentId);
    state.companies[i] = next;
    persist();
  }

  function onEditorPaste(e) {
    const t = e.target;
    if (!t.matches('#editorTable input[data-key]')) return;
    const text = (e.clipboardData || window.clipboardData).getData('text');
    if (!/[\t\n]/.test(text.trim())) return;
    e.preventDefault();
    const rows = text.replace(/\r/g, '').split('\n').filter((l) => l.trim() !== '');
    const r0 = +t.dataset.row;
    const c0 = +t.dataset.col;
    rows.forEach((line, dr) => {
      line.split('\t').forEach((cell, dc) => {
        const inp = document.querySelector(`#editorTable input[data-row="${r0 + dr}"][data-col="${c0 + dc}"]`);
        if (inp) inp.value = cell.replace(/[,\s원억]/g, '');
      });
    });
    toast(`${rows.length}행을 붙여넣었습니다.`);
  }

  // ---------- 공통 ----------
  let toastTimer;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  function renderAll() {
    const c = current();
    renderSelect();
    renderHeader(c);
    renderEditor(c);
    renderCompare();
    const usable = c.years.length > 0 && c.years.every((y) => y.shares > 0 && y.revenue != null);
    document.body.classList.toggle('no-data', !usable);
    if (!usable) {
      state.analysis = null;
      return;
    }
    const a = FA.analyze(c);
    state.analysis = a;
    renderOverview(a);
    renderCharts(a);
    renderRatios(a);
    renderHealth(a);
    renderValuation(a);
  }

  function blankCompany() {
    const thisYear = new Date().getFullYear();
    const years = [3, 2, 1].map((d) => {
      const y = { year: thisYear - d };
      FIELDS.forEach((f) => (y[f.key] = 0));
      y.shares = 1;
      return y;
    });
    return { id: 'c-' + Date.now().toString(36), name: '새 기업', ticker: '', sector: '', price: 10000, description: '', years };
  }

  // ---------- 이벤트 ----------
  function bind() {
    $('companySelect').addEventListener('change', (e) => {
      state.currentId = e.target.value;
      persist();
      renderAll();
    });

    $('priceInput').addEventListener('change', (e) => {
      const p = parseFloat(e.target.value);
      if (!(p > 0)) return;
      updateCurrent({ ...current(), price: p });
      renderAll();
    });

    $('newCompanyBtn').addEventListener('click', () => {
      const c = blankCompany();
      state.companies.push(c);
      state.currentId = c.id;
      persist();
      renderAll();
      location.hash = '#editor';
      $('edName').focus();
      $('edName').select();
    });

    $('dcfForm').addEventListener('input', () => state.analysis && renderValuation(state.analysis));

    $('saveBtn').addEventListener('click', () => {
      const next = readEditor();
      const warnings = FA.validate(next);
      updateCurrent(next);
      renderAll();
      showWarnings(warnings);
      toast(warnings.length ? `저장했습니다 (확인 필요 ${warnings.length}건)` : '저장하고 분석을 갱신했습니다.');
      if (!warnings.length) location.hash = '#overview';
    });

    $('addYearBtn').addEventListener('click', () => {
      const c = readEditor();
      const last = c.years[c.years.length - 1];
      const y = last ? { ...last, year: last.year + 1 } : { year: new Date().getFullYear() - 1 };
      FIELDS.forEach((f) => (y[f.key] = y[f.key] ?? 0));
      c.years.push(y);
      updateCurrent(c);
      renderEditor(c);
      toast(`${y.year}년 열을 추가했습니다 (직전 연도 값 복사).`);
    });

    $('removeYearBtn').addEventListener('click', () => {
      const c = readEditor();
      if (c.years.length <= 1) return toast('최소 1개 연도가 필요합니다.');
      const removed = c.years.shift();
      updateCurrent(c);
      renderAll();
      toast(`${removed.year}년을 삭제했습니다.`);
    });

    $('deleteBtn').addEventListener('click', () => {
      const c = current();
      if (!confirm(`'${c.name}'을(를) 삭제할까요?`)) return;
      state.companies = state.companies.filter((x) => x.id !== c.id);
      if (!state.companies.length) state.companies = clone(SAMPLE_COMPANIES);
      state.currentId = state.companies[0].id;
      persist();
      renderAll();
      toast('삭제했습니다.');
    });

    $('exportBtn').addEventListener('click', () => {
      const c = readEditor();
      const blob = new Blob([JSON.stringify(c, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${c.name || 'company'}.json`;
      link.click();
      URL.revokeObjectURL(url);
    });

    $('importInput').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        const list = Array.isArray(data) ? data : [data];
        list.forEach((c) => {
          if (!c || !Array.isArray(c.years)) throw new Error('years 배열이 없습니다.');
          c.id = 'c-' + Math.random().toString(36).slice(2, 9);
          c.sample = false;
          state.companies.push(c);
        });
        state.currentId = state.companies[state.companies.length - 1].id;
        persist();
        renderAll();
        toast(`${list.length}개 기업을 가져왔습니다.`);
      } catch (err) {
        toast('가져오기 실패: ' + err.message);
      }
      e.target.value = '';
    });

    $('editorTable').addEventListener('paste', onEditorPaste);

    $('compareTable').addEventListener('click', (e) => {
      const tr = e.target.closest('tr[data-id]');
      if (!tr) return;
      state.currentId = tr.dataset.id;
      persist();
      renderAll();
      location.hash = '#overview';
    });
    $('compareTable').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') e.target.closest('tr[data-id]')?.click();
    });

    // 테마
    const applyTheme = (t) => {
      if (t) document.documentElement.setAttribute('data-theme', t);
      else document.documentElement.removeAttribute('data-theme');
    };
    applyTheme(storage.get(THEME_KEY));
    $('themeBtn').addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      const next = cur === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      storage.set(THEME_KEY, next);
    });

    // 차트 리사이즈
    let rt;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => state.analysis && renderCharts(state.analysis), 150);
    });

    // 현재 섹션 탭 강조
    const tabs = [...document.querySelectorAll('.tab')];
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) tabs.forEach((t) => t.classList.toggle('active', t.getAttribute('href') === '#' + en.target.id));
        });
      },
      { rootMargin: '-40% 0px -55% 0px' }
    );
    document.querySelectorAll('.section').forEach((s) => io.observe(s));
  }

  bind();
  renderAll();
})();
