/*
 * AI Usage & Cost by User (demo) — behaviour.
 * All data comes from data.js and is fictional.
 */
(function () {
  "use strict";

  const D = window.UsageData;
  const { rows: ROWS, users: USERS } = D.generate();
  const VS = D.VISIBLE_START;
  const LAST = D.DAYS - 1;
  const NDAYS = LAST - VS + 1;

  const DEFAULT = { from: VS, to: LAST, product: null, model: null, user: null, query: "", metric: "cost" };
  const state = { ...DEFAULT };

  const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif';
  const TEAL = "#0097a7", ORANGE = "#ff6a13", NAVY = "#0b2239";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const METRIC_NAME = { cost: "Cost", tokens: "Tokens", requests: "Requests" };

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const num = (n) => Math.round(n).toLocaleString("en-US");
  const money = (v, d = 2) => "$" + v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  const pct = (v, d = 0) => (v * 100).toFixed(d) + "%";
  const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayLabel = (d) => `${D.iso(d)} (${WEEKDAY[D.dateOf(d).getUTCDay()]})`;
  const dayShort = (d) => D.iso(d).slice(5);
  const dayNice = (d) => D.dateOf(d).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

  function compact(n, digits = 2) {
    const a = Math.abs(n);
    if (a >= 1e9) return (n / 1e9).toFixed(digits) + "B";
    if (a >= 1e6) return (n / 1e6).toFixed(digits) + "M";
    if (a >= 1e4) return (n / 1e3).toFixed(1) + "K";
    return num(n);
  }
  const fmtMetric = (v, metric = state.metric) => (metric === "cost" ? money(v, 0) : compact(v));
  const axisMetric = (v) => (state.metric === "cost" ? "$" + num(v) : compact(v, 1).replace(".0", ""));

  Chart.defaults.font.family = FONT;
  Chart.defaults.color = "#64748b";
  Chart.defaults.animation.duration = reduce ? 0 : 400;

  // ===================================================================
  //  Data access
  // ===================================================================
  const rows = (skip) => D.filterRows(ROWS, USERS, state, skip);
  const prevWindow = () => D.previousWindow(state.from, state.to);
  const prevRows = () => D.filterRows(ROWS, USERS, { ...state, ...prevWindow() });
  const rangeLen = () => state.to - state.from + 1;

  const isFullRange = () => state.from === DEFAULT.from && state.to === DEFAULT.to;
  const isDefault = () =>
    isFullRange() && state.product == null && state.model == null && state.user == null && !state.query.trim();

  // ===================================================================
  //  Plugins
  // ===================================================================
  const tooltipBase = {
    backgroundColor: "rgba(11,34,57,.94)", padding: 12, cornerRadius: 8,
    titleFont: { weight: "700", size: 13 }, bodyFont: { size: 12 },
  };
  const pointer = (e, els) => { e.native.target.style.cursor = els.length ? "pointer" : "default"; };

  const valueLabels = {
    id: "valueLabels",
    afterDatasetsDraw(chart) {
      if (!chart.$fmt) return;
      const { ctx } = chart;
      ctx.save();
      ctx.font = `700 11px ${FONT}`;
      ctx.textAlign = "left"; ctx.textBaseline = "middle";
      chart.getDatasetMeta(0).data.forEach((el, i) => {
        ctx.globalAlpha = chart.$dim && chart.$dim(i) ? 0.35 : 1;
        ctx.fillStyle = "#334155";
        const txt = chart.$fmt(i);
        const w = ctx.measureText(txt).width;
        // keep the label inside the chart when the bar is nearly full width
        if (el.x + 6 + w > chart.chartArea.right + 24) { ctx.fillStyle = "#fff"; ctx.textAlign = "right"; ctx.fillText(txt, el.x - 6, el.y); ctx.textAlign = "left"; }
        else ctx.fillText(txt, el.x + 6, el.y);
      });
      ctx.restore();
    },
  };

  // Greys out the days outside the selected date range
  const rangeShade = {
    id: "rangeShade",
    afterDatasetsDraw(chart) {
      const r = chart.$range;
      if (!r) return;
      const { ctx, chartArea: a, scales: { x } } = chart;
      const step = x.getPixelForValue(1) - x.getPixelForValue(0);
      const left = x.getPixelForValue(r.from) - step / 2;
      const right = x.getPixelForValue(r.to) + step / 2;
      ctx.save();
      ctx.fillStyle = "rgba(238,242,246,.78)";
      if (left > a.left) ctx.fillRect(a.left, a.top, left - a.left, a.bottom - a.top);
      if (right < a.right) ctx.fillRect(right, a.top, a.right - right, a.bottom - a.top);
      ctx.restore();
    },
  };

  const brushPlugin = {
    id: "brush",
    afterDatasetsDraw(chart) {
      const b = chart.$brush;
      if (!b) return;
      const { ctx, chartArea: a, scales: { x } } = chart;
      const step = x.getPixelForValue(1) - x.getPixelForValue(0);
      const l = x.getPixelForValue(Math.min(b.a, b.b)) - step / 2;
      const r = x.getPixelForValue(Math.max(b.a, b.b)) + step / 2;
      ctx.save();
      ctx.fillStyle = "rgba(255,106,19,.18)";
      ctx.strokeStyle = "rgba(255,106,19,.9)";
      ctx.lineWidth = 1.5;
      ctx.fillRect(l, a.top, r - l, a.bottom - a.top);
      ctx.strokeRect(l, a.top, r - l, a.bottom - a.top);
      ctx.restore();
    },
  };

  const flagPlugin = {
    id: "flags",
    afterDatasetsDraw(chart) {
      if (!chart.$flags || !chart.$flags.length) return;
      const { ctx } = chart;
      const meta = chart.getDatasetMeta(0).data;
      ctx.save();
      ctx.font = `800 11px ${FONT}`;
      ctx.textAlign = "center"; ctx.textBaseline = "bottom";
      ctx.fillStyle = ORANGE;
      for (const f of chart.$flags) {
        const el = meta[f.i];
        if (el) ctx.fillText(`▲ ${f.ratio.toFixed(1)}×`, el.x, el.y - 4);
      }
      ctx.restore();
    },
  };

  const donutCenter = {
    id: "donutCenter",
    afterDraw(chart) {
      const c = chart.$center;
      if (!c) return;
      const { ctx, chartArea: a } = chart;
      const cx = (a.left + a.right) / 2, cy = (a.top + a.bottom) / 2;
      ctx.save();
      ctx.textAlign = "center";
      ctx.fillStyle = NAVY; ctx.font = `800 22px ${FONT}`; ctx.textBaseline = "alphabetic";
      ctx.fillText(c.big, cx, cy + 4);
      ctx.fillStyle = "#64748b"; ctx.font = `600 12px ${FONT}`;
      ctx.fillText(c.small, cx, cy + 22);
      ctx.restore();
    },
  };

  // ===================================================================
  //  Charts
  // ===================================================================
  const toggle = (key, value) => { state[key] = state[key] === value ? null : value; render(); };

  function hBar(canvasId, color, tooltipFn, onPick) {
    const chart = new Chart($(canvasId), {
      type: "bar",
      data: { labels: [], datasets: [{ data: [], backgroundColor: color, borderWidth: 0, borderRadius: 4, barPercentage: 0.78, categoryPercentage: 0.9 }] },
      options: {
        indexAxis: "y", responsive: true, maintainAspectRatio: false,
        layout: { padding: { right: 56 } },
        scales: {
          x: { beginAtZero: true, grid: { color: "#e6ecf2" }, ticks: { callback: axisMetric, maxRotation: 0 } },
          y: { grid: { display: false }, ticks: { font: { size: 12 }, color: "#334155" } },
        },
        plugins: { legend: { display: false }, tooltip: { ...tooltipBase, displayColors: false, callbacks: {
          title: (items) => chart.$list[items[0].dataIndex].label,
          label: (item) => tooltipFn(chart.$list[item.dataIndex]),
        } } },
        interaction: { mode: "nearest", axis: "y", intersect: false },
        onClick: (_e, els) => { if (els.length) onPick(chart.$list[els[0].index]); },
        onHover: pointer,
      },
      plugins: [valueLabels],
    });
    return chart;
  }

  const shareLine = (g, total) => `${pct(total ? g.value / total : 0, 1)} of ${state.metric === "cost" ? "total cost" : state.metric === "tokens" ? "total tokens" : "total requests"}`;
  const unitLines = (g) => [`${num(g.req)} requests`, `${money(g.cost / Math.max(1, g.req), 4)} per request`];

  const modelChart = hBar("#c-model", "rgba(0,151,167,.85)",
    (g) => [fmtMetricFull(g.value), shareLine(g, modelChart.$total), ...unitLines(g)],
    (g) => toggle("model", g.key));

  const userChart = hBar("#c-users", "rgba(255,106,19,.88)",
    (g) => [fmtMetricFull(g.value), shareLine(g, userChart.$total), `Cumulative top ${g.rank}: ${pct(userChart.$cum[g.rank - 1], 1)}`, ...unitLines(g)],
    (g) => toggle("user", g.key));

  function fmtMetricFull(v) {
    return state.metric === "cost" ? money(v, 2) : state.metric === "tokens" ? `${num(v)} tokens` : `${num(v)} requests`;
  }

  const productChart = new Chart($("#c-product"), {
    type: "doughnut",
    data: { labels: [], datasets: [{ data: [], backgroundColor: [], borderColor: "#fff", borderWidth: 3 }] },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: "58%",
      plugins: { legend: { display: false }, tooltip: { ...tooltipBase, displayColors: false, callbacks: {
        title: (items) => productChart.$list[items[0].dataIndex].label,
        label: (item) => [fmtMetricFull(productChart.$list[item.dataIndex].value), shareLine(productChart.$list[item.dataIndex], productChart.$total)],
      } } },
      onClick: (_e, els) => { if (els.length) toggle("product", productChart.$list[els[0].index].key); },
      onHover: pointer,
    },
    plugins: [donutCenter],
  });

  const dayTitle = (items) => dayLabel(VS + items[0].dataIndex);
  const dayAxis = { grid: { color: "#eef1f5" }, ticks: { maxRotation: 55, minRotation: 45, font: { size: 11 }, callback(v) { return dayShort(VS + v); } } };

  const tokensChart = new Chart($("#c-tokens"), {
    type: "line",
    data: { labels: [], datasets: [
      { label: "Input tokens", data: [], yAxisID: "y", borderColor: TEAL, backgroundColor: "rgba(0,151,167,.12)", fill: true, tension: 0.35, pointRadius: 2.5, pointBackgroundColor: TEAL, borderWidth: 2.5 },
      { label: "Output tokens", data: [], yAxisID: "y1", borderColor: ORANGE, backgroundColor: ORANGE, tension: 0.35, pointRadius: 2.5, pointBackgroundColor: ORANGE, borderWidth: 2.5 },
    ] },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      scales: {
        x: dayAxis,
        y: { position: "left", beginAtZero: true, grid: { color: "#e6ecf2" }, title: { display: true, text: "Input" }, ticks: { callback: (v) => compact(v, 1) } },
        y1: { position: "right", beginAtZero: true, grid: { drawOnChartArea: false }, title: { display: true, text: "Output" }, ticks: { callback: (v) => compact(v, 0) } },
      },
      plugins: {
        legend: { position: "top", labels: { usePointStyle: true, boxWidth: 10, font: { size: 12 } } },
        tooltip: { ...tooltipBase, callbacks: {
          title: dayTitle,
          label: (item) => ` ${item.dataset.label}: ${num(item.raw)}`,
          afterBody: (items) => {
            const i = items[0].dataIndex, inp = tokensChart.$series.inp[i], out = tokensChart.$series.out[i];
            return out ? [`Ratio  1 output : ${num(inp / out)} input`] : [];
          },
        } },
      },
      onClick: (_e, els) => { if (els.length) toggleDay(els[0].index); },
      onHover: pointer,
    },
    plugins: [rangeShade],
  });

  const dailyChart = new Chart($("#c-daily"), {
    type: "bar",
    data: { labels: [], datasets: [{ data: [], backgroundColor: [], borderRadius: 4, borderSkipped: false }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      layout: { padding: { top: 18 } },
      interaction: { mode: "index", intersect: false },
      scales: {
        x: dayAxis,
        y: { beginAtZero: true, grid: { color: "#e6ecf2" }, ticks: { callback: (v) => "$" + num(v) } },
      },
      plugins: { legend: { display: false }, tooltip: { ...tooltipBase, displayColors: false, callbacks: {
        title: dayTitle,
        label: (item) => {
          const i = item.dataIndex, lines = [money(item.raw, 2) + " cost", `${num(dailyChart.$series.req[i])} requests`];
          const f = (dailyChart.$flags || []).find((x) => x.i === i);
          if (f) lines.push(`▲ ${f.ratio.toFixed(1)}× a typical ${D.isWeekend(VS + i) ? "weekend day" : "weekday"}`);
          return lines;
        },
      } } },
      onHover: pointer,
    },
    plugins: [rangeShade, flagPlugin, brushPlugin],
  });

  // Drag across the daily cost chart to select a range; a plain click isolates one day
  (function setupBrush() {
    const cvs = $("#c-daily");
    cvs.style.touchAction = "pan-y";
    let brush = null;
    const inArea = (x) => x >= dailyChart.chartArea.left - 4 && x <= dailyChart.chartArea.right + 4;
    const idxAt = (ev) => {
      const x = ev.clientX - cvs.getBoundingClientRect().left;
      return Math.max(0, Math.min(NDAYS - 1, Math.round(dailyChart.scales.x.getValueForPixel(x))));
    };
    cvs.addEventListener("pointerdown", (ev) => {
      const x = ev.clientX - cvs.getBoundingClientRect().left;
      if (!inArea(x)) return;
      cvs.setPointerCapture(ev.pointerId);
      const i = idxAt(ev);
      brush = { a: i, b: i, x0: ev.clientX, moved: false };
      dailyChart.$brush = brush;
    });
    cvs.addEventListener("pointermove", (ev) => {
      if (!brush) return;
      brush.b = idxAt(ev);
      if (Math.abs(ev.clientX - brush.x0) > 4) brush.moved = true;
      dailyChart.draw();
    });
    const end = () => {
      if (!brush) return;
      const b = brush;
      brush = null; dailyChart.$brush = null;
      if (b.moved && b.a !== b.b) { state.from = VS + Math.min(b.a, b.b); state.to = VS + Math.max(b.a, b.b); render(); }
      else toggleDay(b.a);
    };
    cvs.addEventListener("pointerup", end);
    cvs.addEventListener("pointercancel", () => { brush = null; dailyChart.$brush = null; dailyChart.draw(); });
  })();

  function toggleDay(i) {
    const d = VS + i;
    if (state.from === d && state.to === d) { state.from = DEFAULT.from; state.to = DEFAULT.to; }
    else { state.from = d; state.to = d; }
    render();
  }

  // ===================================================================
  //  Rendering
  // ===================================================================
  function animate(el, to, fmt) {
    const from = parseFloat(el.dataset.v || "0");
    el.dataset.v = to;
    cancelAnimationFrame(el._raf); clearTimeout(el._t);
    if (reduce || from === to) { el.textContent = fmt(to); return; }
    const t0 = performance.now(), dur = 450;
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      el.textContent = fmt(from + (to - from) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) el._raf = requestAnimationFrame(step);
    };
    el._raf = requestAnimationFrame(step);
    // background tabs pause animation frames: always land on the real value
    el._t = setTimeout(() => { cancelAnimationFrame(el._raf); el.textContent = fmt(to); }, dur + 60);
  }

  function deltaInfo(cur, prev) {
    if (!prev) return { text: "No previous data", cls: "flat", ratio: null };
    const r = (cur - prev) / prev;
    if (Math.abs(r) < 0.005) return { text: `≈ flat vs previous ${rangeLen()}d`, cls: "flat", ratio: r };
    return { text: `${r > 0 ? "▲" : "▼"} ${Math.abs(r * 100).toFixed(1)}% vs previous ${rangeLen()}d`, cls: r > 0 ? "up" : "down", ratio: r };
  }

  function renderKpis(cur, prev) {
    const k = (n) => $(`.kpi[data-kpi="${n}"]`);
    const set = (n, value, fmt, sub, d) => {
      animate($(".val", k(n)), value, fmt);
      if (sub != null) $(".sub", k(n)).textContent = sub;
      const di = deltaInfo(value, d);
      const el = $(".delta", k(n));
      el.textContent = di.text; el.className = "delta " + di.cls;
    };
    set("inp", cur.inp, compact, `${num(cur.inp)} tokens`, prev.inp);
    set("out", cur.out, compact, `${num(cur.out)} tokens`, prev.out);
    set("cost", cur.cost, (v) => money(v, 2), `${D.iso(state.from)} → ${D.iso(state.to)}`, prev.cost);
    set("users", cur.users, (v) => num(v), null, prev.users);
    set("req", cur.req, compact, `${num(cur.req)} requests`, prev.req);

    const safe = (a, b) => (b ? a / b : 0);
    const items = [
      { label: "Cost / request", v: safe(cur.cost, cur.req), p: safe(prev.cost, prev.req), f: (v) => "$" + v.toFixed(3) },
      { label: "Cost / active user", v: safe(cur.cost, cur.users), p: safe(prev.cost, prev.users), f: (v) => money(v, 0) },
      { label: "Blended $ / 1M tokens", v: safe(cur.cost, cur.inp + cur.out) * 1e6, p: safe(prev.cost, prev.inp + prev.out) * 1e6, f: (v) => "$" + v.toFixed(2) },
      { label: "Output share of tokens", v: safe(cur.out, cur.inp + cur.out), p: safe(prev.out, prev.inp + prev.out), f: (v) => pct(v, 2) },
    ];
    $("#unit").innerHTML = items.map((u) => {
      const d = deltaInfo(u.v, u.p);
      return `<div class="u"><span>${u.label}</span><b>${cur.req ? u.f(u.v) : "—"}</b><small class="delta ${d.cls}">${cur.req ? d.text : ""}</small></div>`;
    }).join("");
  }

  function renderHeadline(curRows, cur, prevR, prev) {
    const el = $("#headline");
    if (!cur.req) { el.innerHTML = "No usage matches the current filters."; return; }
    const n = rangeLen();
    const di = deltaInfo(cur.cost, prev.cost);
    let text = `<strong>${money(cur.cost, 0)}</strong> spent over ${n === 1 ? "the selected day" : `the selected ${n} days`}`;
    if (di.ratio == null) return void (el.innerHTML = text + ". No previous period to compare against.");
    text += di.cls === "flat" ? ", about flat versus the previous period." : `, <strong>${di.cls === "up" ? "▲" : "▼"} ${Math.abs(di.ratio * 100).toFixed(1)}%</strong> versus the previous ${n === 1 ? "day" : n + " days"}.`;

    // What moved the number the most? Products, or models if a product is already selected.
    const key = state.product != null ? "m" : "p";
    const names = key === "m" ? (i) => D.MODELS[i].id : (i) => D.PRODUCTS[i].name;
    const a = new Map(D.groupBy(curRows, key, "cost").map((g) => [g.key, g.cost]));
    const b = new Map(D.groupBy(prevR, key, "cost").map((g) => [g.key, g.cost]));
    const keys = new Set([...a.keys(), ...b.keys()]);
    let best = null, total = 0;
    for (const kk of keys) {
      const delta = (a.get(kk) || 0) - (b.get(kk) || 0);
      total += delta;
      if (!best || Math.abs(delta) > Math.abs(best.delta)) best = { key: kk, delta };
    }
    // Only worth saying when there is more than one candidate in view
    if (best && keys.size > 1 && di.cls !== "flat" && Math.abs(best.delta) > 0) {
      const share = total ? Math.abs(best.delta / total) : 0;
      const amount = `${best.delta > 0 ? "+" : "−"}${money(Math.abs(best.delta), 0)}`;
      text += ` Biggest driver: <strong>${esc(names(best.key))}</strong> (${amount}${share <= 1 ? `, ${pct(share)} of the change` : ""}).`;
    }
    el.innerHTML = text;
  }

  const foot = (id, n) => {
    $(id).innerHTML = `${n} row(s) · computed in your browser from ${num(ROWS.length)} fictional records <span class="badge">demo</span>`;
  };

  function listInfo(g, label, extra) {
    return g.map((x, i) => ({ ...x, label: label(x), rank: i + 1, ...(extra ? extra(x) : {}) }));
  }

  function renderModel() {
    const g = D.groupBy(rows(["model"]), "m", state.metric);
    const total = g.reduce((s, x) => s + x.value, 0);
    modelChart.$list = listInfo(g, (x) => D.MODELS[x.key].id);
    modelChart.$total = total;
    modelChart.data.labels = modelChart.$list.map((x) => x.label);
    modelChart.data.datasets[0].data = g.map((x) => x.value);
    modelChart.data.datasets[0].backgroundColor = g.map((x) => (state.model == null || x.key === state.model ? "rgba(0,151,167,.85)" : "rgba(0,151,167,.25)"));
    modelChart.$fmt = (i) => fmtMetric(g[i].value);
    modelChart.$dim = (i) => state.model != null && g[i].key !== state.model;
    modelChart.update();
    $("#t-model").textContent = `${METRIC_NAME[state.metric]} by Model`;
    if (!g.length) $("#i-model").textContent = "No usage matches the current filters.";
    else {
      const top2 = g.slice(0, 2), s2 = top2.reduce((s, x) => s + x.value, 0) / total;
      const tiny = g.filter((x) => x.value / total < 0.01).length;
      $("#i-model").innerHTML = `${g.length > 1 ? `<strong>${esc(D.MODELS[top2[0].key].id)}</strong> and <strong>${esc(D.MODELS[top2[1].key].id)}</strong> account for <strong>${pct(s2)}</strong> of ${state.metric}` : `<strong>${esc(D.MODELS[g[0].key].id)}</strong> is the only model in this view`}${tiny ? `; ${tiny} model${tiny > 1 ? "s" : ""} carry${tiny > 1 ? "" : "es"} under 1% each.` : "."}`;
    }
    foot("#f-model-foot", g.length);
  }

  function renderProduct() {
    const g = D.groupBy(rows(["product"]), "p", state.metric);
    const total = g.reduce((s, x) => s + x.value, 0);
    productChart.$list = listInfo(g, (x) => D.PRODUCTS[x.key].name);
    productChart.$total = total;
    const ds = productChart.data.datasets[0];
    productChart.data.labels = productChart.$list.map((x) => x.label);
    ds.data = g.map((x) => x.value);
    ds.backgroundColor = g.map((x) => D.PRODUCTS[x.key].color + (state.product == null || x.key === state.product ? "" : "44"));
    productChart.$center = { big: fmtMetric(total), small: `total ${state.metric}` };
    productChart.update();

    $("#t-product").textContent = `${METRIC_NAME[state.metric]} by Product`;
    $("#product-list").innerHTML = g.map((x) =>
      `<li><button class="${state.product === x.key ? "active" : ""}" data-p="${x.key}" ${state.product != null && state.product !== x.key ? 'style="opacity:.55"' : ""}>` +
      `<i style="background:${D.PRODUCTS[x.key].color}"></i><span>${esc(D.PRODUCTS[x.key].name)}</span>` +
      `<span class="v">${fmtMetric(x.value)}</span><span class="p">${total ? pct(x.value / total, x.value / total < 0.01 ? 1 : 0) : "0%"}</span></button></li>`).join("");
    $$("#product-list button").forEach((b) => b.addEventListener("click", () => toggle("product", +b.dataset.p)));

    if (!g.length) $("#i-product").textContent = "No usage matches the current filters.";
    else {
      const first = g[0], s1 = first.value / total;
      $("#i-product").innerHTML = g.length > 1
        ? `<strong>${esc(D.PRODUCTS[first.key].name)}</strong> alone is <strong>${pct(s1)}</strong> of ${state.metric}; with ${esc(D.PRODUCTS[g[1].key].name)} it reaches <strong>${pct((first.value + g[1].value) / total)}</strong>.`
        : `<strong>${esc(D.PRODUCTS[first.key].name)}</strong> is the only product in this view.`;
    }
    foot("#f-product-foot", g.length);
  }

  function renderDaily() {
    const r = rows(["date"]).filter((x) => x.d >= VS);
    const inp = Array(NDAYS).fill(0), out = Array(NDAYS).fill(0), cost = Array(NDAYS).fill(0), req = Array(NDAYS).fill(0);
    for (const x of r) { const i = x.d - VS; inp[i] += x.inp; out[i] += x.out; cost[i] += x.cost; req[i] += x.req; }
    const labels = Array.from({ length: NDAYS }, (_, i) => dayShort(VS + i));
    const range = { from: state.from - VS, to: state.to - VS };
    const shade = isFullRange() ? null : range;

    tokensChart.$series = { inp, out };
    tokensChart.$range = shade;
    tokensChart.data.labels = labels;
    tokensChart.data.datasets[0].data = inp;
    tokensChart.data.datasets[1].data = out;
    tokensChart.update();

    // Anomaly flags: days well above the typical level for their kind (weekday / weekend)
    const wd = [], we = [];
    cost.forEach((c, i) => (c > 0 ? (D.isWeekend(VS + i) ? we : wd).push(c) : null));
    const medWd = D.median(wd), medWe = D.median(we);
    const flags = [];
    if (wd.length >= 5) {
      cost.forEach((c, i) => {
        const weekend = D.isWeekend(VS + i), base = weekend ? medWe : medWd;
        if (base > 0 && c > base * 1.5 && (!weekend || we.length >= 3)) flags.push({ i, ratio: c / base });
      });
      // keep only the two strongest, so a naturally spiky single user doesn't light up the chart
      flags.sort((a, b) => b.ratio - a.ratio).splice(2);
    }
    dailyChart.$series = { req };
    dailyChart.$flags = flags;
    dailyChart.$range = shade;
    dailyChart.data.labels = labels;
    const ds = dailyChart.data.datasets[0];
    ds.data = cost;
    ds.backgroundColor = cost.map((_, i) => (flags.some((f) => f.i === i) ? ORANGE : D.isWeekend(VS + i) ? "rgba(51,89,122,.45)" : "rgba(51,89,122,.92)"));
    dailyChart.update();

    // insights
    const sum = (a) => a.reduce((s, v) => s + v, 0);
    const tIn = sum(inp), tOut = sum(out), tReq = sum(req);
    $("#i-tokens").innerHTML = tReq
      ? `On average each request carries about <strong>${compact(tIn / tReq, 1)} input</strong> and <strong>${num(tOut / tReq)} output</strong> tokens. Output is only <strong>${pct(tOut / (tIn + tOut), 2)}</strong> of all tokens, which the separate axes hide.`
      : "No usage matches the current filters.";

    let msg = "No usage matches the current filters.";
    if (wd.length) {
      const avgWd = sum(wd) / wd.length;
      msg = `Weekdays average <strong>${money(avgWd, 0)}</strong>/day` + (we.length ? ` vs <strong>${money(sum(we) / we.length, 0)}</strong> on weekends (${pct(1 - sum(we) / we.length / avgWd)} lower).` : ".");
    }
    if (flags.length) {
      const f = flags.reduce((m, x) => (x.ratio > m.ratio ? x : m), flags[0]);
      const day = r.filter((x) => x.d === VS + f.i);
      const top = new Map();
      for (const x of day) { const k = x.u + ":" + x.p; top.set(k, (top.get(k) || 0) + x.cost); }
      const [bk, bv] = [...top.entries()].sort((a, b) => b[1] - a[1])[0];
      const [u, p] = bk.split(":").map(Number);
      msg += ` <strong>${dayNice(VS + f.i)}</strong> spiked to <strong>${f.ratio.toFixed(1)}×</strong> a typical weekday; the largest single contributor was <strong>${esc(USERS[u].name)}</strong> on ${esc(D.PRODUCTS[p].name)} (${money(bv, 0)}).`;
    }
    $("#i-daily").innerHTML = msg;
    foot("#f-tokens-foot", cost.filter((c) => c > 0).length);
    foot("#f-daily-foot", cost.filter((c) => c > 0).length);
  }

  function renderUsers() {
    const g = D.groupBy(rows(["user"]), "u", state.metric);
    const total = g.reduce((s, x) => s + x.value, 0);
    const top = g.slice(0, 15);
    userChart.$list = listInfo(top, (x) => USERS[x.key].name);
    userChart.$total = total;
    let run = 0;
    userChart.$cum = top.map((x) => { run += x.value; return total ? run / total : 0; });
    userChart.data.labels = userChart.$list.map((x) => x.label);
    userChart.data.datasets[0].data = top.map((x) => x.value);
    userChart.data.datasets[0].backgroundColor = top.map((x) => (state.user == null || x.key === state.user ? "rgba(255,106,19,.88)" : "rgba(255,106,19,.25)"));
    userChart.$fmt = (i) => fmtMetric(top[i].value);
    userChart.$dim = (i) => state.user != null && top[i].key !== state.user;
    userChart.update();
    $("#t-users").textContent = `Top 15 Users by ${METRIC_NAME[state.metric]}`;

    if (!g.length) $("#i-users").textContent = "No usage matches the current filters.";
    else {
      const sh = (n) => g.slice(0, n).reduce((s, x) => s + x.value, 0) / total;
      const n10 = Math.max(1, Math.ceil(g.length * 0.1));
      $("#i-users").innerHTML = g.length >= 3
        ? `The top 3 users account for <strong>${pct(sh(3))}</strong> of ${state.metric}; the top 10% of users (${n10}) account for <strong>${pct(sh(n10))}</strong>.`
        : `${g.length} user${g.length > 1 ? "s" : ""} in this view.`;
    }
    foot("#f-users-foot", g.length);
  }

  function renderControls() {
    $("#f-from").value = D.iso(state.from);
    $("#f-to").value = D.iso(state.to);
    $("#f-product").value = state.product == null ? "" : String(state.product);
    $("#f-model").value = state.model == null ? "" : String(state.model);
    if (document.activeElement !== $("#f-user")) $("#f-user").value = state.query;
    $$(".presets .seg").forEach((b) => b.classList.toggle("active", state.to === LAST && rangeLen() === +b.dataset.days));
    $$(".metric-bar .seg").forEach((b) => {
      const on = b.dataset.metric === state.metric;
      b.classList.toggle("active", on); b.setAttribute("aria-pressed", String(on));
    });
    $("#f-reset").hidden = isDefault();

    const chips = $("#chips");
    chips.innerHTML = "";
    const add = (label, clear) => {
      const c = document.createElement("button");
      c.className = "chip";
      c.innerHTML = `${esc(label)} <b aria-hidden="true">✕</b>`;
      c.setAttribute("aria-label", "Clear " + label);
      c.addEventListener("click", () => { clear(); render(); });
      chips.append(c);
    };
    if (!isFullRange()) add(state.from === state.to ? `Day: ${D.iso(state.from)}` : `${D.iso(state.from)} → ${D.iso(state.to)}`, () => { state.from = DEFAULT.from; state.to = DEFAULT.to; });
    if (state.user != null) add(`User: ${USERS[state.user].name}`, () => { state.user = null; });
  }

  function render() {
    renderControls();
    const curRows = rows();
    const pRows = prevRows();
    const cur = D.totals(curRows), prev = D.totals(pRows);
    renderKpis(cur, prev);
    renderHeadline(curRows, cur, pRows, prev);
    renderModel();
    renderProduct();
    renderDaily();
    renderUsers();
  }

  // ===================================================================
  //  Controls
  // ===================================================================
  $("#f-product").innerHTML = `<option value="">All products</option>` + D.PRODUCTS.map((p, i) => `<option value="${i}">${esc(p.name)}</option>`).join("");
  $("#f-model").innerHTML = `<option value="">All models</option>` + D.MODELS.map((m, i) => `<option value="${i}">${esc(m.id)}</option>`).join("");
  $("#f-from").min = $("#f-to").min = D.iso(VS);
  $("#f-from").max = $("#f-to").max = D.iso(LAST);

  const clampDay = (s, fallback) => {
    const d = D.dayFromIso(s);
    return Number.isFinite(d) ? Math.max(VS, Math.min(LAST, d)) : fallback;
  };
  $("#f-from").addEventListener("change", (e) => { state.from = clampDay(e.target.value, state.from); if (state.from > state.to) state.to = state.from; render(); });
  $("#f-to").addEventListener("change", (e) => { state.to = clampDay(e.target.value, state.to); if (state.to < state.from) state.from = state.to; render(); });
  $$(".presets .seg").forEach((b) => b.addEventListener("click", () => { state.to = LAST; state.from = LAST - +b.dataset.days + 1; render(); }));
  $("#f-product").addEventListener("change", (e) => { state.product = e.target.value === "" ? null : +e.target.value; render(); });
  $("#f-model").addEventListener("change", (e) => { state.model = e.target.value === "" ? null : +e.target.value; render(); });
  let searchTimer;
  $("#f-user").addEventListener("input", (e) => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { state.query = e.target.value; render(); }, 150); });
  $("#f-reset").addEventListener("click", () => { Object.assign(state, { ...DEFAULT, metric: state.metric }); render(); });
  $$(".metric-bar .seg").forEach((b) => b.addEventListener("click", () => { state.metric = b.dataset.metric; render(); }));

  render();
})();
