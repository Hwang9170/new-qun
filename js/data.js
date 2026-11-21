/*
 * 샘플 데이터 — 모두 '가상의 기업'입니다. 실제 기업의 재무 수치가 아닙니다.
 * 금액 단위: 억원 / 주가·주당 지표: 원 / 주식수: 주
 */
(function (root) {
  const SAMPLE_COMPANIES = [
    {
      id: 'sample-hanbit',
      name: '한빛반도체',
      ticker: 'HBS',
      sector: '반도체',
      price: 248000,
      sample: true,
      description: '메모리·시스템 반도체 장비를 만드는 가상의 성장 기업. 업황에 따라 이익 변동이 큼.',
      years: [
        { year: 2021, revenue: 42000, cogs: 26000, operatingIncome: 8400, interestExpense: 180, netIncome: 6500, depreciation: 3200, operatingCashFlow: 9800, capex: 6000, totalAssets: 60000, currentAssets: 24000, currentLiabilities: 11000, totalLiabilities: 18000, equity: 42000, cash: 9000, debt: 5000, retainedEarnings: 30000, shares: 50000000, dps: 1200 },
        { year: 2022, revenue: 51000, cogs: 30500, operatingIncome: 11200, interestExpense: 220, netIncome: 8700, depreciation: 3600, operatingCashFlow: 12100, capex: 8200, totalAssets: 69000, currentAssets: 27500, currentLiabilities: 12000, totalLiabilities: 19100, equity: 49900, cash: 11000, debt: 5200, retainedEarnings: 37950, shares: 50000000, dps: 1500 },
        { year: 2023, revenue: 38000, cogs: 27500, operatingIncome: 1900, interestExpense: 260, netIncome: 1100, depreciation: 4000, operatingCashFlow: 5200, capex: 7500, totalAssets: 70500, currentAssets: 25000, currentLiabilities: 12500, totalLiabilities: 20300, equity: 50200, cash: 8500, debt: 6800, retainedEarnings: 38300, shares: 50000000, dps: 1500 },
        { year: 2024, revenue: 55000, cogs: 33000, operatingIncome: 11800, interestExpense: 240, netIncome: 9100, depreciation: 4300, operatingCashFlow: 13600, capex: 7800, totalAssets: 79000, currentAssets: 31000, currentLiabilities: 13000, totalLiabilities: 20500, equity: 58500, cash: 12500, debt: 5800, retainedEarnings: 46650, shares: 50000000, dps: 1500 },
        { year: 2025, revenue: 68000, cogs: 39500, operatingIncome: 16300, interestExpense: 210, netIncome: 12700, depreciation: 4700, operatingCashFlow: 17900, capex: 9200, totalAssets: 90000, currentAssets: 37500, currentLiabilities: 13500, totalLiabilities: 19600, equity: 70400, cash: 17000, debt: 4500, retainedEarnings: 58600, shares: 50000000, dps: 1800 }
      ]
    },
    {
      id: 'sample-nuri',
      name: '누리식품',
      ticker: 'NRF',
      sector: '음식료',
      price: 128000,
      sample: true,
      description: '가공식품·음료를 판매하는 가상의 안정형 내수 기업. 성장은 느리지만 현금흐름과 배당이 꾸준함.',
      years: [
        { year: 2021, revenue: 21000, cogs: 14700, operatingIncome: 1550, interestExpense: 90, netIncome: 1150, depreciation: 650, operatingCashFlow: 1700, capex: 800, totalAssets: 15500, currentAssets: 7000, currentLiabilities: 4800, totalLiabilities: 6500, equity: 9000, cash: 1800, debt: 2500, retainedEarnings: 7000, shares: 10000000, dps: 3000 },
        { year: 2022, revenue: 22300, cogs: 15800, operatingIncome: 1480, interestExpense: 100, netIncome: 1080, depreciation: 680, operatingCashFlow: 1550, capex: 850, totalAssets: 16480, currentAssets: 7300, currentLiabilities: 5000, totalLiabilities: 6700, equity: 9780, cash: 1900, debt: 2600, retainedEarnings: 7780, shares: 10000000, dps: 3000 },
        { year: 2023, revenue: 23400, cogs: 16500, operatingIncome: 1650, interestExpense: 110, netIncome: 1220, depreciation: 700, operatingCashFlow: 1900, capex: 820, totalAssets: 17280, currentAssets: 7700, currentLiabilities: 4900, totalLiabilities: 6600, equity: 10680, cash: 2300, debt: 2400, retainedEarnings: 8680, shares: 10000000, dps: 3200 },
        { year: 2024, revenue: 24100, cogs: 16800, operatingIncome: 1780, interestExpense: 105, netIncome: 1330, depreciation: 720, operatingCashFlow: 2050, capex: 900, totalAssets: 18110, currentAssets: 8100, currentLiabilities: 4800, totalLiabilities: 6450, equity: 11660, cash: 2700, debt: 2200, retainedEarnings: 9660, shares: 10000000, dps: 3500 },
        { year: 2025, revenue: 25000, cogs: 17300, operatingIncome: 1900, interestExpense: 95, netIncome: 1420, depreciation: 750, operatingCashFlow: 2150, capex: 880, totalAssets: 19000, currentAssets: 8600, currentLiabilities: 4700, totalLiabilities: 6300, equity: 12700, cash: 3200, debt: 1900, retainedEarnings: 10700, shares: 10000000, dps: 3800 }
      ]
    },
    {
      id: 'sample-daeyang',
      name: '대양중공업',
      ticker: 'DYH',
      sector: '조선·기계',
      price: 9800,
      sample: true,
      description: '부채 부담이 큰 가상의 수주산업 기업. 저마진과 이자비용으로 적자가 이어지는 재무 위험 사례.',
      years: [
        { year: 2021, revenue: 52000, cogs: 48500, operatingIncome: 900, interestExpense: 1100, netIncome: -350, depreciation: 1800, operatingCashFlow: 1500, capex: 2200, totalAssets: 60000, currentAssets: 25000, currentLiabilities: 26000, totalLiabilities: 46000, equity: 14000, cash: 3000, debt: 24000, retainedEarnings: 3000, shares: 70000000, dps: 0 },
        { year: 2022, revenue: 47000, cogs: 45200, operatingIncome: -1200, interestExpense: 1250, netIncome: -2600, depreciation: 1850, operatingCashFlow: -800, capex: 1600, totalAssets: 61000, currentAssets: 24000, currentLiabilities: 28500, totalLiabilities: 49600, equity: 11400, cash: 2200, debt: 27500, retainedEarnings: 400, shares: 70000000, dps: 0 },
        { year: 2023, revenue: 55000, cogs: 51800, operatingIncome: 600, interestExpense: 1450, netIncome: -900, depreciation: 1900, operatingCashFlow: 900, capex: 1500, totalAssets: 63000, currentAssets: 25500, currentLiabilities: 29000, totalLiabilities: 50500, equity: 12500, cash: 3100, debt: 28000, retainedEarnings: -500, shares: 80000000, dps: 0 },
        { year: 2024, revenue: 58000, cogs: 53900, operatingIncome: 1300, interestExpense: 1500, netIncome: -150, depreciation: 1950, operatingCashFlow: 1700, capex: 1800, totalAssets: 65000, currentAssets: 26000, currentLiabilities: 30500, totalLiabilities: 52650, equity: 12350, cash: 2800, debt: 29500, retainedEarnings: -650, shares: 80000000, dps: 0 },
        { year: 2025, revenue: 54000, cogs: 51200, operatingIncome: -300, interestExpense: 1600, netIncome: -2100, depreciation: 2000, operatingCashFlow: 200, capex: 1400, totalAssets: 66000, currentAssets: 25000, currentLiabilities: 32000, totalLiabilities: 55750, equity: 10250, cash: 1900, debt: 32000, retainedEarnings: -2750, shares: 80000000, dps: 0 }
      ]
    },
    {
      id: 'sample-onsaemiro',
      name: '온새미로플랫폼',
      ticker: 'OSM',
      sector: '인터넷·플랫폼',
      price: 85000,
      sample: true,
      description: '빠르게 성장해 흑자 전환한 가상의 플랫폼 기업. 성장성은 높지만 밸류에이션 부담이 있음.',
      years: [
        { year: 2021, revenue: 3200, cogs: 1300, operatingIncome: -650, interestExpense: 30, netIncome: -720, depreciation: 250, operatingCashFlow: -300, capex: 400, totalAssets: 5800, currentAssets: 3900, currentLiabilities: 1300, totalLiabilities: 1800, equity: 4000, cash: 2800, debt: 400, retainedEarnings: -2500, shares: 27000000, dps: 0 },
        { year: 2022, revenue: 4800, cogs: 1850, operatingIncome: -320, interestExpense: 35, netIncome: -380, depreciation: 330, operatingCashFlow: 150, capex: 450, totalAssets: 6600, currentAssets: 4200, currentLiabilities: 1700, totalLiabilities: 2300, equity: 4300, cash: 2900, debt: 450, retainedEarnings: -2880, shares: 28000000, dps: 0 },
        { year: 2023, revenue: 6900, cogs: 2600, operatingIncome: 280, interestExpense: 40, netIncome: 210, depreciation: 420, operatingCashFlow: 820, capex: 520, totalAssets: 8800, currentAssets: 5900, currentLiabilities: 2100, totalLiabilities: 2900, equity: 5900, cash: 4200, debt: 500, retainedEarnings: -2670, shares: 30000000, dps: 0 },
        { year: 2024, revenue: 9400, cogs: 3400, operatingIncome: 980, interestExpense: 38, netIncome: 820, depreciation: 500, operatingCashFlow: 1650, capex: 600, totalAssets: 10220, currentAssets: 6800, currentLiabilities: 2500, totalLiabilities: 3500, equity: 6720, cash: 4900, debt: 450, retainedEarnings: -1850, shares: 30000000, dps: 0 },
        { year: 2025, revenue: 12600, cogs: 4400, operatingIncome: 1850, interestExpense: 35, netIncome: 1520, depreciation: 580, operatingCashFlow: 2600, capex: 700, totalAssets: 12340, currentAssets: 8300, currentLiabilities: 2900, totalLiabilities: 4100, equity: 8240, cash: 6200, debt: 400, retainedEarnings: -330, shares: 30000000, dps: 0 }
      ]
    }
  ];

  // 데이터 입력 화면에 표시되는 항목 정의 (순서 = 화면 순서)
  const FIELDS = [
    { key: 'revenue', label: '매출액', group: '손익계산서', unit: '억원' },
    { key: 'cogs', label: '매출원가', group: '손익계산서', unit: '억원' },
    { key: 'operatingIncome', label: '영업이익', group: '손익계산서', unit: '억원' },
    { key: 'interestExpense', label: '이자비용', group: '손익계산서', unit: '억원' },
    { key: 'netIncome', label: '당기순이익', group: '손익계산서', unit: '억원' },
    { key: 'depreciation', label: '감가상각비', group: '손익계산서', unit: '억원' },
    { key: 'totalAssets', label: '자산총계', group: '재무상태표', unit: '억원' },
    { key: 'currentAssets', label: '유동자산', group: '재무상태표', unit: '억원' },
    { key: 'cash', label: '현금및현금성자산', group: '재무상태표', unit: '억원' },
    { key: 'totalLiabilities', label: '부채총계', group: '재무상태표', unit: '억원' },
    { key: 'currentLiabilities', label: '유동부채', group: '재무상태표', unit: '억원' },
    { key: 'debt', label: '차입금(이자부부채)', group: '재무상태표', unit: '억원' },
    { key: 'equity', label: '자본총계', group: '재무상태표', unit: '억원' },
    { key: 'retainedEarnings', label: '이익잉여금', group: '재무상태표', unit: '억원' },
    { key: 'operatingCashFlow', label: '영업활동현금흐름', group: '현금흐름표', unit: '억원' },
    { key: 'capex', label: '설비투자(CAPEX)', group: '현금흐름표', unit: '억원' },
    { key: 'shares', label: '발행주식수', group: '주식', unit: '주' },
    { key: 'dps', label: '주당배당금(DPS)', group: '주식', unit: '원' }
  ];

  const api = { SAMPLE_COMPANIES, FIELDS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FAData = api;
})(typeof window !== 'undefined' ? window : globalThis);
