/*
 * 의존성 없는 SVG 차트 (막대 / 꺾은선) + 호버 툴팁
 * 색상은 CSS 변수(--series-1..3)를 참조하므로 라이트/다크 모드에 자동 대응
 */
(function (root) {
  const NS = 'http://www.w3.org/2000/svg';
  const H = 240;
  const M = { top: 14, right: 12, bottom: 26, left: 58 };

  function el(tag, attrs = {}, parent) {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (parent) parent.appendChild(n);
    return n;
  }

  function niceTicks(min, max, count = 5) {
    if (min === max) {
      max = max === 0 ? 1 : max * 1.2;
      min = min > 0 ? 0 : min;
    }
    const span = max - min;
    const raw = span / count;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map((s) => s * mag).find((s) => span / s <= count) || 10 * mag;
    const lo = Math.floor(min / step) * step;
    const hi = Math.ceil(max / step) * step;
    const ticks = [];
    for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v / step) * step);
    return ticks;
  }

  function tooltip(container) {
    let tip = container.querySelector('.chart-tip');
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'chart-tip';
      tip.setAttribute('role', 'status');
      container.appendChild(tip);
    }
    return {
      show(html, x, y) {
        tip.innerHTML = html;
        tip.style.display = 'block';
        const cw = container.clientWidth;
        const tw = tip.offsetWidth;
        let left = x + 14;
        if (left + tw > cw) left = x - tw - 14;
        tip.style.left = Math.max(0, left) + 'px';
        tip.style.top = Math.max(0, y - 10) + 'px';
      },
      hide() {
        tip.style.display = 'none';
      }
    };
  }

  function legend(container, series) {
    if (series.length < 2) return;
    const lg = document.createElement('div');
    lg.className = 'chart-legend';
    series.forEach((s, i) => {
      const item = document.createElement('span');
      item.className = 'legend-item';
      item.innerHTML = `<span class="swatch ${s.type === 'line' ? 'swatch-line' : ''}" style="background:var(--series-${i + 1})"></span>${s.name}`;
      lg.appendChild(item);
    });
    container.appendChild(lg);
  }

  function tipHtml(category, series, idx, fmt) {
    const rows = series
      .map(
        (s, i) =>
          `<div class="tip-row"><span class="swatch" style="background:var(--series-${i + 1})"></span><span>${s.name}</span><b>${
            s.values[idx] == null ? '–' : fmt(s.values[idx])
          }</b></div>`
      )
      .join('');
    return `<div class="tip-title">${category}</div>${rows}`;
  }

  /**
   * render(container, { type: 'bar'|'line', categories, series:[{name, values}], format })
   */
  function render(container, cfg) {
    container.innerHTML = '';
    container.classList.add('chart');
    const fmt = cfg.format || ((v) => v.toLocaleString('ko-KR'));
    const axisFmt = cfg.axisFormat || fmt;
    legend(container, cfg.series.map((s) => ({ ...s, type: cfg.type })));

    const W = Math.max(280, container.clientWidth || 600);
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', height: H, role: 'img', 'aria-label': cfg.title || '차트' });
    container.appendChild(svg);
    const tip = tooltip(container);

    const all = cfg.series.flatMap((s) => s.values).filter((v) => v != null && Number.isFinite(v));
    let min = Math.min(0, ...all);
    let max = Math.max(0, ...all);
    if (cfg.type === 'line' && all.length) {
      min = Math.min(...all, cfg.zeroBased === false ? Infinity : 0);
      max = Math.max(...all);
    }
    const ticks = niceTicks(min, max);
    const yMin = ticks[0];
    const yMax = ticks[ticks.length - 1];
    const iw = W - M.left - M.right;
    const ih = H - M.top - M.bottom;
    const y = (v) => M.top + ih - ((v - yMin) / (yMax - yMin)) * ih;
    const n = cfg.categories.length;
    const band = iw / n;
    const cx = (i) => M.left + band * i + band / 2;

    // 그리드 & 축
    const grid = el('g', { class: 'grid' }, svg);
    ticks.forEach((t) => {
      el('line', { x1: M.left, x2: W - M.right, y1: y(t), y2: y(t), class: t === 0 ? 'baseline' : 'gridline' }, grid);
      const lbl = el('text', { x: M.left - 8, y: y(t) + 4, 'text-anchor': 'end', class: 'axis-label' }, grid);
      lbl.textContent = axisFmt(t);
    });
    cfg.categories.forEach((c, i) => {
      const lbl = el('text', { x: cx(i), y: H - 6, 'text-anchor': 'middle', class: 'axis-label' }, grid);
      lbl.textContent = c;
    });

    const plot = el('g', {}, svg);
    const hover = el('g', {}, svg);
    const crosshair = el('line', { y1: M.top, y2: M.top + ih, class: 'crosshair', visibility: 'hidden' }, hover);

    if (cfg.type === 'bar') {
      const k = cfg.series.length;
      const groupW = Math.min(band * 0.72, 30 * k + 2 * (k - 1));
      const gap = 2;
      const bw = (groupW - gap * (k - 1)) / k;
      const r = Math.min(4, bw / 2);
      cfg.series.forEach((s, si) => {
        s.values.forEach((v, i) => {
          if (v == null) return;
          const x0 = cx(i) - groupW / 2 + si * (bw + gap);
          const y0 = y(0);
          const y1 = y(v);
          const h = Math.abs(y0 - y1);
          if (h < 0.5) return;
          const rr = Math.min(r, h);
          let d;
          if (v >= 0) {
            d = `M${x0},${y0} V${y1 + rr} Q${x0},${y1} ${x0 + rr},${y1} H${x0 + bw - rr} Q${x0 + bw},${y1} ${x0 + bw},${y1 + rr} V${y0} Z`;
          } else {
            d = `M${x0},${y0} V${y1 - rr} Q${x0},${y1} ${x0 + rr},${y1} H${x0 + bw - rr} Q${x0 + bw},${y1} ${x0 + bw},${y1 - rr} V${y0} Z`;
          }
          el('path', { d, fill: `var(--series-${si + 1})`, class: 'bar' }, plot);
        });
      });
    } else {
      cfg.series.forEach((s, si) => {
        const pts = s.values.map((v, i) => (v == null ? null : [cx(i), y(v)]));
        let d = '';
        let pen = false;
        pts.forEach((p) => {
          if (!p) return (pen = false);
          d += (pen ? 'L' : 'M') + p[0] + ',' + p[1] + ' ';
          pen = true;
        });
        el('path', { d, fill: 'none', stroke: `var(--series-${si + 1})`, class: 'line' }, plot);
        pts.forEach((p) => p && el('circle', { cx: p[0], cy: p[1], r: 4, fill: `var(--series-${si + 1})`, class: 'dot' }, plot));
      });
    }

    // 카테고리별 호버 영역 (마크보다 큰 히트 영역)
    cfg.categories.forEach((c, i) => {
      const hit = el('rect', { x: M.left + band * i, y: M.top, width: band, height: ih, class: 'hit' }, hover);
      const onMove = (ev) => {
        crosshair.setAttribute('x1', cx(i));
        crosshair.setAttribute('x2', cx(i));
        if (cfg.type === 'line') crosshair.setAttribute('visibility', 'visible');
        hit.classList.add('active');
        const rect = container.getBoundingClientRect();
        const px = (ev.clientX ?? rect.left + (cx(i) / W) * rect.width) - rect.left;
        const py = (ev.clientY ?? rect.top + 40) - rect.top;
        tip.show(tipHtml(c, cfg.series, i, fmt), px, py);
      };
      hit.addEventListener('mousemove', onMove);
      hit.addEventListener('touchstart', (ev) => onMove(ev.touches[0]), { passive: true });
      hit.addEventListener('mouseleave', () => {
        crosshair.setAttribute('visibility', 'hidden');
        hit.classList.remove('active');
        tip.hide();
      });
    });
  }

  root.FACharts = { render };
})(window);
