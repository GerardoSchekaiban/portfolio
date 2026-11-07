/*
 * Fictional dataset + scoring logic for the Metadata Quality Scorecard demo.
 * Everything here is invented. The generator is seeded, so the numbers are
 * identical on every page load.
 *
 * Works in the browser (window.ScorecardData) and in Node (module.exports),
 * so the logic can be tested without a DOM.
 */
(function (root) {
  "use strict";

  // ---- Scoring model (100 points) -----------------------------------------
  const DIMENSIONS = [
    { key: "d1", label: "Table description",     max: 20, rule: "+10 if present, +10 if at least 80 characters" },
    { key: "d2", label: "Column documentation",  max: 25, rule: "Prorated by the share of columns with a description" },
    { key: "d3", label: "Data classification",   max: 15, rule: "+8 if present, +7 if it is a valid level" },
    { key: "d4", label: "Ownership",             max: 15, rule: "+8 if an owner is named, +7 if a steward is named" },
    { key: "d5", label: "Business purpose",      max: 15, rule: "+8 if present, +7 if at least 60 characters" },
    { key: "d6", label: "Refresh schedule",      max: 10, rule: "+10 if a refresh frequency is declared" },
  ];

  const GRADES = [
    { key: "Platinum", min: 90, color: "#7c3aed", range: "90–100" },
    { key: "Gold",     min: 75, color: "#d97706", range: "75–89" },
    { key: "Silver",   min: 50, color: "#64748b", range: "50–74" },
    { key: "Bronze",   min: 25, color: "#b45309", range: "25–49" },
    { key: "Unscored", min: 0,  color: "#dc2626", range: "0–24" },
  ];

  const VALID_CLASS = ["public", "internal", "confidential", "restricted"];

  // A table counts as "covered" when it has a description AND at least half
  // of its columns are documented.
  const COVERAGE_COL_FILL = 0.5;

  // ---- Fictional retailer: one row per business domain --------------------
  //  n    number of tables           cov  share of tables that end up covered
  //  p    how polished covered ones are (0-1)
  //  gov  governance basics (owner, class., refresh) even on undocumented ones
  //  cert share of covered tables that are certified
  const DOMAINS = [
    { name: "Finance",          n: 58,  cov: 0.98, p: 0.92, gov: 0.95, cert: 0.55 },
    { name: "Merchandising",    n: 74,  cov: 0.93, p: 0.86, gov: 0.92, cert: 0.40 },
    { name: "E-commerce",       n: 96,  cov: 0.88, p: 0.80, gov: 0.90, cert: 0.35 },
    { name: "Marketing",        n: 64,  cov: 0.70, p: 0.50, gov: 0.60, cert: 0.12 },
    { name: "Supply Chain",     n: 82,  cov: 0.64, p: 0.45, gov: 0.55, cert: 0.10 },
    { name: "Store Operations", n: 70,  cov: 0.58, p: 0.40, gov: 0.50, cert: 0.08 },
    { name: "Customer Service", n: 45,  cov: 0.62, p: 0.48, gov: 0.55, cert: 0.10 },
    { name: "Loyalty",          n: 38,  cov: 0.72, p: 0.55, gov: 0.65, cert: 0.15 },
    { name: "Pricing",          n: 28,  cov: 0.52, p: 0.42, gov: 0.50, cert: 0.05 },
    { name: "Sustainability",   n: 20,  cov: 0.40, p: 1.00, gov: 1.00, cert: 0.40 },
    { name: "People & HR",      n: 40,  cov: 0.27, p: 0.35, gov: 0.40, cert: 0.00 },
    { name: "Master Data",      n: 120, cov: 0.17, p: 0.30, gov: 0.35, cert: 0.05, master: true },
    { name: "Reference Data",   n: 60,  cov: 0.06, p: 0.25, gov: 0.20, cert: 0.00 },
    { name: "(Unassigned)",     n: 25,  cov: 0.28, p: 0.25, gov: 0.18, cert: 0.00 },
  ];

  // ---- Seeded random numbers ----------------------------------------------
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function generate(seed) {
    const rng = mulberry32(seed || 20261107);
    const int = (n) => Math.floor(rng() * n);
    const tables = [];
    let id = 1;

    for (const spec of DOMAINS) {
      // Exactly round(cov * n) tables are covered; which ones is shuffled.
      const coveredCount = Math.round(spec.cov * spec.n);
      const flags = Array.from({ length: spec.n }, (_, i) => i < coveredCount);
      for (let i = flags.length - 1; i > 0; i--) {
        const j = int(i + 1);
        [flags[i], flags[j]] = [flags[j], flags[i]];
      }

      for (let k = 0; k < spec.n; k++) {
        const covered = flags[k];
        const certified = covered && rng() < spec.cert;
        const p = certified ? Math.max(spec.p, 0.9) : spec.p;
        const g = Math.min(1, spec.gov + (certified ? 0.1 : 0));

        // Description + column documentation
        let descLen, frac;
        const totalCols = 6 + int(34);
        if (covered) {
          descLen = rng() < p ? 80 + int(140) : 25 + int(50);
          const u = Math.pow(rng(), 1.8 - 1.5 * p);
          frac = 0.5 + 0.5 * u;
        } else if (rng() < 0.6) {            // fails because there is no description
          descLen = 0;
          frac = rng() * 0.8;
        } else {                              // fails because columns are thin
          descLen = 15 + int(60);
          frac = rng() * 0.49;
        }
        let colsWithDesc = Math.round(frac * totalCols);
        if (covered) colsWithDesc = Math.max(colsWithDesc, Math.ceil(COVERAGE_COL_FILL * totalCols));
        else if (descLen > 0) colsWithDesc = Math.min(colsWithDesc, Math.ceil(COVERAGE_COL_FILL * totalCols) - 1);

        // Governance basics
        let classification = "";
        if (rng() < g + (covered ? 0.05 : 0)) {
          classification = rng() < 0.92 ? VALID_CLASS[int(VALID_CLASS.length)] : "TBD";
        }
        const hasOwner = rng() < Math.min(1, g + 0.05);
        const hasSteward = rng() < g * 0.85;

        // Business purpose + refresh
        let purposeLen = 0;
        if (rng() < (covered ? 0.55 + 0.4 * p : 0.1 + 0.3 * g)) {
          purposeLen = rng() < p ? 60 + int(80) : 20 + int(35);
        }
        const refresh = rng() < Math.min(1, g + (covered ? 0.1 : 0));

        // Lifecycle status (certified tables are always active)
        const r = rng();
        const status = certified || r < 0.84 ? "Active" : r < 0.92 ? "Draft" : "Deprecated";

        tables.push({
          id: id++,
          domain: spec.name,
          master: !!spec.master,
          status,
          certified,
          descLen,
          totalCols,
          colsWithDesc,
          classification,
          hasOwner,
          hasSteward,
          purposeLen,
          refresh,
        });
      }
    }

    for (const t of tables) {
      t.dims = scoreDims(t);
      t.score = round1(Object.values(t.dims).reduce((a, b) => a + b, 0));
      t.covered = isCovered(t);
    }
    return tables;
  }

  // ---- Scoring -------------------------------------------------------------
  function round1(n) { return Math.round(n * 10) / 10; }

  function scoreDims(t) {
    return {
      d1: (t.descLen > 0 ? 10 : 0) + (t.descLen >= 80 ? 10 : 0),
      d2: round1((t.colsWithDesc / t.totalCols) * 25),
      d3: (t.classification ? 8 : 0) + (VALID_CLASS.includes(t.classification) ? 7 : 0),
      d4: (t.hasOwner ? 8 : 0) + (t.hasSteward ? 7 : 0),
      d5: (t.purposeLen > 0 ? 8 : 0) + (t.purposeLen >= 60 ? 7 : 0),
      d6: t.refresh ? 10 : 0,
    };
  }

  function isCovered(t) {
    return t.descLen > 0 && t.colsWithDesc / t.totalCols >= COVERAGE_COL_FILL;
  }

  function grade(score) {
    return GRADES.find((g) => score >= g.min);
  }

  // ---- Aggregations --------------------------------------------------------
  function filterTables(tables, f) {
    return tables.filter(
      (t) =>
        (!f.certified || t.certified) &&
        (!f.noMaster || !t.master) &&
        (f.status === "All" || t.status === f.status)
    );
  }

  const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

  function overall(tables) {
    const n = tables.length;
    const covered = tables.filter((t) => t.covered).length;
    return {
      n,
      covered,
      uncovered: n - covered,
      coverage: n ? (covered / n) * 100 : 0,
      avg: mean(tables.map((t) => t.score)),
      unscored: tables.filter((t) => t.score < 25).length,
    };
  }

  function domainStats(tables) {
    const byDomain = new Map();
    for (const t of tables) {
      if (!byDomain.has(t.domain)) byDomain.set(t.domain, []);
      byDomain.get(t.domain).push(t);
    }
    return [...byDomain.entries()].map(([name, ts]) => {
      const o = overall(ts);
      return { name, ...o, grade: grade(o.avg).key, tables: ts };
    });
  }

  function dimensionAverages(tables) {
    return DIMENSIONS.map((d) => {
      const avg = mean(tables.map((t) => t.dims[d.key]));
      return { ...d, avg, pct: (avg / d.max) * 100 };
    });
  }

  function gradeCounts(tables) {
    return GRADES.map((g) => ({
      ...g,
      count: tables.filter((t) => grade(t.score).key === g.key).length,
    }));
  }

  // How many more tables must be covered for a domain to reach a coverage target
  function tablesToTarget(stat, targetPct) {
    return Math.max(0, Math.ceil((targetPct / 100) * stat.n) - stat.covered);
  }

  const api = {
    DIMENSIONS, GRADES, DOMAINS, VALID_CLASS,
    generate, scoreDims, isCovered, grade, filterTables,
    overall, domainStats, dimensionAverages, gradeCounts, tablesToTarget,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ScorecardData = api;
})(typeof window !== "undefined" ? window : globalThis);
