// ============================================================
//  EDIT YOUR CONTENT HERE
// ============================================================

// If you set your GitHub username, your most recent public repos are added
// as extra projects. Leave it empty ("") to show only the list below.
const GITHUB_USER = "";
const GITHUB_MAX_REPOS = 6;

// Projects shown in the portfolio. A card with an `href` is a link to a report.
const projects = [
  {
    title: "Medallion Architecture: Enterprise Data Product",
    description: "Case study of a bronze, silver and gold architecture that turns raw, duplicated enterprise data into three reusable data products. Quality gates, SCD Type 2 history and a decision log, in an interactive demo on fictional data.",
    tags: ["Data Engineering", "Architecture", "Data Modelling"],
    image: "img/medallion-preview.svg",
    href: "projects/medallion-architecture/",
    linkLabel: "Open case study",
    demo: "",
    code: "",
  },
  {
    title: "AI Usage & Cost Dashboard",
    description: "Interactive report on who uses which AI models, what it costs and what changed. Cross-filtering, drag-to-select dates and written insights. Built on fictional data.",
    tags: ["Data Analysis", "Dashboard", "JavaScript"],
    image: "img/ai-usage-preview.svg",
    href: "reports/ai-usage/",
    linkLabel: "Open interactive report",
    demo: "",
    code: "",
  },
  {
    title: "Metadata Quality Scorecard",
    description: "Interactive report that turns the documentation coverage and quality of 800+ data tables into a story: where things stand, where the gaps are and what to fix first. Built on fictional retail data.",
    tags: ["Data Analysis", "Dashboard", "JavaScript"],
    image: "img/scorecard-preview.svg",
    href: "reports/metadata-scorecard/",   // makes the whole card a link (opens in a new tab)
    linkLabel: "Open interactive report",
    demo: "",
    code: "",
  },
];

// ============================================================
//  LOGIC (you normally don't need to touch this)
// ============================================================

const grid = document.getElementById("project-grid");
const filtersEl = document.getElementById("filters");
// Category tabs shown above the cards. Add more names here (and matching `tags`
// on the projects) when new kinds of work are added.
const CATEGORIES = ["All", "Data Analysis", "Data Engineering"];
let activeTag = CATEGORIES[0];

function makeCard(p) {
  // With an `href`, the whole card is a link that opens in a new tab
  const card = document.createElement(p.href ? "a" : "article");
  card.className = "card";
  if (p.href) {
    card.href = p.href;
    card.target = "_blank";
    card.rel = "noopener";
  }

  const thumb = document.createElement("div");
  thumb.className = "thumb";
  if (p.image) {
    const img = document.createElement("img");
    img.src = p.image;
    img.alt = p.title;
    img.loading = "lazy";
    thumb.append(img);
  } else {
    thumb.textContent = p.title.charAt(0).toUpperCase();
  }

  const body = document.createElement("div");
  body.className = "body";

  const h3 = document.createElement("h3");
  h3.textContent = p.title;

  const desc = document.createElement("p");
  desc.textContent = p.description;

  const tags = document.createElement("div");
  tags.className = "tags";
  for (const t of p.tags) {
    const s = document.createElement("span");
    s.textContent = t;
    tags.append(s);
  }

  const actions = document.createElement("div");
  actions.className = "actions";
  if (p.href) {
    const cta = document.createElement("span");
    cta.textContent = (p.linkLabel || "Open") + " ↗";
    actions.append(cta);
  }
  for (const [label, href] of p.href ? [] : [["Demo", p.demo], ["Code", p.code]]) {
    if (!href) continue;
    const a = document.createElement("a");
    a.href = href;
    a.textContent = label + " →";
    a.target = "_blank";
    a.rel = "noopener";
    actions.append(a);
  }

  body.append(h3, desc, tags);
  if (actions.children.length) body.append(actions);
  card.append(thumb, body);
  return card;
}

function renderProjects() {
  grid.replaceChildren(
    ...projects
      .filter((p) => activeTag === "All" || p.tags.includes(activeTag))
      .map(makeCard)
  );
}

function renderFilters() {
  filtersEl.replaceChildren(
    ...CATEGORIES.map((t) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = t;
      b.className = "filter" + (t === activeTag ? " active" : "");
      b.setAttribute("aria-pressed", String(t === activeTag));
      b.addEventListener("click", () => {
        activeTag = t;
        renderFilters();
        renderProjects();
      });
      return b;
    })
  );
}

// Public GitHub repos (optional)
async function loadGithub() {
  if (!GITHUB_USER) return;
  try {
    const res = await fetch(
      `https://api.github.com/users/${encodeURIComponent(GITHUB_USER)}/repos?sort=updated&per_page=30`
    );
    if (!res.ok) throw new Error(res.status);
    const repos = (await res.json())
      .filter((r) => !r.fork && !r.archived)
      .filter((r) => !projects.some((p) => p.code === r.html_url))
      .slice(0, GITHUB_MAX_REPOS);
    for (const r of repos) {
      projects.push({
        title: r.name,
        description: r.description || "Repository on GitHub.",
        tags: ["GitHub", ...(r.language ? [r.language] : [])],
        image: "",
        demo: r.homepage || "",
        code: r.html_url,
      });
    }
    renderFilters();
    renderProjects();
  } catch (e) {
    console.warn("Could not load GitHub repos:", e);
  }
}

renderFilters();
renderProjects();
loadGithub();

document.getElementById("year").textContent = new Date().getFullYear();

// Light/dark theme toggle
document.getElementById("theme-toggle").addEventListener("click", () => {
  const root = document.documentElement;
  const isDark =
    root.dataset.theme === "dark" ||
    (!root.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
  const next = isDark ? "light" : "dark";
  root.dataset.theme = next;
  try { localStorage.setItem("theme", next); } catch (e) {}
});
