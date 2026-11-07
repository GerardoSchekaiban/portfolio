/*
 * Fictional dataset + aggregation logic for the "AI Usage & Cost" demo.
 * Everything here is invented: users, volumes and rates. Model names are
 * public model identifiers; the prices are illustrative effective rates, not
 * real billing data. The generator is seeded, so numbers are identical on
 * every page load.
 *
 * Works in the browser (window.UsageData) and in Node (module.exports).
 */
(function (root) {
  "use strict";

  // 60 days of history: the first 30 are only used as the "previous period"
  const DAYS = 60;
  const VISIBLE_START = 30;
  const BASE = Date.UTC(2026, 8, 9); // 2026-09-09 -> visible window 2026-10-09 .. 2026-11-07

  // Illustrative effective rates in USD per 1M tokens (input is low because
  // most input tokens in agentic workloads are cache reads).
  const MODELS = [
    { id: "claude-sonnet-5-5",             inRate: 0.30, outRate: 15 },
    { id: "claude-opus-5-5",               inRate: 0.50, outRate: 25 },
    { id: "claude-fable-5-1",              inRate: 1.00, outRate: 50 },
    { id: "claude-sonnet-4-6",             inRate: 0.30, outRate: 15 },
    { id: "claude-opus-5",                 inRate: 0.50, outRate: 25 },
    { id: "claude-sonnet-5",               inRate: 0.30, outRate: 15 },
    { id: "claude-haiku-4-5-20251001",     inRate: 0.10, outRate: 5 },
    { id: "claude-fable-5",                inRate: 1.00, outRate: 50 },
    { id: "claude-opus-4-8",               inRate: 1.50, outRate: 75 },
    { id: "claude-opus-4-6",               inRate: 1.50, outRate: 75 },
    { id: "claude-haiku-5-5",              inRate: 0.10, outRate: 5 },
    { id: "claude-opus-4-7",               inRate: 1.50, outRate: 75 },
    { id: "claude-3-opus",                 inRate: 1.50, outRate: 75 },
    { id: "claude-sonnet-4-5-20250929",    inRate: 0.30, outRate: 15 },
  ];
  const mi = (id) => MODELS.findIndex((m) => m.id === id);

  // Invented products. `mix` = share of requests per model; `inTok/outTok` =
  // average tokens per request; `weight` = how common the product is.
  const PRODUCTS = [
    { name: "Code Assistant", color: "#0097a7", weight: 0.30, inTok: 210000, outTok: 1100,
      mix: { "claude-sonnet-5-5": .50, "claude-opus-5-5": .30, "claude-fable-5-1": .08, "claude-sonnet-4-6": .06, "claude-opus-5": .02, "claude-haiku-4-5-20251001": .02, "claude-opus-4-8": .02 } },
    { name: "Chat", color: "#ff6a13", weight: 0.36, inTok: 110000, outTok: 1100,
      mix: { "claude-sonnet-5-5": .35, "claude-opus-5-5": .25, "claude-fable-5-1": .15, "claude-sonnet-5": .08, "claude-haiku-5-5": .07, "claude-sonnet-4-6": .05, "claude-opus-4-8": .03, "claude-3-opus": .02 } },
    { name: "Agents", color: "#0b2239", weight: 0.05, inTok: 90000, outTok: 2000,
      mix: { "claude-opus-5-5": .45, "claude-sonnet-5-5": .35, "claude-fable-5-1": .12, "claude-opus-4-8": .05, "claude-haiku-4-5-20251001": .03 } },
    { name: "Office Add-in", color: "#f59e0b", weight: 0.09, inTok: 32000, outTok: 900,
      mix: { "claude-sonnet-5-5": .40, "claude-sonnet-4-6": .30, "claude-haiku-4-5-20251001": .20, "claude-opus-4-6": .10 } },
    { name: "Research", color: "#8e44ad", weight: 0.05, inTok: 160000, outTok: 5500,
      mix: { "claude-opus-5-5": .50, "claude-fable-5-1": .30, "claude-sonnet-5-5": .20 } },
    { name: "Design Studio", color: "#2fae66", weight: 0.05, inTok: 45000, outTok: 3500,
      mix: { "claude-sonnet-5-5": .50, "claude-opus-5-5": .30, "claude-fable-5": .20 } },
    { name: "Voice", color: "#2a7fc1", weight: 0.03, inTok: 5000, outTok: 450,
      mix: { "claude-haiku-5-5": .60, "claude-sonnet-5": .25, "claude-sonnet-4-5-20250929": .15 } },
  ];
  for (const p of PRODUCTS) {
    p.mixIdx = Object.entries(p.mix).map(([id, w]) => ({ m: mi(id), w }));
  }

  const FIRST = ["Maya", "Noah", "Lena", "Omar", "Priya", "Hana", "Tomas", "Ines", "Kofi", "Zara",
    "Mateo", "Freya", "Ravi", "Elif", "Jonas", "Nadia", "Luca", "Sana", "Felix", "Amara",
    "Dario", "Mina", "Yusuf", "Clara", "Idris", "Greta", "Kenji", "Lucia", "Anton", "Selma",
    "Niko", "Aisha", "Bruno", "Vera", "Emil", "Rosa", "Hugo", "Leila", "Oskar", "Thea"];
  const INITIALS = "ABCDEFGHJKLMNPRSTVW";

  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---- Dates ---------------------------------------------------------------
  const dateOf = (d) => new Date(BASE + d * 864e5);
  const iso = (d) => dateOf(d).toISOString().slice(0, 10);
  const isWeekend = (d) => { const g = dateOf(d).getUTCDay(); return g === 0 || g === 6; };
  const dayFromIso = (s) => Math.round((Date.parse(s + "T00:00:00Z") - BASE) / 864e5);

  // ---- Generator -----------------------------------------------------------
  function generate(seed) {
    const rng = mulberry32(seed || 20261107);
    const N_USERS = 520;
    const PER_DAY = 26000;     // requests on a normal weekday, whole company
    const SPIKE_DAY = 49;      // one runaway batch job by the #2 spender

    // Users, ranked by activity (Zipf-like) and given invented names
    const order = Array.from({ length: N_USERS }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    const users = Array.from({ length: N_USERS }, (_, rank) => {
      const k = order[rank];
      return { id: rank, name: `${FIRST[k % FIRST.length]} ${INITIALS[Math.floor(k / FIRST.length) % INITIALS.length]}.`, w: 1 / Math.pow(rank + 1, 0.9) };
    });
    const wsum = users.reduce((s, u) => s + u.w, 0);

    const pickWeighted = (items, wf) => {
      let r = rng() * items.reduce((s, x) => s + wf(x), 0);
      for (const x of items) { r -= wf(x); if (r <= 0) return x; }
      return items[items.length - 1];
    };

    // Each user: a main product plus up to two secondary ones
    for (const u of users) {
      let main;
      if (u.id < 12) main = rng() < 0.8 ? PRODUCTS[0] : PRODUCTS[2];   // power users: code + agents
      else main = pickWeighted(PRODUCTS, (p) => p.weight);
      const set = [{ p: PRODUCTS.indexOf(main), w: 0.7 }];
      for (const share of [0.55, 0.2]) {
        if (rng() < share) {
          const other = pickWeighted(PRODUCTS, (p) => (set.some((s) => PRODUCTS[s.p] === p) ? 0 : p.weight));
          set.push({ p: PRODUCTS.indexOf(other), w: 0.3 / 2 });
        }
      }
      u.products = set;
    }

    const rows = [];
    for (let d = 0; d < DAYS; d++) {
      const growth = 0.75 + 0.35 * (d / (DAYS - 1));
      const mult = (isWeekend(d) ? 0.18 : 1) * growth;
      for (const u of users) {
        let exp = PER_DAY * (u.w / wsum) * mult * (0.7 + 0.6 * rng());
        const spike = d === SPIKE_DAY && u.id === 1;
        if (spike) exp *= 12;
        const n = exp >= 1 ? Math.round(exp) : rng() < exp ? 1 : 0;
        if (n === 0) continue;

        // split the day's requests across the user's products
        const k = Math.min(u.products.length, n < 4 ? 1 : n < 40 ? 2 : 3);
        const chosen = spike ? [{ p: 4, w: 1 }] : u.products.slice(0, k);
        const wTot = chosen.reduce((s, c) => s + c.w, 0);
        let left = n;
        chosen.forEach((c, ci) => {
          const cnt = ci === chosen.length - 1 ? left : Math.min(left, Math.round((n * c.w) / wTot));
          left -= cnt;
          if (cnt <= 0) return;
          const prod = PRODUCTS[c.p];

          // split a product's requests across up to three models
          const m1 = pickWeighted(prod.mixIdx, (x) => x.w);
          const parts = [{ m: m1.m, c: cnt }];
          if (cnt >= 8) {
            const m2 = pickWeighted(prod.mixIdx, (x) => (x.m === m1.m ? 0 : x.w));
            const c2 = Math.round(cnt * (0.15 + 0.3 * rng()));
            parts[0].c -= c2; parts.push({ m: m2.m, c: c2 });
          }
          for (const part of parts) {
            if (part.c <= 0) continue;
            const model = MODELS[part.m];
            const inp = Math.round(part.c * prod.inTok * (0.6 + 0.8 * rng()));
            const out = Math.round(part.c * prod.outTok * (0.6 + 0.8 * rng()));
            const cost = (inp * model.inRate + out * model.outRate) / 1e6;
            rows.push({ d, u: u.id, p: c.p, m: part.m, req: part.c, inp, out, cost: +cost.toFixed(4) });
          }
        });
      }
    }
    return { rows, users };
  }

  // ---- Filtering & aggregation --------------------------------------------
  // f = { from, to, product, model, user, query }  (product/model are indexes,
  // user is an id, query is a name substring). `skip` lists dimensions to ignore:
  // "date", "product", "model", "user" (exact user) and "query" (name search). This is what makes cross-filtering feel right: a chart
  // ignores its own dimension's filter so you still see the alternatives.
  function filterRows(rows, users, f, skip) {
    skip = skip || [];
    const q = f.query ? f.query.trim().toLowerCase() : "";
    const useDate = !skip.includes("date");
    const useProd = !skip.includes("product") && f.product != null;
    const useModel = !skip.includes("model") && f.model != null;
    const useUser = !skip.includes("user");
    const useQuery = !skip.includes("query");
    const matchUser = useQuery && q ? new Set(users.filter((u) => u.name.toLowerCase().includes(q)).map((u) => u.id)) : null;
    return rows.filter((r) =>
      (!useDate || (r.d >= f.from && r.d <= f.to)) &&
      (!useProd || r.p === f.product) &&
      (!useModel || r.m === f.model) &&
      (!useUser || f.user == null || r.u === f.user) &&
      (!matchUser || matchUser.has(r.u))
    );
  }

  function totals(rows) {
    const t = { req: 0, inp: 0, out: 0, cost: 0 };
    const seen = new Set();
    for (const r of rows) { t.req += r.req; t.inp += r.inp; t.out += r.out; t.cost += r.cost; seen.add(r.u); }
    t.users = seen.size;
    return t;
  }

  // Sum a metric by key (r.m, r.p, r.u, r.d ...). Returns [{key, value, req, cost, tokens}] desc.
  function groupBy(rows, key, metric) {
    const map = new Map();
    for (const r of rows) {
      const g = map.get(r[key]) || { key: r[key], req: 0, cost: 0, tokens: 0 };
      g.req += r.req; g.cost += r.cost; g.tokens += r.inp + r.out;
      map.set(r[key], g);
    }
    const list = [...map.values()];
    for (const g of list) g.value = metric === "tokens" ? g.tokens : metric === "requests" ? g.req : g.cost;
    return list.sort((a, b) => b.value - a.value);
  }

  // The window of equal length that ends the day before `from`
  function previousWindow(from, to) {
    const len = to - from + 1;
    return { from: from - len, to: from - 1 };
  }

  const median = (a) => {
    if (!a.length) return 0;
    const s = [...a].sort((x, y) => x - y), m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };

  const api = {
    DAYS, VISIBLE_START, MODELS, PRODUCTS,
    generate, filterRows, totals, groupBy, previousWindow, median,
    iso, dateOf, isWeekend, dayFromIso,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.UsageData = api;
})(typeof window !== "undefined" ? window : globalThis);
