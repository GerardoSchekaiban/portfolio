/*
 * Medallion architecture case study.
 * Diagrams are built from small data tables so they follow the page theme.
 * All sample rows and figures are fictional.
 */
(function () {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const wait = (ms) => new Promise((r) => setTimeout(r, reduce ? 0 : ms));

  // ===================================================================
  //  Tiny SVG helpers
  // ===================================================================
  function S(tag, attrs, ...kids) {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) if (v != null && v !== false) e.setAttribute(k, v);
    for (const c of kids.flat()) if (c != null) e.append(c.nodeType ? c : document.createTextNode(c));
    return e;
  }
  const rect = (x, y, w, h, cls, rx = 8, attrs) => S("rect", { x, y, width: w, height: h, rx, class: cls, ...attrs });
  const txt = (x, y, str, o = {}) =>
    S("text", { x, y, "font-size": o.s || 12, "font-weight": o.w || 400, "text-anchor": o.a, class: o.q ? "q" : null }, str);
  const arrowDefs = (id) =>
    S("defs", {}, S("marker", { id, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto" }, S("path", { d: "M0 0L10 5L0 10z", class: "arrow" })));
  const line = (d, marker) => S("path", { d, class: "line", "marker-end": marker ? `url(#${marker})` : null });
  const root = (vb, label) => S("svg", { viewBox: vb, class: "diagram", role: "img", "aria-label": label });

  // ===================================================================
  //  Diagram 1: end to end (interactive)
  // ===================================================================
  function diagramEndToEnd() {
    const svg = root("0 0 760 430", "End-to-end architecture from source systems through bronze, silver and gold to consumers, with three quality gates");
    svg.setAttribute("role", "group");
    svg.append(arrowDefs("e-arrow"), txt(24, 30, "End-to-end architecture: from source to consumer", { s: 15, w: 600 }));
    const flow = S("g");
    ["M128 215H156", "M272 215H300", "M428 215H456", "M608 215H636"].forEach((d) => flow.append(line(d, "e-arrow")));
    svg.append(flow);

    const item = (g, x, y, w, a, b) => g.append(rect(x, y, w, 50, "box", 6), txt(x + 8, y + 21, a, { s: 11.5, w: 600 }), txt(x + 8, y + 38, b, { s: 11.5, q: true }));
    const column = (key, cls, x, w, label, items, note, noteX) => {
      const g = S("g", { class: `lay ${cls}`, "data-layer": key, role: key ? "button" : null, tabindex: key ? 0 : null, "aria-label": key ? `Show the ${label} layer` : null });
      g.append(rect(x, 84, w, 250, "colbg"), rect(x, 84, w, 250, "col"), rect(x, 84, w, 28, "head"), txt(x + 12, 103, label, { w: 600 }));
      items.forEach((it, i) => item(g, x + 10, 124 + i * 60, it[2] || w - 20, it[0], it[1]));
      if (note) g.append(txt(x + 12, 318, note, { s: 11.5, q: true }));
      return g;
    };
    svg.append(
      column(null, "lay-src", 24, 104, "Sources", [["System A", "instance 1", 84], ["System A", "instance 2", 84]]),
      column("bronze", "lay-bronze", 156, 116, "Bronze", [["Raw tables", "as-is"], ["Load metadata", "load time only"], ["Full history", "nothing dropped"]]),
      column("silver", "lay-silver", 300, 128, "Silver", [["1 Standardize", "types, codes"], ["2 Conform", "keys, entities"], ["3 Business rules", "flag, not delete"]], "10 shared entities"),
      column("gold", "lay-gold", 456, 152, "Gold", [["ACC_SITE_DETAIL", "one row per site"], ["ACC_SITE_SUMMARY", "rollups"], ["ACC_NODE_DETAIL", "one row per node"]], "+ history, current views"),
      column(null, "lay-con", 636, 100, "Consumers", [["BI", "dashboards", 80], ["LLM access", "via MCP", 80]])
    );

    [[286, "bronze", 1], [442, "silver", 2], [622, "gold", 3]].forEach(([x, layer, n]) => {
      const g = S("g", { class: "gate", "data-gate": n, "data-layer": layer, role: "button", tabindex: 0, "aria-label": `Quality gate ${n}` });
      g.append(S("circle", { cx: x, cy: 98, r: 10 }), txt(x, 102, String(n), { s: 11.5, w: 700, a: "middle" }));
      svg.append(g);
    });

    const lg = S("g");
    lg.append(txt(24, 362, "Quality gates (click a number)", { w: 600 }));
    [["1  Bronze to silver: freshness, row counts, schema drift, not-null keys", 382],
     ["2  Silver to gold: key uniqueness, orphans, unmapped codes, null rates", 400],
     ["3  Gold to consumers: reconciliation, history continuity, one current row per site", 418]].forEach(([t, y]) => lg.append(txt(24, y, t, { s: 11.5, q: true })));
    svg.append(lg);
    return svg;
  }

  // ===================================================================
  //  Diagram 2: bronze
  // ===================================================================
  function diagramBronze() {
    const svg = root("0 52 760 320", "Bronze keeps every source as-is, one raw view per instance");
    svg.append(arrowDefs("b-arrow"));
    const src = (y, a, b) => [rect(24, y, 200, 56, "box"), txt(124, y + 22, a, { w: 600, a: "middle" }), txt(124, y + 40, b, { s: 11.5, q: true, a: "middle" })];
    svg.append(...src(106, "Commercial instance", "CMDB, many object types"), ...src(264, "Regulated instance", "Site-level data only"));
    svg.append(line("M224 134H276", "b-arrow"), line("M224 292H276", "b-arrow"));
    svg.append(rect(280, 64, 456, 140, "raw"), txt(296, 88, "RAW_COMMERCIAL_VW", { w: 600 }));
    ["site_asset_cur", "site_ci_cur", "account_cur", "location_cur", "server_cur", "status_choice_cur"].forEach((t, i) => svg.append(txt(296, 112 + i * 16, t, { s: 11.5 })));
    ["memory_module_cur", "disk_cur", "software_agent_cur", "db_instance_cur", "entitlement_cur"].forEach((t, i) => svg.append(txt(516, 112 + i * 16, t, { s: 11.5 })));
    svg.append(txt(516, 192, "... and ~20 more objects", { s: 11.5, q: true }));
    svg.append(rect(280, 228, 456, 128, "raw"), txt(296, 252, "RAW_REGULATED_VW", { w: 600 }));
    ["site_asset_cur", "site_ci_cur", "account_cur", "parent_org_cur", "entitlement_cur"].forEach((t, i) => svg.append(txt(296, 276 + i * 16, t, { s: 11.5 })));
    return svg;
  }

  // ===================================================================
  //  Diagram 3: silver, entities built from bronze objects
  // ===================================================================
  function diagramSilverBuild() {
    const svg = root("0 44 760 500", "Each silver entity is built from raw bronze objects through a short set of transformations");
    svg.append(arrowDefs("s-arrow"));
    svg.append(txt(24, 60, "BRONZE (previous layer)", { s: 11.5, q: true }), txt(250, 60, "SILVER: entity, transformation, type", { s: 11.5, w: 600 }));
    const rows = [
      ["account_cur", "SLV_ACCOUNT", "standardize, dedup", "view"],
      ["location_cur", "SLV_LOCATION", "standardize, dedup", "view"],
      ["site_asset_cur", "SLV_SITE", "dedup, decode, classify", "table", true],
      ["entitlement_cur", "SLV_ENTITLEMENT", "dedup, active flag", "view"],
      ["server_cur", "SLV_NODE", "resolve devices, stale flag", "table"],
      [["memory_module_cur", "disk_cur"], "SLV_COMPONENT", "unify part types", "view"],
      ["software_agent_cur", "SLV_SOFTWARE_AGENT", "standardize, dedup", "view"],
      ["db_instance_cur", "SLV_DB_INSTANCE", "standardize, dedup", "view"],
      ["application_cur", "SLV_APPLICATION", "standardize, dedup", "view"],
      ["status_choice_cur", "SLV_REF_LOOKUP", "build governed lookup", "table"],
    ];
    rows.forEach(([src, ent, tr, kind, key], i) => {
      const y = 72 + i * 48;
      svg.append(line(`M174 ${y + 20}H250`, "s-arrow"));
      svg.append(rect(24, y, 150, 40, "ghost", 6));
      if (Array.isArray(src)) svg.append(txt(38, y + 17, src[0], { s: 11.5, q: true }), txt(38, y + 33, src[1], { s: 11.5, q: true }));
      else svg.append(txt(38, y + 24, src, { s: 11.5, q: true }));
      svg.append(rect(250, y, 486, 40, `box ${kind === "view" ? "dash" : ""} ${key ? "hub" : ""}`));
      svg.append(txt(266, y + 24, ent, { w: 600 }), txt(450, y + 24, tr, { s: 11.5, q: true }), txt(720, y + 24, kind, { s: 11.5, q: true, a: "end" }));
    });
    return svg;
  }

  // ===================================================================
  //  Diagram 4: silver data model
  // ===================================================================
  function diagramSilverModel() {
    const svg = root("0 50 760 570", "The site entity sits at the center, and every other entity relates to it by one key");
    const lines = ["M380 152V200", "M224 260H280", "M480 260H536", "M380 336V376", "M380 464V512", "M280 320H124V376", "M480 320H636V376"];
    lines.forEach((d) => svg.append(line(d)));
    const ent = (x, y, h, name, cols, o = {}) => {
      const g = S("g");
      g.append(rect(x, y, 200, h, `box ${o.dash === false ? "" : "dash"} ${o.hub ? "hub" : ""}`), txt(x + 16, y + 24, name, { w: 600 }));
      cols.forEach((c, i) => g.append(txt(x + 16, y + 40 + i * 16, c, { s: 11.5 })));
      svg.append(g);
    };
    ent(280, 64, 88, "SLV_ACCOUNT", ["PK account_id", "account_name", "sales_region"]);
    ent(24, 216, 88, "SLV_LOCATION", ["PK location_id", "city, region", "country, time_zone"]);
    ent(280, 200, 136, "SLV_SITE", ["PK site_id", "FK account_id", "FK location_id", "install_status", "hosting_model", "source_instance"], { dash: false, hub: true });
    ent(536, 216, 88, "SLV_ENTITLEMENT", ["PK entitlement_id", "FK site_id", "name, value, active"]);
    ent(24, 376, 88, "SLV_SOFTWARE_AGENT", ["PK, FK site_id", "agent_version", "proxy_host"]);
    ent(280, 376, 88, "SLV_NODE", ["PK node_id", "FK site_id", "function_group, is_stale"], { dash: false });
    ent(536, 376, 88, "SLV_DB_INSTANCE", ["PK, FK site_id", "db_version", "platform_family"]);
    ent(280, 512, 88, "SLV_COMPONENT", ["PK component_id", "FK node_id", "type, capacity, is_active"]);
    [["1", 388, 170], ["N", 388, 192], ["1", 230, 252], ["N", 266, 252], ["1", 486, 252], ["N", 522, 252], ["1", 388, 352], ["N", 388, 370],
     ["1", 388, 482], ["N", 388, 504], ["1", 262, 312], ["0..1", 132, 366], ["1", 486, 312], ["0..1", 644, 366]].forEach(([t, x, y]) => svg.append(txt(x, y, t, { s: 11.5 })));
    svg.append(txt(24, 612, "PK primary key, FK foreign key. 1 = one, N = many, 0..1 = optional one. SLV_APPLICATION follows the same pattern as SLV_DB_INSTANCE.", { s: 11, q: true }));
    return svg;
  }

  // ===================================================================
  //  Diagram 5: gold, how silver flattens into the site detail product
  // ===================================================================
  function diagramGoldFlatten() {
    const svg = root("0 48 760 440", "How silver entities flatten into the column groups of the site detail product");
    svg.append(arrowDefs("g-arrow"));
    svg.append(rect(384, 48, 368, 412, "none-box", 10, { fill: "none", stroke: "var(--gold)", "stroke-width": 1.5 }));
    svg.append(txt(400, 70, "ACC_SITE_DETAIL: one row per site", { w: 600 }));
    const pairs = [
      ["SLV_SITE", "the key entity", false, "Identity and status", "site_id, status, hosting_model"],
      ["SLV_ACCOUNT", "joined on account_id", true, "Account", "account_name, sales_region"],
      ["SLV_LOCATION", "joined on location_id", true, "Location", "city, country, time_zone"],
      ["SLV_ENTITLEMENT", "pivoted, one row per site", true, "Entitlements", "one column per entitlement type"],
      ["SLV_SOFTWARE_AGENT", "+ DB_INSTANCE, APPLICATION", true, "Platform", "agent, database and application versions"],
      ["SLV_NODE", "+ SLV_COMPONENT, aggregated", false, "Node rollup", "node_count, primary_nodes, total_capacity"],
    ];
    pairs.forEach(([l, ls, dash, r, rs], i) => {
      const y = 84 + i * 62;
      const g = S("g", { class: "pair", "data-pair": i, tabindex: 0 });
      g.append(
        line(`M244 ${y + 25}H400`, "g-arrow"),
        rect(24, y, 220, 50, `box ${dash ? "dash" : ""}`), txt(40, y + 22, l, { w: 600 }), txt(40, y + 40, ls, { s: 11.5, q: true }),
        rect(400, y, 336, 50, "box"), txt(416, y + 22, r, { w: 600 }), txt(416, y + 40, rs, { s: 11.5, q: true })
      );
      svg.append(g);
    });
    svg.append(txt(24, 476, "Dashed border: view. Solid border: table. Hover a row to see which silver entity feeds which column group.", { s: 11.5, q: true }));
    return svg;
  }

  // ===================================================================
  //  Layer explorer
  // ===================================================================
  const LAYERS = {
    bronze: {
      title: "Bronze: raw, as-is", color: "var(--bronze)",
      facts: [
        ["Purpose", "Keep an exact copy of each source, so any run can be replayed."],
        ["What's in it", "Two raw views, one per source instance. Example objects: site, account, location, server and memory module."],
        ["Rules", "No business logic. Only load metadata is added."],
        ["Quality gate", "Freshness, row counts, schema drift and not-null keys. On failure, silver keeps its last good state.", true],
      ],
      figs: [[diagramBronze, "Bronze layer: 2 raw views, one per source instance"]],
      after: "Bronze keeps rows exactly as they arrive: duplicates, coded status values and missing serials included. Silver cleans them up.",
    },
    silver: {
      title: "Silver: cleansed and conformed", color: "var(--silver)",
      facts: [
        ["Purpose", "Turn raw objects into reusable business entities, defined once."],
        ["What's in it", "Ten entities: site, account, location, entitlement, node, component, three software views and a shared reference lookup. Heavy logic (site, node, lookup) is a table. Light logic is a view."],
        ["Rules", "Three zones, applied in order.<ol><li><strong>Standardize:</strong> types, names, null handling and code decoding.</li><li><strong>Conform:</strong> deduplicate, resolve duplicate devices, and unify both instances with an instance flag.</li><li><strong>Business rules:</strong> flags and classifications. Records are flagged, never deleted.</li></ol>"],
        ["Quality gate", "Key uniqueness, orphans, unmapped codes, dedup ratio and null rates. On failure, gold does not publish.", true],
      ],
      figs: [[diagramSilverBuild, "Silver entities built from bronze objects. Dashed border: view. Solid border: table. Highlighted: the key entity."],
             [diagramSilverModel, "Silver data model: the site at the center"]],
      after: "Each silver entity is built from its raw table: duplicates collapse, codes are decoded and quality flags are added. Silver does not join entities together. Gold does that.",
    },
    gold: {
      title: "Gold: data products", color: "var(--gold)",
      facts: [
        ["Purpose", "Shape silver entities into products that consumers query directly."],
        ["What's in it", "Three products: site detail, site summary and node detail. Each has a history table plus current and history views."],
        ["Rules", "Read only from silver, never from another gold product. Apply the product scope, aggregate to the product grain, use business-friendly names and version the history."],
        ["Quality gate", "Site totals reconcile to nodes, history has no gaps, and each site has one current row. On failure, the previous version stays live.", true],
      ],
      figs: [[diagramGoldFlatten, "How silver entities flatten into the site detail columns. Codes are decoded in silver (through SLV_REF_LOOKUP), so gold contains joins and rollups only."]],
      after: "Each gold product has a current view with today's state and a history table that keeps every version of a row.",
    },
  };

  let currentLayer = "bronze";
  const e2e = diagramEndToEnd();
  $("#d-e2e").append(e2e);

  function setLayer(key, fromGate) {
    currentLayer = key;
    const L = LAYERS[key];
    $$(".tabs button").forEach((b) => {
      const on = b.dataset.layer === key;
      b.setAttribute("aria-selected", String(on));
      b.tabIndex = on ? 0 : -1;
    });
    $("#layer-body").setAttribute("aria-labelledby", `tab-${key}`);
    $$(".lay[data-layer]", e2e).forEach((g) => g.classList.toggle("is-sel", g.dataset.layer === key));
    $$(".gate", e2e).forEach((g) => g.classList.toggle("is-sel", fromGate != null && +g.dataset.gate === fromGate));

    const body = $("#layer-body");
    body.style.setProperty("--c", L.color);
    body.innerHTML =
      `<h3 class="layer-title"><i></i>${L.title}</h3>` +
      `<dl class="layer-facts">${L.facts.map(([k, v, gate]) => `<div><dt>${k}</dt><dd${gate ? ' class="gate-row"' : ""}>${v}</dd></div>`).join("")}</dl>` +
      `<div class="layer-figs"></div><p class="layer-after">${L.after}</p>`;
    const figs = $(".layer-figs", body);
    L.figs.forEach(([fn, cap]) => {
      const f = document.createElement("figure");
      f.append(fn());
      f.insertAdjacentHTML("beforeend", `<figcaption>${cap}</figcaption>`);
      figs.append(f);
    });
    if (key === "gold") bindGoldPairs();
  }

  function bindGoldPairs() {
    const pairs = $$(".pair", $("#layer-body"));
    const set = (i, on) => pairs[i] && pairs[i].classList.toggle("hl", on);
    pairs.forEach((p, i) => {
      p.addEventListener("mouseenter", () => set(i, true));
      p.addEventListener("mouseleave", () => set(i, false));
      p.addEventListener("focus", () => set(i, true));
      p.addEventListener("blur", () => set(i, false));
    });
  }

  $$(".tabs button").forEach((b, i, all) => {
    b.addEventListener("click", () => setLayer(b.dataset.layer));
    b.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const n = all[(i + (e.key === "ArrowRight" ? 1 : all.length - 1)) % all.length];
      setLayer(n.dataset.layer); n.focus();
    });
  });
  const pick = (g) => (g.dataset.gate ? setLayer(g.dataset.layer, +g.dataset.gate) : setLayer(g.dataset.layer));
  e2e.addEventListener("click", (e) => { const g = e.target.closest("[data-layer]"); if (g) pick(g); });
  e2e.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const g = e.target.closest("[data-layer]");
    if (g) { e.preventDefault(); pick(g); }
  });
  setLayer("bronze");

  // ===================================================================
  //  Lineage tables
  // ===================================================================
  const NULL = null;
  const LINEAGE = [
    { s: "bronze", title: "Bronze", tables: [
      { name: "site_asset_cur", cols: ["sys_id (PK)", "asset_tag", "account (FK)", "location (FK)", "install_status", "solution_type", "updated_on"],
        rows: [["site:1001", "a1f09c", "SITE-1001", "9e41aa", "1c0a01", "1", "AWS_MANAGED", "2026-03-02"],
               ["site:1001", "b2e17d", "SITE-1001", "9e41aa", "1c0a01", "1", "AWS_MANAGED", "2026-05-14"],
               ["site:1002", "c3d28e", "SITE-1002", "9e42bb", "1c0b02", "7", "ON_PREM", "2026-01-20"]] },
      { name: "server_cur", cols: ["sys_id (PK)", "asset (FK)", "serial_number", "function_code", "install_status", "last_discovered"],
        rows: [["node:1", "5d01aa", "b2e17d", "SN-0001", "PRIMARY", "1", "2026-05-14"],
               ["node:1", "5d02bb", "b2e17d", "SN-0001", "PRIMARY", "1", "2026-05-10"],
               ["node:2", "5d03cc", "c3d28e", NULL, "WORKER", "7", "2026-01-20"]] }],
      cap: "Bronze keeps these rows exactly as they arrive: duplicates, coded status values and missing serials included. Silver cleans them up." },
    { s: "silver", title: "Silver", tables: [
      { name: "SLV_SITE", note: "from site_asset_cur", cols: ["site_id (PK)", "account_id (FK)", "location_id (FK)", "install_status", "hosting_model", "source_instance", "dup_count", "updated_on"],
        rows: [["site:1001", "SITE-1001", "9e41aa", "1c0a01", "Installed", "Cloud managed", "commercial", "#2", "2026-05-14"],
               ["site:1002", "SITE-1002", "9e42bb", "1c0b02", "Retired", "On-premises", "regulated", "#1", "2026-01-20"]] },
      { name: "SLV_NODE", note: "from server_cur", cols: ["node_id (PK)", "site_id (FK)", "serial_number", "function_group", "install_status", "dup_count", "dq_flag"],
        rows: [["node:1", "SN-0001", "SITE-1001", "SN-0001", "Primary", "Installed", "#2", "ok"],
               ["node:2", "PSEUDO-5d03cc", "SITE-1002", NULL, "Worker", "Retired", "#1", "missing_serial"]] }],
      cap: "Two raw site rows became one current record, and two raw server rows became one node. dup_count shows how many raw rows were collapsed. The server with no serial number gets a generated key and a flag, and is never dropped." },
    { s: "gold", title: "Gold", tables: [
      { name: "ACC_SITE_DETAIL", note: "current view", cols: ["site_id", "account_name", "country", "status", "hosting_model", "source_instance", "node_count", "updated_on"],
        rows: [["site:1001", "SITE-1001", "Contoso Ltd", "US", "Installed", "Cloud managed", "commercial", "1", "2026-05-14"],
               ["site:1002", "SITE-1002", "Fabrikam Inc", "PT", "Retired", "On-premises", "regulated", "1", "2026-01-20"]] }],
      cap: "Account and country come from other silver entities, joined on the keys. Each gold product has a current view with today's state and a history table that keeps every version of a row." },
  ];

  function cell(v) {
    if (v === NULL) return `<td class="null">NULL</td>`;
    if (/^#\d+$/.test(v)) return `<td><span class="${v === "#1" ? "" : "cnt"}">${v.slice(1)}</span></td>`;
    if (v === "missing_serial") return `<td><span class="tag">${v}</span></td>`;
    if (v === "ok") return `<td><span class="tag ok">${v}</span></td>`;
    return `<td>${esc(v)}</td>`;
  }
  $("#lineage-body").innerHTML = LINEAGE.map((st, i) =>
    (i ? `<div class="arrow-row" aria-hidden="true">▼ ${["standardize, conform, apply business rules", "join and roll up into products"][i - 1]}</div>` : "") +
    `<div class="stage" data-s="${st.s}"><h3>${st.title}</h3>` +
    st.tables.map((t) =>
      `<p class="tbl-title"><strong>${t.name}</strong>${t.note ? " · " + t.note : ""}</p><div class="table-wrap"><table><thead><tr>${t.cols.map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>` +
      t.rows.map((r) => `<tr tabindex="0" data-k="${r[0]}">${r.slice(1).map(cell).join("")}</tr>`).join("") + `</tbody></table></div>`).join("") +
    `<p class="cap">${st.cap}</p></div>`).join("");

  const lin = $("#lineage-body");
  const mark = (tr, on) => $$(`tr[data-k="${tr.dataset.k}"]`, lin).forEach((r) => r.classList.toggle("hl", on));
  lin.addEventListener("mouseover", (e) => { const tr = e.target.closest("tr[data-k]"); if (tr) mark(tr, true); });
  lin.addEventListener("mouseout", (e) => { const tr = e.target.closest("tr[data-k]"); if (tr) mark(tr, false); });
  lin.addEventListener("focusin", (e) => { const tr = e.target.closest("tr[data-k]"); if (tr) mark(tr, true); });
  lin.addEventListener("focusout", (e) => { const tr = e.target.closest("tr[data-k]"); if (tr) mark(tr, false); });

  // ===================================================================
  //  Quality-gate simulator
  // ===================================================================
  const GATE_CHECKS = {
    1: ["Freshness", "Row counts", "Schema drift", "Not-null keys"],
    2: ["Key uniqueness", "Orphans", "Unmapped codes", "Null rates"],
    3: ["Reconciliation", "History continuity", "One current row"],
  };
  const GATE_NAMES = { 1: "Bronze → Silver", 2: "Silver → Gold", 3: "Gold → Consumers" };
  const SCENARIOS = [
    { id: "ok", gate: 0, label: "No failure (healthy run)" },
    { id: "fresh", gate: 1, check: "Freshness", label: "Stale source extract", detail: "The source extract is 31 hours old. The limit is 24 hours." },
    { id: "rows", gate: 1, check: "Row counts", label: "Row count collapses", detail: "site_asset_cur has 62% fewer rows than yesterday." },
    { id: "schema", gate: 1, check: "Schema drift", label: "Schema drift", detail: "Column install_status was renamed to state in the source." },
    { id: "nullkeys", gate: 1, check: "Not-null keys", label: "Null keys", detail: "214 rows arrived with a null sys_id." },
    { id: "dupkey", gate: 2, check: "Key uniqueness", label: "Duplicate keys", detail: "2 rows share site_id SITE-1001 after conforming." },
    { id: "orphan", gate: 2, check: "Orphans", label: "Orphaned records", detail: "3 nodes point to a site_id that does not exist." },
    { id: "unmapped", gate: 2, check: "Unmapped codes", label: "Unmapped codes", detail: "Status code 9 has no entry in SLV_REF_LOOKUP." },
    { id: "nullrate", gate: 2, check: "Null rates", label: "Null-rate spike", detail: "hosting_model is null in 38% of sites. The limit is 5%." },
    { id: "recon", gate: 3, check: "Reconciliation", label: "Totals don't reconcile", detail: "SITE-1002 shows node_count 2, but SLV_NODE holds 1 node for it." },
    { id: "gap", gate: 3, check: "History continuity", label: "Gap in history", detail: "SITE-1001 has no version covering 2026-03-02 to 2026-05-14." },
    { id: "twocur", gate: 3, check: "One current row", label: "Two current rows", detail: "SITE-1001 has 2 rows with is_current = true." },
  ];

  const list = $("#scenario-list");
  list.innerHTML =
    `<label class="sc"><input type="radio" name="sc" value="ok" checked> <span>${SCENARIOS[0].label}</span></label>` +
    [1, 2, 3].map((g) => `<div class="sc-group"><h4>Gate ${g} · ${GATE_NAMES[g]}</h4>` +
      SCENARIOS.filter((s) => s.gate === g).map((s) => `<label class="sc"><input type="radio" name="sc" value="${s.id}"> <span>${s.label}</span></label>`).join("") + `</div>`).join("");

  const STAGES = [
    { id: "src", name: "Sources", sub: "System A, 2 instances" },
    { id: "bronze", name: "Bronze", sub: "raw, as-is" },
    { id: "g1", name: "Gate 1", sub: GATE_NAMES[1], gate: 1 },
    { id: "silver", name: "Silver", sub: "conformed entities" },
    { id: "g2", name: "Gate 2", sub: GATE_NAMES[2], gate: 2 },
    { id: "gold", name: "Gold", sub: "data products" },
    { id: "g3", name: "Gate 3", sub: GATE_NAMES[3], gate: 3 },
    { id: "con", name: "Consumers", sub: "BI and LLM access" },
  ];
  const pipe = $("#pipeline");
  const setSt = (id, cls, text) => {
    const li = $(`#st-${id}`, pipe);
    li.className = `st ${li.dataset.gate ? "gate-st" : ""} ${cls || ""}`;
    $(".sx", li).textContent = text;
  };
  function resetPipeline() {
    pipe.innerHTML = STAGES.map((s) =>
      `<li class="st ${s.gate ? "gate-st" : ""}" id="st-${s.id}" ${s.gate ? 'data-gate="1"' : ""}><span class="nm">${s.name}<small>${s.sub}</small></span><span class="sx">Waiting</span></li>`).join("");
  }
  resetPipeline();

  const result = $("#gate-result");
  const runBtn = $("#run"), resetBtn = $("#run-reset");
  const checksHTML = (gate, failed) =>
    `<ul class="checks">${GATE_CHECKS[gate].map((c) => `<li class="${c === failed ? "x" : "ok"}">${c}</li>`).join("")}</ul>`;

  async function run() {
    const sc = SCENARIOS.find((s) => s.id === $('input[name="sc"]:checked').value);
    const g = sc.gate;
    runBtn.disabled = true; resetBtn.hidden = true;
    resetPipeline();
    result.className = "result"; result.textContent = "Running…";

    const step = async (id, text, cls = "run", ms = 380) => { setSt(id, cls, text); await wait(ms); };

    await step("src", "Extracting…"); setSt("src", "ok", "2 extracts received");
    await step("bronze", "Loading…"); setSt("bronze", "ok", "Loaded as-is · run #214");

    await step("g1", "Checking…");
    if (g === 1) {
      setSt("g1", "fail", `Failed: ${sc.check}`);
      setSt("silver", "held", "Held · keeps last good state (run #213)");
      setSt("g2", "", "Not run"); setSt("gold", "held", "Not rebuilt · run #213 stays live"); setSt("g3", "", "Not run");
    } else {
      setSt("g1", "ok", "Passed");
      await step("silver", "Building…"); setSt("silver", "ok", "Built · run #214");
      await step("g2", "Checking…");
      if (g === 2) {
        setSt("g2", "fail", `Failed: ${sc.check}`);
        setSt("gold", "held", "Not published · run #213 stays live"); setSt("g3", "", "Not run");
      } else {
        setSt("g2", "ok", "Passed");
        await step("gold", "Building…");
        await step("g3", "Checking…");
        if (g === 3) {
          setSt("gold", "held", "Built, not published · run #213 stays live");
          setSt("g3", "fail", `Failed: ${sc.check}`);
        } else {
          setSt("gold", "ok", "Published · run #214"); setSt("g3", "ok", "Passed");
        }
      }
    }

    if (g === 0) {
      setSt("con", "ok", "Reading run #214 · as of 09 Nov 06:00");
      result.className = "result ok";
      result.innerHTML = `<b>All three gates passed.</b>Consumers now read the new version.` + [1, 2, 3].map((n) => `<div>${GATE_NAMES[n]}${checksHTML(n)}</div>`).join("");
    } else {
      setSt("con", "held", "Still reading run #213 · as of 08 Nov 06:00");
      result.className = "result bad";
      result.innerHTML = `<b>Gate ${g} (${GATE_NAMES[g]}) failed: ${sc.label.toLowerCase()}.</b>${sc.detail} ` +
        (g === 1 ? "Silver kept its last good state, so nothing downstream changed." :
         g === 2 ? "Silver was built and the problem is flagged, but gold did not publish." :
                   "Gold was built but not published, so the previous version stays live.") +
        ` Consumers still read yesterday's version: <strong>a day old, but correct.</strong>` + checksHTML(g, sc.check);
    }
    runBtn.disabled = false; resetBtn.hidden = false;
  }
  runBtn.addEventListener("click", run);
  resetBtn.addEventListener("click", () => {
    resetPipeline(); resetBtn.hidden = true;
    result.className = "result"; result.textContent = "Pick a scenario and run the pipeline.";
  });

  // ===================================================================
  //  SCD Type 2 playground
  // ===================================================================
  const OPEN_END = "9999-12-31";
  const SCD_START = [
    { key: "SITE-1001-v1", status: "Pending install", nodes: 0, from: "2025-11-03", to: "2026-03-02", cur: false },
    { key: "SITE-1001-v2", status: "Installed", nodes: 0, from: "2026-03-02", to: "2026-05-14", cur: false },
    { key: "SITE-1001-v3", status: "Installed", nodes: 1, from: "2026-05-14", to: OPEN_END, cur: true },
  ];
  let scd = SCD_START.map((r) => ({ ...r }));
  let newKey = null;

  const scdMsg = $("#scd-msg");
  function renderScd() {
    $("#scd-table").innerHTML =
      `<thead><tr><th>version_key (PK)</th><th>site_id</th><th>status</th><th>node_count</th><th>valid_from</th><th>valid_to</th><th>is_current</th></tr></thead><tbody>` +
      scd.map((r) => `<tr data-v="${r.key}" class="${r.cur ? "cur" : ""} ${r.key === newKey ? "new" : ""}"><td>${r.key}</td><td>SITE-1001</td><td>${r.status}</td><td>${r.nodes}</td><td>${r.from}</td><td>${r.to}</td><td>${r.cur}</td></tr>`).join("") + `</tbody>`;
    const c = scd.find((r) => r.cur);
    $("#scd-current").innerHTML =
      `<thead><tr><th>site_id</th><th>status</th><th>node_count</th><th>since</th></tr></thead><tbody><tr class="cur"><td>SITE-1001</td><td>${c.status}</td><td>${c.nodes}</td><td>${c.from}</td></tr></tbody>`;
    travel();
  }
  function travel() {
    const d = $("#tt-date").value;
    $$("#scd-table tr.tt").forEach((r) => r.classList.remove("tt"));
    const out = $("#tt-msg");
    if (!d) { out.textContent = ""; return; }
    const hit = scd.find((r) => r.from <= d && d < r.to);
    if (!hit) { out.textContent = `On ${d} there was no record of this site yet.`; return; }
    $(`#scd-table tr[data-v="${hit.key}"]`).classList.add("tt");
    out.innerHTML = `On <strong>${d}</strong> the site was <strong>${hit.status}</strong> with <strong>${hit.nodes}</strong> node${hit.nodes === 1 ? "" : "s"} (${hit.key.split("-").pop()}, valid ${hit.from} to ${hit.to === OPEN_END ? "today" : hit.to}).`;
  }
  $("#scd-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const status = $("#scd-status").value;
    const nodes = Math.max(0, Math.min(9, parseInt($("#scd-nodes").value, 10) || 0));
    const date = $("#scd-date").value;
    const cur = scd.find((r) => r.cur);
    scdMsg.classList.remove("bad"); newKey = null;
    if (status === cur.status && nodes === cur.nodes) {
      scdMsg.textContent = "Nothing changed, so no new version is written.";
      return;
    }
    if (!date || date <= cur.from) {
      scdMsg.classList.add("bad");
      scdMsg.textContent = `The effective date must be after ${cur.from}, when the current version opened.`;
      return;
    }
    const n = scd.length + 1;
    cur.to = date; cur.cur = false;
    newKey = `SITE-1001-v${n}`;
    scd.push({ key: newKey, status, nodes, from: date, to: OPEN_END, cur: true });
    scdMsg.textContent = `Closed v${n - 1} on ${date} and opened v${n}. The current view still returns exactly one row.`;
    renderScd();
  });
  $("#scd-reset").addEventListener("click", () => {
    scd = SCD_START.map((r) => ({ ...r })); newKey = null;
    scdMsg.classList.remove("bad"); scdMsg.textContent = "";
    $("#scd-status").value = "Installed"; $("#scd-nodes").value = 1; $("#scd-date").value = "2026-11-09";
    renderScd();
  });
  $("#tt-date").addEventListener("input", travel);
  renderScd();
})();
