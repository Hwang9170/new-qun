const test = require('node:test');
const assert = require('node:assert/strict');
const FA = require('../js/analysis.js');
const { SAMPLE_COMPANIES } = require('../js/data.js');

const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);

test('샘플 데이터는 재무상태표 항등식을 만족한다', () => {
  for (const c of SAMPLE_COMPANIES) assert.deepEqual(FA.validate(c), [], c.name);
});

test('CAGR', () => {
  close(FA.cagr(100, 121, 2), 0.1);
  assert.equal(FA.cagr(-100, 121, 2), null);
});

test('연도별 지표: 마진, 부채비율, EPS', () => {
  const [prev, cur] = SAMPLE_COMPANIES[1].years.slice(-2);
  const m = FA.yearMetrics(cur, prev);
  close(m.operatingMargin, 1900 / 25000);
  close(m.debtRatio, 6300 / 12700);
  close(m.eps, (1420 * 1e8) / 10000000);
  close(m.roe, 1420 / ((11660 + 12700) / 2));
  close(m.fcf, 2150 - 880);
});

test('DCF: 성장 0, 영구성장 0이면 영구연금 가치와 같다', () => {
  const r = FA.dcf({ baseFcf: 100, growth: 0, years: 5, discount: 0.1, terminal: 0, netDebt: 0, shares: 1e8 });
  close(r.enterpriseValue, 1000, 1e-6);
  close(r.perShare, 1000);
  assert.equal(FA.dcf({ baseFcf: 100, growth: 0, years: 5, discount: 0.02, terminal: 0.03, netDebt: 0, shares: 1 }), null);
});

test('Piotroski / Altman 결과가 기업 성격과 일치한다', () => {
  const byId = Object.fromEntries(SAMPLE_COMPANIES.map((c) => [c.id, FA.analyze(c)]));
  assert.ok(byId['sample-onsaemiro'].piotroski.score >= 7);
  assert.ok(byId['sample-daeyang'].piotroski.score <= 3);
  assert.equal(byId['sample-daeyang'].altman.zone, 'distress');
  assert.equal(byId['sample-hanbit'].altman.zone, 'safe');
});

test('종합 점수: 우량 기업이 부실 기업보다 높다', () => {
  const s = SAMPLE_COMPANIES.map((c) => [c.id, FA.analyze(c).scorecard.total]);
  const map = Object.fromEntries(s);
  for (const [id, v] of s) assert.ok(v >= 0 && v <= 100, id);
  assert.ok(map['sample-hanbit'] > map['sample-daeyang']);
  assert.ok(map['sample-nuri'] > map['sample-daeyang']);
});
