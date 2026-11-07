// ============================================================
//  EDIT YOUR CONTENT HERE
// ============================================================

// If you set your GitHub username, your most recent public repos are added
// as extra projects. Leave it empty ("") to show only the list below.
const GITHUB_USER = "";
const GITHUB_MAX_REPOS = 6;

// Based on folders found on your machine; review and adjust titles and descriptions.
const projects = [
  {
    title: "PadelBook",
    description: "Android app for booking padel courts. Describe the problem it solves, its main screens and the technologies you used (Kotlin/Java, Firebase, etc.).",
    tags: ["Android", "Mobile"],
    image: "",            // e.g. "img/padelbook.png" (empty = gradient with initial)
    demo: "",             // live demo or video
    code: "",             // repository
  },
  {
    title: "RAG Agents with LLMs",
    description: "Retrieval-augmented generation pipeline with large language models: document indexing, semantic search and agents that answer using retrieved context.",
    tags: ["Python", "LLM", "Data"],
    image: "",
    demo: "",
    code: "",
  },
  {
    title: "Gradient Descent",
    description: "Report and experiments on gradient descent optimization: implementation from scratch, effect of the learning rate and convergence.",
    tags: ["Python", "Machine Learning", "Data"],
    image: "",
    demo: "",
    code: "",             // you can link the PDF: "docs/gradient-descent-report.pdf"
  },
];

// Skills grouped by category
const skills = {
  "Languages": ["Python", "JavaScript", "SQL", "Kotlin / Java"],
  "Data & ML": ["NumPy", "Pandas", "Matplotlib", "scikit-learn", "Jupyter", "LLMs / RAG"],
  "Development": ["Android", "HTML / CSS", "Git", "Docker"],
};

// ============================================================
//  LOGIC (you normally don't need to touch this)
// ============================================================

const grid = document.getElementById("project-grid");
const filtersEl = document.getElementById("filters");
let activeTag = "All";

function makeCard(p) {
  const card = document.createElement("article");
  card.className = "card";

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
  for (const [label, href] of [["Demo", p.demo], ["Code", p.code]]) {
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
  const tags = ["All", ...new Set(projects.flatMap((p) => p.tags))];
  filtersEl.replaceChildren(
    ...tags.map((t) => {
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

function renderSkills() {
  const el = document.getElementById("skills");
  for (const [group, items] of Object.entries(skills)) {
    const wrap = document.createElement("div");
    wrap.className = "skill-group";
    const h = document.createElement("h3");
    h.textContent = group;
    const chips = document.createElement("div");
    chips.className = "chips";
    for (const s of items) {
      const c = document.createElement("span");
      c.textContent = s;
      chips.append(c);
    }
    wrap.append(h, chips);
    el.append(wrap);
  }
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
renderSkills();
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
