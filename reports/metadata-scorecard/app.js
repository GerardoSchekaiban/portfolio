/*
 * Metadata Quality Scorecard (demo) — Summary tab behaviour.
 * All data comes from data.js and is fictional.
 */
(function () {
  "use strict";

  const D = window.ScorecardData;
  const ALL = D.generate();

  const DEFAULTS = {
    certified: false, noMaster: false, status: "Active",
    domain: null, grade: null, covDiv: 50, qualDiv: 75, sort: "value",
  };
  const state = { ...DEFAULTS };
  const BASE = D.overall(D.filterTables(ALL, DEFAULTS)); // "all active tables" reference

  const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif';
  const GRADE = Object.fromEntries(D.GRADES.map((g) => [g.key, g]));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const rgba = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  };
  const covColor = (v) => (v >= 80 ? "#16a34a" : v >= 50 ? "#d97706" : "#dc2626");
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

  Chart.defaults.font.family = FONT;
  Chart.defaults.color = "#64748b";
  Chart.defaults.animation.duration = reduceMotion ? 0 : 450;

  // ===================================================================
  //  Derived view of the data for the current state
  // ===================================================================
  function compute() {
    const scope = D.filterTables(ALL, state);
    const domains = D.domainStats(scope);
    if (state.domain && !domains.some((d) => d.name === state.domain)) state.domain = null;
    const sel = state.domain ? scope.filter((t) => t.domain === state.domain) : scope;
    return { scope, domains, sel, overall: D.overall(sel) };
  }

  // A domain is "emphasised" unless another domain or grade is being focused
  const isOn = (d) =>
    (!state.domain || d.name === state.domain) && (!state.grade || d.grade === state.grade);

  function nextGrade(avg) {
    return [...D.GRADES].reverse().find((g) => g.min > avg) || null;
  }

  function tooltipLines(d) {
    const lines = [
      `${d.n} tables · ${d.covered} covered`,
      `Coverage ${d.coverage.toFixed(0)}% · Quality ${d.avg.toFixed(1)} (${d.grade})`,
    ];
    const need = D.tablesToTarget(d, 80);
    lines.push(need > 0 ? `→ Document ${need} more tables to reach 80% coverage` : "✓ Coverage target (80%) met");
    const ng = nextGrade(d.avg);
    lines.push(ng ? `→ +${(ng.min - d.avg).toFixed(1)} pts on average to reach ${ng.key}` : "✓ Top grade");
    return lines;
  }

  const tooltipBase = {
    backgroundColor: "#0b2239", padding: 12, cornerRadius: 8,
    titleFont: { weight: "700", size: 13 }, bodyFont: { size: 12 }, displayColors: false,
  };
  const pointer = (e, els) => { e.native.target.style.cursor = els.length ? "pointer" : "default"; };

  // ===================================================================
  //  Chart.js plugins
  // ===================================================================
  const quadrantPlugin = {
    id: "quadrants",
    beforeDatasetsDraw(chart) {
      const { ctx, chartArea: a, scales: { x, y } } = chart;
      const xd = x.getPixelForValue(state.covDiv);
      const yd = y.getPixelForValue(state.qualDiv);
      const doms = chart.$domains || [];
      const count = (hiCov, hiQual) =>
        doms.filter((d) => (d.coverage >= state.covDiv) === hiCov && (d.avg >= state.qualDiv) === hiQual).length;

      const quads = [
        { x0: a.left, x1: xd, y0: a.top, y1: yd, fill: "rgba(99,102,241,.07)", color: "#6366f1", t: "Low coverage · High quality", n: count(false, true) },
        { x0: xd, x1: a.right, y0: a.top, y1: yd, fill: "rgba(22,163,74,.09)", color: "#16a34a", t: "High coverage · High quality", n: count(true, true) },
        { x0: a.left, x1: xd, y0: yd, y1: a.bottom, fill: "rgba(220,38,38,.07)", color: "#dc2626", t: "Low coverage · Low quality", n: count(false, false) },
        { x0: xd, x1: a.right, y0: yd, y1: a.bottom, fill: "rgba(255,106,19,.09)", color: "#e8590c", t: "High coverage · Low quality", n: count(true, false) },
      ];
      ctx.save();
      ctx.font = `700 11px ${FONT}`;
      ctx.textBaseline = "top";
      for (const q of quads) {
        ctx.fillStyle = q.fill;
        ctx.fillRect(q.x0, q.y0, q.x1 - q.x0, q.y1 - q.y0);
        const text = `${q.t} · ${q.n}`;
        if (ctx.measureText(text).width < q.x1 - q.x0 - 16) {
          ctx.fillStyle = q.color;
          ctx.fillText(text, q.x0 + 10, q.y0 + 8);
        }
      }
      ctx.strokeStyle = "rgba(11,34,57,.35)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(xd, a.top); ctx.lineTo(xd, a.bottom);
      ctx.moveTo(a.left, yd); ctx.lineTo(a.right, yd);
      ctx.stroke();
      ctx.restore();
    },
  };

  // Draws each domain name next to its bubble, skipping labels that would collide
  const bubbleLabels = {
    id: "bubbleLabels",
    afterDatasetsDraw(chart) {
      const { ctx, chartArea: a } = chart;
      const pts = chart.getDatasetMeta(0).data;
      const doms = chart.$domains || [];
      const radii = chart.$radii || [];
      const order = doms.map((_, i) => i).sort((i, j) => radii[j] - radii[i]);
      const placed = [];
      const hitsCircle = (r, k) => {
        const cx = Math.max(r.x, Math.min(pts[k].x, r.x + r.w));
        const cy = Math.max(r.y, Math.min(pts[k].y, r.y + r.h));
        return (cx - pts[k].x) ** 2 + (cy - pts[k].y) ** 2 < (radii[k] + 1) ** 2;
      };
      ctx.save();
      ctx.font = `600 11px ${FONT}`;
      ctx.textBaseline = "top";
      ctx.lineJoin = "round";
      for (const i of order) {
        const d = doms[i], p = pts[i], r = radii[i];
        const w = ctx.measureText(d.name).width, h = 13;
        const cands = [
          { x: p.x + r + 5, y: p.y - h / 2 },
          { x: p.x - r - 5 - w, y: p.y - h / 2 },
          { x: p.x - w / 2, y: p.y - r - 4 - h },
          { x: p.x - w / 2, y: p.y + r + 4 },
        ];
        const spot = cands.find((c) => {
          const rect = { x: c.x, y: c.y, w, h };
          if (c.x < a.left - 4 || c.x + w > chart.width - 2 || c.y < a.top - 6 || c.y + h > a.bottom + 4) return false;
          if (placed.some((q) => rect.x < q.x + q.w + 3 && rect.x + w + 3 > q.x && rect.y < q.y + q.h + 1 && rect.y + h + 1 > q.y)) return false;
          return !pts.some((_, k) => k !== i && hitsCircle(rect, k));
        });
        if (!spot) continue;
        placed.push({ x: spot.x, y: spot.y, w, h });
        ctx.globalAlpha = isOn(d) ? 1 : 0.35;
        ctx.strokeStyle = "rgba(255,255,255,.9)";
        ctx.lineWidth = 3;
        ctx.strokeText(d.name, spot.x, spot.y);
        ctx.fillStyle = "#14212e";
        ctx.fillText(d.name, spot.x, spot.y);
      }
      ctx.restore();
    },
  };

  const refLines = {
    id: "refLines",
    afterDatasetsDraw(chart, _args, opts) {
      const { ctx, chartArea: a, scales: { y } } = chart;
      ctx.save();
      ctx.font = `700 11px ${FONT}`;
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      for (const l of opts.lines || []) {
        const py = y.getPixelForValue(l.value);
        ctx.strokeStyle = l.color; ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]);
        ctx.beginPath(); ctx.moveTo(a.left, py); ctx.lineTo(a.right, py); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = l.color;
        ctx.fillText(l.label, a.right - 2, py - 3);
      }
      ctx.restore();
    },
  };

  const valueLabels = {
    id: "valueLabels",
    afterDatasetsDraw(chart) {
      if (!chart.$fmt) return;
      const { ctx } = chart;
      const horizontal = chart.options.indexAxis === "y";
      ctx.save();
      ctx.font = `700 11px ${FONT}`;
      chart.getDatasetMeta(0).data.forEach((el, i) => {
        ctx.globalAlpha = chart.$dim && chart.$dim(i) ? 0.35 : 1;
        ctx.fillStyle = chart.$color ? chart.$color(i) : "#334155";
        if (horizontal) {
          ctx.textAlign = "left"; ctx.textBaseline = "middle";
          ctx.fillText(chart.$fmt(i), el.x + 6, el.y);
        } else {
          ctx.textAlign = "center"; ctx.textBaseline = "bottom";
          ctx.fillText(chart.$fmt(i), el.x, el.y - 5);
        }
      });
      ctx.restore();
    },
  };

  const donutCenter = {
    id: "donutCenter",
    afterDraw(chart) {
      const { ctx, chartArea: a } = chart;
      const cx = (a.left + a.right) / 2, cy = (a.top + a.bottom) / 2;
      ctx.save();
      ctx.textAlign = "center";
      ctx.fillStyle = "#14212e";
      ctx.font = `800 30px ${FONT}`;
      ctx.textBaseline = "alphabetic";
      ctx.fillText(String(chart.$total ?? 0), cx, cy + 6);
      ctx.fillStyle = "#64748b";
      ctx.font = `600 12px ${FONT}`;
      ctx.fillText("tables", cx, cy + 24);
      ctx.restore();
    },
  };

  // ===================================================================
  //  Charts
  // ===================================================================
  const toggleDomain = (name) => { state.domain = state.domain === name ? null : name; render(); };

  const quad = new Chart($("#c-quad"), {
    type: "bubble",
    data: { datasets: [{ data: [], clip: false, borderWidth: 2 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      layout: { padding: { top: 14, right: 22, bottom: 2 } },
      interaction: { mode: "nearest", intersect: true },
      scales: {
        x: { min: 0, max: 100, grid: { color: "#e6ecf2" }, ticks: { stepSize: 10, callback: (v) => v + "%" },
             title: { display: true, text: "Metadata coverage (% of tables covered)" } },
        y: { min: 0, max: 100, grid: { color: "#e6ecf2" }, ticks: { stepSize: 25 },
             title: { display: true, text: "Avg quality score /100" } },
      },
      plugins: {
        legend: { display: false },
        tooltip: { ...tooltipBase, callbacks: {
          title: (items) => quad.$domains[items[0].dataIndex].name,
          label: (item) => tooltipLines(quad.$domains[item.dataIndex]),
        } },
      },
      onClick: (_e, els) => { if (els.length) toggleDomain(quad.$domains[els[0].index].name); },
      onHover: pointer,
    },
    plugins: [quadrantPlugin, bubbleLabels],
  });

  function domainBar(canvasId, yTicks, lines, tipFn) {
    const chart = new Chart($(canvasId), {
      type: "bar",
      data: { labels: [], datasets: [{ data: [], borderWidth: 2, borderRadius: 5, borderSkipped: false }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        layout: { padding: { top: 22 } },
        interaction: { mode: "index", intersect: false, axis: "x" },
        scales: {
          x: { grid: { display: false }, ticks: { maxRotation: 55, minRotation: 45, font: { size: 11 } } },
          y: { min: 0, max: 100, ticks: { stepSize: yTicks.step, callback: yTicks.fmt }, grid: { color: "#e6ecf2" } },
        },
        plugins: {
          legend: { display: false },
          refLines: { lines },
          tooltip: { ...tooltipBase, callbacks: {
            title: (items) => chart.$domains[items[0].dataIndex].name,
            label: (item) => tipFn(chart.$domains[item.dataIndex]),
          } },
        },
        onClick: (_e, els) => { if (els.length) toggleDomain(chart.$domains[els[0].index].name); },
        onHover: pointer,
      },
      plugins: [refLines, valueLabels],
    });
    return chart;
  }

  const covChart = domainBar("#c-cov", { step: 20, fmt: (v) => v + "%" },
    [{ value: 80, label: "Target 80%", color: "#16a34a" }, { value: 50, label: "50%", color: "#d97706" }],
    tooltipLines);
  const qualChart = domainBar("#c-qual", { step: 20, fmt: (v) => v },
    [{ value: 90, label: "Platinum 90", color: "#7c3aed" }, { value: 75, label: "Gold 75", color: "#d97706" }],
    tooltipLines);

  const dimsChart = new Chart($("#c-dims"), {
    type: "bar",
    data: { labels: [], datasets: [{ data: [], borderWidth: 0, borderRadius: 5 }] },
    options: {
      indexAxis: "y", responsive: true, maintainAspectRatio: false,
      layout: { padding: { right: 10 } },
      scales: {
        x: { min: 0, max: 118, grid: { color: "#e6ecf2" }, ticks: { stepSize: 25, callback: (v) => (v > 100 ? "" : v + "%") } },
        y: { grid: { display: false }, ticks: { font: { size: 12 } } },
      },
      plugins: {
        legend: { display: false },
        tooltip: { ...tooltipBase, callbacks: {
          label: (item) => {
            const d = dimsChart.$dims[item.dataIndex];
            return [`${d.avg.toFixed(1)} of ${d.max} pts earned on average`, d.rule];
          },
        } },
      },
    },
    plugins: [valueLabels],
  });

  const gradeChart = new Chart($("#c-grades"), {
    type: "doughnut",
    data: { labels: D.GRADES.map((g) => g.key), datasets: [{ data: [], backgroundColor: D.GRADES.map((g) => g.color), borderColor: "#fff", borderWidth: 3 }] },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: "66%",
      plugins: { legend: { display: false }, tooltip: { ...tooltipBase, callbacks: {
        label: (i) => ` ${i.label}: ${i.raw} tables (${gradeChart.$total ? ((i.raw / gradeChart.$total) * 100).toFixed(0) : 0}%)`,
      } } },
    },
    plugins: [donutCenter],
  });

  // ===================================================================
  //  Rendering
  // ===================================================================
  function animateNumber(el, to, decimals) {
    const fmt = (v) => v.toFixed(decimals);
    const from = parseFloat(el.dataset.v || "0");
    el.dataset.v = to;
    cancelAnimationFrame(el._raf);
    clearTimeout(el._done);
    if (reduceMotion || from === to) { el.textContent = fmt(to); return; }
    const t0 = performance.now(), dur = 450;
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      el.textContent = fmt(from + (to - from) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) el._raf = requestAnimationFrame(step);
    };
    el._raf = requestAnimationFrame(step);
    // Safety net: browsers pause animation frames in background tabs, so always land on the real value
    el._done = setTimeout(() => { cancelAnimationFrame(el._raf); el.textContent = fmt(to); }, dur + 60);
  }

  function setDelta(el, text, kind) {
    el.textContent = text;
    el.className = "delta " + (kind || "flat");
  }

  function renderKpis(v) {
    const o = v.overall;
    const pristine = isDefaultView();
    const k = (name) => $(`.kpi[data-kpi="${name}"]`);

    animateNumber($(".num", k("avg")), o.avg, 1);
    animateNumber($(".num", k("coverage")), o.coverage, 0);
    animateNumber($(".num", k("n")), o.n, 0);
    animateNumber($(".num", k("uncovered")), o.uncovered, 0);
    animateNumber($(".num", k("unscored")), o.unscored, 0);

    const colorClass = (el, c) => { el.classList.remove("c-green", "c-amber", "c-red"); if (c) el.classList.add(c); };
    colorClass($(".val", k("avg")), o.n ? (o.avg >= 75 ? "c-green" : o.avg >= 50 ? "c-amber" : "c-red") : "");
    colorClass($(".val", k("coverage")), o.n ? (o.coverage >= 80 ? "c-green" : o.coverage >= 50 ? "c-amber" : "c-red") : "");

    $("#kpi-cov-sub").textContent = `${o.covered} of ${o.n} tables`;

    const pctOf = (a, b) => (b ? Math.round((a / b) * 100) : 0);
    const delta = (el, d, unit, goodWhenUp) => {
      if (pristine) return setDelta(el, "All active tables", "flat");
      if (!o.n || Math.abs(d) < 0.05) return setDelta(el, `No change vs all active`, "flat");
      const up = d > 0;
      setDelta(el, `${up ? "▲" : "▼"} ${Math.abs(d).toFixed(1)}${unit} vs all active`, up === goodWhenUp ? "good" : "bad");
    };
    delta($(".delta", k("avg")), o.avg - BASE.avg, "", true);
    delta($(".delta", k("coverage")), o.coverage - BASE.coverage, " pts", true);
    setDelta($(".delta", k("n")), pristine ? "All active tables" : `${pctOf(o.n, BASE.n)}% of all active tables`, "flat");
    setDelta($(".delta", k("uncovered")), `${pctOf(o.uncovered, o.n)}% of tables in view`, "flat");
    setDelta($(".delta", k("unscored")), `${pctOf(o.unscored, o.n)}% of tables in view`, "flat");
  }

  function renderLegend(v) {
    const box = $("#grade-legend");
    box.innerHTML = "";
    for (const g of D.GRADES) {
      const n = v.domains.filter((d) => d.grade === g.key).length;
      const b = document.createElement("button");
      b.className = "gl" + (state.grade === g.key ? " active" : "");
      b.setAttribute("aria-pressed", String(state.grade === g.key));
      b.title = "Highlight the domains whose average score falls in this band";
      b.innerHTML = `<i style="background:${g.color}"></i>${g.key} ${g.range} <small>· ${plural(n, "domain")}</small>`;
      b.addEventListener("click", () => { state.grade = state.grade === g.key ? null : g.key; render(); });
      box.append(b);
    }
  }

  function renderQuad(v) {
    const doms = [...v.domains].sort((a, b) => b.n - a.n);
    quad.$domains = doms;
    quad.$radii = doms.map((d) => 6 + Math.sqrt(d.n) * 1.7);
    const ds = quad.data.datasets[0];
    ds.data = doms.map((d, i) => ({ x: +d.coverage.toFixed(1), y: +d.avg.toFixed(1), r: quad.$radii[i] }));
    ds.backgroundColor = doms.map((d) => rgba(GRADE[d.grade].color, isOn(d) ? 0.6 : 0.1));
    ds.borderColor = doms.map((d) => rgba(GRADE[d.grade].color, isOn(d) ? 1 : 0.25));
    ds.borderWidth = doms.map((d) => (state.domain === d.name ? 4 : 2));
    quad.update();
    renderQuadInsight(doms, v);
  }

  function renderQuadInsight(doms, v) {
    const el = $("#quad-insight");
    if (!doms.length) { el.textContent = "No tables match the current filters."; return; }
    const lclq = doms.filter((d) => d.coverage < state.covDiv && d.avg < state.qualDiv);
    if (!lclq.length) {
      el.innerHTML = `No domain falls in <strong>low coverage × low quality</strong> at these thresholds.`;
      return;
    }
    const tables = lclq.reduce((s, d) => s + d.n, 0);
    const share = Math.round((tables / v.scope.length) * 100);
    const names = lclq.map((d) => esc(d.name));
    const list = names.length > 3 ? `${names.slice(0, 3).join(", ")} and ${names.length - 3} more` : names.join(", ");
    el.innerHTML =
      `<strong>${lclq.length} of ${doms.length} domains</strong> sit in low coverage × low quality (${list}). ` +
      `Together they hold <strong>${tables} tables (${share}% of the view)</strong>, the area where documentation effort pays off most.`;
  }

  function sortedDomains(v, key) {
    const list = [...v.domains];
    return state.sort === "name"
      ? list.sort((a, b) => a.name.localeCompare(b.name))
      : list.sort((a, b) => b[key] - a[key]);
  }

  function renderBars(v) {
    const cov = sortedDomains(v, "coverage");
    covChart.$domains = cov;
    covChart.data.labels = cov.map((d) => d.name);
    const cds = covChart.data.datasets[0];
    cds.data = cov.map((d) => +d.coverage.toFixed(1));
    cds.backgroundColor = cov.map((d) => rgba(covColor(d.coverage), isOn(d) ? 0.16 : 0.05));
    cds.borderColor = cov.map((d) => rgba(covColor(d.coverage), isOn(d) ? 1 : 0.3));
    covChart.$fmt = (i) => Math.round(cov[i].coverage) + "%";
    covChart.$dim = (i) => !isOn(cov[i]);
    covChart.$color = (i) => covColor(cov[i].coverage);
    covChart.update();

    const q = sortedDomains(v, "avg");
    qualChart.$domains = q;
    qualChart.data.labels = q.map((d) => d.name);
    const qds = qualChart.data.datasets[0];
    qds.data = q.map((d) => +d.avg.toFixed(1));
    qds.backgroundColor = q.map((d) => rgba(GRADE[d.grade].color, isOn(d) ? 0.18 : 0.05));
    qds.borderColor = q.map((d) => rgba(GRADE[d.grade].color, isOn(d) ? 1 : 0.3));
    qualChart.$fmt = (i) => q[i].avg.toFixed(1);
    qualChart.$dim = (i) => !isOn(q[i]);
    qualChart.$color = (i) => GRADE[q[i].grade].color;
    qualChart.update();
  }

  function renderDims(v) {
    const dims = D.dimensionAverages(v.sel);
    dimsChart.$dims = dims;
    dimsChart.data.labels = dims.map((d) => d.label);
    const weakest = v.sel.length ? dims.reduce((m, d) => (d.pct < m.pct ? d : m), dims[0]) : null;
    const strongest = v.sel.length ? dims.reduce((m, d) => (d.pct > m.pct ? d : m), dims[0]) : null;
    const ds = dimsChart.data.datasets[0];
    ds.data = dims.map((d) => +d.pct.toFixed(1));
    ds.backgroundColor = dims.map((d) => (d === weakest ? "#ff6a13" : "#12304f"));
    dimsChart.$fmt = (i) => `${dims[i].avg.toFixed(1)} / ${dims[i].max}`;
    dimsChart.$color = (i) => (dims[i] === weakest ? "#e8590c" : "#334155");
    dimsChart.update();

    const where = state.domain ? esc(state.domain) : "this view";
    $("#dims-insight").innerHTML = weakest
      ? `In ${where}, the weakest area is <strong>${weakest.label}</strong> (${weakest.pct.toFixed(0)}% of available points); the strongest is ${strongest.label} (${strongest.pct.toFixed(0)}%).`
      : "No tables match the current filters.";
  }

  function renderGrades(v) {
    const counts = D.gradeCounts(v.sel);
    gradeChart.$total = v.sel.length;
    gradeChart.data.datasets[0].data = counts.map((c) => c.count);
    gradeChart.update();
    $("#grade-list").innerHTML = counts.map((c) =>
      `<li><i style="background:${c.color}"></i><span>${c.key} <small style="color:#64748b">${c.range}</small></span>` +
      `<span class="n">${c.count}</span><span class="pct">${v.sel.length ? Math.round((c.count / v.sel.length) * 100) : 0}%</span></li>`
    ).join("");
  }

  function renderPriorities(v) {
    const list = $("#priorities");
    const ranked = v.domains
      .filter((d) => d.avg < 75)
      .map((d) => ({ d, impact: d.n * (75 - d.avg) }))
      .sort((a, b) => b.impact - a.impact)
      .slice(0, 5);
    if (!ranked.length) {
      list.innerHTML = `<li class="empty">${v.domains.length
        ? "Every domain in this view is at Gold or above. Nothing urgent."
        : "No tables match the current filters."}</li>`;
      return;
    }
    list.innerHTML = "";
    ranked.forEach(({ d }, i) => {
      const dims = D.dimensionAverages(d.tables);
      const weak = dims.reduce((m, x) => (x.pct < m.pct ? x : m), dims[0]);
      const need = D.tablesToTarget(d, 80);
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.className = "prio" + (state.domain === d.name ? " active" : "");
      b.innerHTML =
        `<span class="rank">${i + 1}</span>` +
        `<span class="name">${esc(d.name)}<small>${plural(d.n, "table")} · ${d.coverage.toFixed(0)}% covered</small></span>` +
        `<span class="why">${need > 0 ? `Document <b>${need}</b> more tables to reach 80% coverage` : "Coverage target met"}. ` +
        `Weakest area: <b>${weak.label}</b> (${weak.pct.toFixed(0)}% of points).` +
        `<span class="bar"><span style="width:${Math.min(100, (d.coverage / 80) * 100)}%"></span></span></span>` +
        `<span class="tag" style="background:${GRADE[d.grade].color}">${d.avg.toFixed(1)} · ${d.grade}</span>`;
      b.addEventListener("click", () => toggleDomain(d.name));
      li.append(b);
      list.append(li);
    });
  }

  function isDefaultView() {
    return !state.certified && !state.noMaster && state.status === "Active" && !state.domain;
  }
  function isAnyChanged() {
    return !isDefaultView() || state.grade || state.covDiv !== DEFAULTS.covDiv || state.qualDiv !== DEFAULTS.qualDiv;
  }

  function renderControls(v) {
    $("#f-cert").setAttribute("aria-pressed", String(state.certified));
    $("#f-master").setAttribute("aria-pressed", String(state.noMaster));
    $("#f-status").value = state.status;

    const sel = $("#f-domain");
    const names = v.domains.map((d) => d.name).sort((a, b) => a.localeCompare(b));
    sel.innerHTML = `<option value="">All domains</option>` + names.map((n) => `<option value="${esc(n)}">${esc(n)}</option>`).join("");
    sel.value = state.domain || "";

    $("#scope-count").textContent =
      `${v.sel.length} of ${ALL.length} tables · ${state.status}${state.certified ? " · certified" : ""}`;

    const chips = $("#chips");
    chips.innerHTML = "";
    const addChip = (label, onClear) => {
      const c = document.createElement("button");
      c.className = "chip";
      c.innerHTML = `${esc(label)} <b aria-hidden="true">✕</b>`;
      c.setAttribute("aria-label", `Clear ${label}`);
      c.addEventListener("click", onClear);
      chips.append(c);
    };
    if (state.domain) addChip(`Domain: ${state.domain}`, () => { state.domain = null; render(); });
    if (state.grade) addChip(`Highlighting: ${state.grade}`, () => { state.grade = null; render(); });

    $("#f-reset").hidden = !isAnyChanged();
    $("#s-cov").value = state.covDiv; $("#o-cov").textContent = state.covDiv + "%";
    $("#s-qual").value = state.qualDiv; $("#o-qual").textContent = state.qualDiv;
    $$(".seg").forEach((b) => {
      const on = b.dataset.sort === state.sort;
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", String(on));
    });
  }

  function render() {
    const v = compute();
    renderControls(v);
    renderKpis(v);
    renderLegend(v);
    renderQuad(v);
    renderDims(v);
    renderGrades(v);
    renderBars(v);
    renderPriorities(v);
  }

  // ===================================================================
  //  Events
  // ===================================================================
  $("#f-cert").addEventListener("click", () => { state.certified = !state.certified; render(); });
  $("#f-master").addEventListener("click", () => { state.noMaster = !state.noMaster; render(); });
  $("#f-status").addEventListener("change", (e) => { state.status = e.target.value; render(); });
  $("#f-domain").addEventListener("change", (e) => { state.domain = e.target.value || null; render(); });
  $("#f-reset").addEventListener("click", () => {
    Object.assign(state, { ...DEFAULTS, sort: state.sort });
    render();
  });
  $$(".seg").forEach((b) => b.addEventListener("click", () => { state.sort = b.dataset.sort; render(); }));

  const onSlider = () => {
    const v = compute();
    renderQuad(v);
    $("#f-reset").hidden = !isAnyChanged();
  };
  $("#s-cov").addEventListener("input", (e) => { state.covDiv = +e.target.value; $("#o-cov").textContent = state.covDiv + "%"; onSlider(); });
  $("#s-qual").addEventListener("input", (e) => { state.qualDiv = +e.target.value; $("#o-qual").textContent = state.qualDiv; onSlider(); });

  // Tabs
  $$(".tab").forEach((t) => t.addEventListener("click", () => {
    $$(".tab").forEach((x) => { x.classList.toggle("active", x === t); x.setAttribute("aria-selected", String(x === t)); });
    $$(".pane").forEach((p) => p.classList.toggle("active", p.id === "tab-" + t.dataset.tab));
    if (t.dataset.tab === "summary") [quad, covChart, qualChart, dimsChart, gradeChart].forEach((c) => c.resize());
  }));

  // About tab content, generated from the same rules the code uses
  $("#rules-body").innerHTML = D.DIMENSIONS.map((d) =>
    `<tr><td>${d.label}</td><td>${d.max}</td><td>${d.rule}</td></tr>`).join("") +
    `<tr><td><strong>Total</strong></td><td>100</td><td></td></tr>`;
  $("#band-list").innerHTML = D.GRADES.map((g) =>
    `<li><i style="background:${g.color}"></i><strong>${g.key}</strong> ${g.range}</li>`).join("");

  render();
})();
