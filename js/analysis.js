/*
 * 펀더멘탈 분석 엔진 — 순수 함수만 포함 (DOM 의존 없음, Node 테스트 가능)
 * 금액 단위: 억원, 주가/주당 지표: 원
 */
(function (root) {
  const UNIT = 1e8; // 1억원
  const DEFAULT_TAX_RATE = 0.22;

  const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
  const div = (a, b) => (isNum(a) && isNum(b) && b !== 0 ? a / b : null);
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  function cagr(first, last, periods) {
    if (!isNum(first) || !isNum(last) || first <= 0 || last <= 0 || periods <= 0) return null;
    return Math.pow(last / first, 1 / periods) - 1;
  }

  function growth(cur, prev) {
    if (!isNum(cur) || !isNum(prev) || prev === 0) return null;
    return (cur - prev) / Math.abs(prev);
  }

  /** 연도별 지표 계산. prev는 직전 연도 원자료(없으면 null) */
  function yearMetrics(y, prev, taxRate = DEFAULT_TAX_RATE) {
    const grossProfit = y.revenue - y.cogs;
    const fcf = y.operatingCashFlow - y.capex;
    const ebitda = y.operatingIncome + y.depreciation;
    const nopat = y.operatingIncome * (1 - taxRate);
    const investedCapital = y.equity + y.debt - y.cash;
    const avgEquity = prev ? (prev.equity + y.equity) / 2 : y.equity;
    const avgAssets = prev ? (prev.totalAssets + y.totalAssets) / 2 : y.totalAssets;
    const prevIC = prev ? prev.equity + prev.debt - prev.cash : null;
    const avgIC = prevIC != null ? (prevIC + investedCapital) / 2 : investedCapital;

    return {
      year: y.year,
      revenue: y.revenue,
      grossProfit,
      operatingIncome: y.operatingIncome,
      netIncome: y.netIncome,
      ebitda,
      operatingCashFlow: y.operatingCashFlow,
      capex: y.capex,
      fcf,
      // 수익성
      grossMargin: div(grossProfit, y.revenue),
      operatingMargin: div(y.operatingIncome, y.revenue),
      netMargin: div(y.netIncome, y.revenue),
      roe: avgEquity > 0 ? div(y.netIncome, avgEquity) : null,
      roa: div(y.netIncome, avgAssets),
      roic: avgIC > 0 ? div(nopat, avgIC) : null,
      // 안정성
      debtRatio: y.equity > 0 ? div(y.totalLiabilities, y.equity) : null, // 부채비율 = 부채/자본
      currentRatio: div(y.currentAssets, y.currentLiabilities),
      interestCoverage: y.interestExpense > 0 ? div(y.operatingIncome, y.interestExpense) : null,
      netDebt: y.debt - y.cash,
      netDebtToEbitda: ebitda > 0 ? div(y.debt - y.cash, ebitda) : null,
      equityRatio: div(y.equity, y.totalAssets),
      // 효율성
      assetTurnover: div(y.revenue, avgAssets),
      // 현금흐름
      fcfMargin: div(fcf, y.revenue),
      cashConversion: y.netIncome > 0 ? div(y.operatingCashFlow, y.netIncome) : null,
      // 주당 지표 (원)
      eps: div(y.netIncome * UNIT, y.shares),
      bps: div(y.equity * UNIT, y.shares),
      fcfps: div(fcf * UNIT, y.shares),
      dps: y.dps || 0,
      payoutRatio: y.netIncome > 0 ? div((y.dps || 0) * y.shares, y.netIncome * UNIT) : null,
      // 성장률 (전년 대비)
      revenueGrowth: prev ? growth(y.revenue, prev.revenue) : null,
      operatingIncomeGrowth: prev ? growth(y.operatingIncome, prev.operatingIncome) : null,
      netIncomeGrowth: prev ? growth(y.netIncome, prev.netIncome) : null,
      epsGrowth: prev ? growth(y.netIncome / y.shares, prev.netIncome / prev.shares) : null
    };
  }

  /** 현재 주가 기준 밸류에이션 지표 (최근 연도 기준) */
  function valuation(company, latest, m) {
    const price = company.price;
    const marketCap = div(price * latest.shares, UNIT); // 억원
    const ev = isNum(marketCap) ? marketCap + latest.debt - latest.cash : null;
    const per = m.eps > 0 ? div(price, m.eps) : null;
    const pbr = m.bps > 0 ? div(price, m.bps) : null;
    const graham = m.eps > 0 && m.bps > 0 ? Math.sqrt(22.5 * m.eps * m.bps) : null;
    return {
      price,
      marketCap,
      ev,
      per,
      pbr,
      psr: div(marketCap, latest.revenue),
      pcr: latest.operatingCashFlow > 0 ? div(marketCap, latest.operatingCashFlow) : null,
      evEbitda: m.ebitda > 0 ? div(ev, m.ebitda) : null,
      earningsYield: div(m.eps, price),
      fcfYield: div(m.fcf, marketCap),
      dividendYield: div(m.dps, price),
      peg: null, // analyze()에서 EPS 성장률과 함께 계산
      grahamNumber: graham
    };
  }

  /** Piotroski F-Score (9점 만점) */
  function piotroski(cur, prev) {
    if (!cur || !prev) return null;
    const roa = div(cur.netIncome, cur.totalAssets);
    const roaPrev = div(prev.netIncome, prev.totalAssets);
    const cfoA = div(cur.operatingCashFlow, cur.totalAssets);
    const lev = div(cur.debt, cur.totalAssets);
    const levPrev = div(prev.debt, prev.totalAssets);
    const cr = div(cur.currentAssets, cur.currentLiabilities);
    const crPrev = div(prev.currentAssets, prev.currentLiabilities);
    const gm = div(cur.revenue - cur.cogs, cur.revenue);
    const gmPrev = div(prev.revenue - prev.cogs, prev.revenue);
    const at = div(cur.revenue, cur.totalAssets);
    const atPrev = div(prev.revenue, prev.totalAssets);

    const items = [
      { group: '수익성', label: '순이익 흑자 (ROA > 0)', pass: roa > 0 },
      { group: '수익성', label: '영업현금흐름 플러스', pass: cur.operatingCashFlow > 0 },
      { group: '수익성', label: 'ROA 전년 대비 개선', pass: roa > roaPrev },
      { group: '수익성', label: '영업현금흐름 > 순이익 (이익의 질)', pass: cfoA > roa },
      { group: '재무구조', label: '차입금/자산 비율 감소', pass: lev <= levPrev },
      { group: '재무구조', label: '유동비율 개선', pass: cr > crPrev },
      { group: '재무구조', label: '신주 발행 없음', pass: cur.shares <= prev.shares },
      { group: '운영효율', label: '매출총이익률 개선', pass: gm > gmPrev },
      { group: '운영효율', label: '자산회전율 개선', pass: at > atPrev }
    ];
    const score = items.filter((i) => i.pass).length;
    const verdict = score >= 7 ? 'good' : score >= 4 ? 'warning' : 'critical';
    return { score, items, verdict };
  }

  /** Altman Z-Score (제조업 원형 모델) */
  function altmanZ(cur, marketCap) {
    if (!cur || !isNum(marketCap) || !(cur.totalAssets > 0) || !(cur.totalLiabilities > 0)) return null;
    const ta = cur.totalAssets;
    const x1 = (cur.currentAssets - cur.currentLiabilities) / ta;
    const x2 = cur.retainedEarnings / ta;
    const x3 = cur.operatingIncome / ta;
    const x4 = marketCap / cur.totalLiabilities;
    const x5 = cur.revenue / ta;
    const z = 1.2 * x1 + 1.4 * x2 + 3.3 * x3 + 0.6 * x4 + 1.0 * x5;
    const zone = z > 2.99 ? 'safe' : z >= 1.81 ? 'grey' : 'distress';
    return {
      z,
      zone,
      components: [
        { label: '운전자본 / 총자산', weight: 1.2, value: x1 },
        { label: '이익잉여금 / 총자산', weight: 1.4, value: x2 },
        { label: '영업이익 / 총자산', weight: 3.3, value: x3 },
        { label: '시가총액 / 총부채', weight: 0.6, value: x4 },
        { label: '매출액 / 총자산', weight: 1.0, value: x5 }
      ]
    };
  }

  /**
   * 2단계 DCF (FCFF 근사: 영업CF - CAPEX)
   * opts: { baseFcf, growth, years, discount, terminal, netDebt, shares }
   */
  function dcf(opts) {
    const { baseFcf, growth: g, years, discount: r, terminal: gt, netDebt, shares } = opts;
    if (!isNum(baseFcf) || !(shares > 0) || !(r > gt)) return null;
    const flows = [];
    let fcf = baseFcf;
    let pvSum = 0;
    for (let t = 1; t <= years; t++) {
      fcf = fcf * (1 + g);
      const pv = fcf / Math.pow(1 + r, t);
      pvSum += pv;
      flows.push({ t, fcf, pv });
    }
    const terminalValue = (fcf * (1 + gt)) / (r - gt);
    const pvTerminal = terminalValue / Math.pow(1 + r, years);
    const enterpriseValue = pvSum + pvTerminal;
    const equityValue = enterpriseValue - netDebt;
    const perShare = (equityValue * UNIT) / shares;
    return {
      flows,
      pvSum,
      terminalValue,
      pvTerminal,
      enterpriseValue,
      equityValue,
      perShare,
      terminalShare: div(pvTerminal, enterpriseValue)
    };
  }

  function dcfSensitivity(opts, discounts, terminals) {
    return discounts.map((r) =>
      terminals.map((gt) => {
        const res = dcf({ ...opts, discount: r, terminal: gt });
        return res ? res.perShare : null;
      })
    );
  }

  /** 선형 점수화: bad → 0점, good → 100점 (bad > good이면 낮을수록 좋음) */
  function scale(v, bad, good) {
    if (!isNum(v)) return null;
    return clamp(((v - bad) / (good - bad)) * 100, 0, 100);
  }

  function mean(arr) {
    const xs = arr.filter(isNum);
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
  }

  function grade(score) {
    if (!isNum(score)) return '-';
    if (score >= 80) return 'A';
    if (score >= 65) return 'B';
    if (score >= 50) return 'C';
    if (score >= 35) return 'D';
    return 'E';
  }

  /** 5개 영역 점수 */
  function scorecard(a) {
    const m = a.latest;
    const v = a.valuation;
    const g = a.growth;
    const fcfPositiveRatio = a.metrics.filter((x) => x.fcf > 0).length / a.metrics.length;
    const per = v.per == null ? 0 : scale(v.per, 40, 8); // 적자면 0점
    const categories = [
      {
        key: 'profitability',
        label: '수익성',
        desc: 'ROE · ROIC · 영업이익률',
        score: mean([scale(m.roe, 0, 0.2), scale(m.roic, 0, 0.2), scale(m.operatingMargin, 0, 0.25)])
      },
      {
        key: 'growth',
        label: '성장성',
        desc: '매출 · 영업이익 CAGR',
        score: mean([
          scale(g.revenueCagr, -0.05, 0.2),
          g.operatingIncomeCagr != null ? scale(g.operatingIncomeCagr, -0.05, 0.25) : m.operatingIncome > 0 ? 50 : 0
        ])
      },
      {
        key: 'stability',
        label: '안정성',
        desc: '부채비율 · 유동비율 · 이자보상배율',
        score: mean([
          m.debtRatio == null ? 0 : scale(m.debtRatio, 2.5, 0.5),
          scale(m.currentRatio, 0.8, 2.0),
          m.interestCoverage == null ? 100 : scale(m.interestCoverage, 1, 10)
        ])
      },
      {
        key: 'cashflow',
        label: '현금흐름',
        desc: 'FCF 마진 · 이익의 현금 전환 · FCF 흑자 지속',
        score: mean([
          scale(m.fcfMargin, -0.05, 0.15),
          m.cashConversion == null ? 0 : scale(m.cashConversion, 0.5, 1.2),
          fcfPositiveRatio * 100
        ])
      },
      {
        key: 'valuation',
        label: '밸류에이션',
        desc: 'PER · PBR · FCF 수익률 (낮을수록 저평가)',
        score: mean([per, v.pbr == null ? 0 : scale(v.pbr, 5, 0.8), scale(v.fcfYield, 0, 0.08)])
      }
    ];
    const total = mean(categories.map((c) => c.score));
    return { categories, total, grade: grade(total) };
  }

  /** 관점별 코멘트 자동 생성 */
  function insights(a) {
    const out = [];
    const m = a.latest;
    const v = a.valuation;
    const pct = (x) => (x * 100).toFixed(1) + '%';
    if (m.roe != null && m.roe >= 0.15) out.push({ tone: 'good', text: `ROE ${pct(m.roe)}로 자기자본 대비 높은 이익을 내고 있습니다.` });
    else if (m.roe != null && m.roe < 0.05) out.push({ tone: 'critical', text: `ROE ${pct(m.roe)}로 자본 효율이 낮습니다.` });
    if (m.netIncome < 0) out.push({ tone: 'critical', text: '최근 연도 순손실 상태입니다.' });
    if (a.growth.revenueCagr != null && a.growth.revenueCagr >= 0.15)
      out.push({ tone: 'good', text: `최근 ${a.growth.periods}년 매출 연평균 성장률 ${pct(a.growth.revenueCagr)}의 고성장 기업입니다.` });
    else if (a.growth.revenueCagr != null && a.growth.revenueCagr < 0)
      out.push({ tone: 'warning', text: `최근 ${a.growth.periods}년 매출이 역성장(${pct(a.growth.revenueCagr)})했습니다.` });
    if (m.debtRatio != null && m.debtRatio > 2) out.push({ tone: 'critical', text: `부채비율 ${pct(m.debtRatio)}로 재무 레버리지가 높습니다.` });
    else if (m.debtRatio != null && m.debtRatio < 0.5) out.push({ tone: 'good', text: `부채비율 ${pct(m.debtRatio)}로 재무구조가 탄탄합니다.` });
    if (m.interestCoverage != null && m.interestCoverage < 1.5)
      out.push({ tone: 'critical', text: `이자보상배율 ${m.interestCoverage.toFixed(1)}배 — 영업이익으로 이자를 감당하기 어렵습니다.` });
    if (m.currentRatio != null && m.currentRatio < 1) out.push({ tone: 'warning', text: `유동비율 ${pct(m.currentRatio)}로 단기 유동성에 주의가 필요합니다.` });
    if (m.cashConversion != null && m.cashConversion >= 1.1) out.push({ tone: 'good', text: '영업현금흐름이 순이익을 웃돌아 이익의 질이 좋습니다.' });
    else if (m.cashConversion != null && m.cashConversion < 0.7) out.push({ tone: 'warning', text: '순이익 대비 영업현금흐름이 부족합니다 (이익의 질 점검 필요).' });
    if (v.per != null && v.per > 30) out.push({ tone: 'warning', text: `PER ${v.per.toFixed(1)}배로 이익 대비 주가 부담이 큽니다.` });
    else if (v.per != null && v.per < 10) out.push({ tone: 'good', text: `PER ${v.per.toFixed(1)}배로 이익 대비 주가가 낮은 편입니다.` });
    if (a.altman && a.altman.zone === 'distress') out.push({ tone: 'critical', text: `Altman Z-Score ${a.altman.z.toFixed(2)} — 부실 위험 구간입니다.` });
    if (a.piotroski && a.piotroski.score >= 7) out.push({ tone: 'good', text: `Piotroski F-Score ${a.piotroski.score}점 — 펀더멘탈이 개선되는 중입니다.` });
    else if (a.piotroski && a.piotroski.score <= 3) out.push({ tone: 'critical', text: `Piotroski F-Score ${a.piotroski.score}점 — 펀더멘탈이 약화되고 있습니다.` });
    return out;
  }

  /** 기업 전체 분석 */
  function analyze(company, opts = {}) {
    const taxRate = isNum(opts.taxRate) ? opts.taxRate : DEFAULT_TAX_RATE;
    const years = [...company.years].sort((a, b) => a.year - b.year);
    if (!years.length) return null;
    const metrics = years.map((y, i) => yearMetrics(y, i > 0 ? years[i - 1] : null, taxRate));
    const latestRaw = years[years.length - 1];
    const prevRaw = years.length > 1 ? years[years.length - 2] : null;
    const latest = metrics[metrics.length - 1];
    const first = years[0];
    const periods = years.length - 1;
    const growthInfo = {
      periods,
      revenueCagr: cagr(first.revenue, latestRaw.revenue, periods),
      operatingIncomeCagr: cagr(first.operatingIncome, latestRaw.operatingIncome, periods),
      netIncomeCagr: cagr(first.netIncome, latestRaw.netIncome, periods),
      epsCagr: cagr(first.netIncome / first.shares, latestRaw.netIncome / latestRaw.shares, periods),
      fcfCagr: cagr(first.operatingCashFlow - first.capex, latestRaw.operatingCashFlow - latestRaw.capex, periods)
    };
    const val = valuation(company, latestRaw, latest);
    if (val.per != null && growthInfo.epsCagr != null && growthInfo.epsCagr > 0) val.peg = val.per / (growthInfo.epsCagr * 100);

    const result = {
      company,
      years,
      metrics,
      latest,
      latestRaw,
      growth: growthInfo,
      valuation: val,
      piotroski: piotroski(latestRaw, prevRaw),
      altman: altmanZ(latestRaw, val.marketCap)
    };
    result.scorecard = scorecard(result);
    result.insights = insights(result);
    return result;
  }

  /** 입력 데이터 검증 — 경고 메시지 배열 반환 */
  function validate(company) {
    const warnings = [];
    for (const y of company.years) {
      const gap = y.totalAssets - (y.totalLiabilities + y.equity);
      if (Math.abs(gap) > Math.max(1, Math.abs(y.totalAssets) * 0.01))
        warnings.push(`${y.year}년: 자산총계(${y.totalAssets}) ≠ 부채총계 + 자본총계(${y.totalLiabilities + y.equity})`);
      if (y.currentAssets > y.totalAssets) warnings.push(`${y.year}년: 유동자산이 자산총계보다 큽니다.`);
      if (!(y.shares > 0)) warnings.push(`${y.year}년: 발행주식수가 필요합니다.`);
    }
    return warnings;
  }

  const api = { UNIT, DEFAULT_TAX_RATE, cagr, growth, yearMetrics, valuation, piotroski, altmanZ, dcf, dcfSensitivity, scale, grade, scorecard, analyze, validate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FA = api;
})(typeof window !== 'undefined' ? window : globalThis);
