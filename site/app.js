import {
  buildFilterOptions,
  filterInvestors,
  filterOrganizations,
  formatScore,
  formatStars,
  indexById,
  normalizeTier,
  paginate,
  scoreToPercent,
  sectionEntries,
} from "./core.mjs";

const DATA = {
  investors: "data/investors.json",
  organizations: "data/organizations.json",
  reports: "data/reports/",
};

const state = {
  route: "directory",
  investorId: "",
  page: 1,
  pageSize: 24,
  filters: {
    query: "",
    region: "",
    organizationKind: "",
    ratingTier: "",
    stars: "",
    tag: "",
    sort: "score-desc",
  },
  organizationFilters: {
    query: "",
    kind: "",
  },
};

const cache = {
  investors: null,
  investorById: null,
  organizations: null,
  organizationById: null,
  reports: new Map(),
};

const dom = {};

function $(selector) {
  return document.querySelector(selector);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function compact(value, fallback = "Unknown") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

async function loadJson(name) {
  if (cache[name]) return cache[name];
  try {
    const response = await fetch(DATA[name]);
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    cache[name] = await response.json();
    return cache[name];
  } catch (error) {
    const fileHint = location.protocol === "file:" ? " Serve the site with a local static server instead of opening index.html directly." : "";
    throw new Error(`Unable to load ${DATA[name]}.${fileHint} ${error.message}`);
  }
}

async function loadInvestors() {
  if (!cache.investors) {
    cache.investors = await loadJson("investors");
    cache.investorById = indexById(cache.investors);
  }
  return cache.investors;
}

async function loadOrganizations() {
  if (!cache.organizations) {
    cache.organizations = await loadJson("organizations");
    cache.organizationById = indexById(cache.organizations);
  }
  return cache.organizations;
}

async function loadReport(id) {
  const key = String(id || "");
  if (!key) return null;
  if (cache.reports.has(key)) return cache.reports.get(key);
  try {
    const response = await fetch(`${DATA.reports}${encodeURIComponent(key)}.json`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`${response.status} ${response.statusText}`);
    }
    const report = await response.json();
    cache.reports.set(key, report);
    return report;
  } catch (error) {
    const fileHint = location.protocol === "file:" ? " Serve the site with a local static server instead of opening index.html directly." : "";
    throw new Error(`Unable to load report ${key}.${fileHint} ${error.message}`);
  }
}

function setNotice(element, message = "", type = "info") {
  if (!element) return;
  if (!message) {
    element.hidden = true;
    element.textContent = "";
    element.className = "notice";
    return;
  }
  element.hidden = false;
  element.textContent = message;
  element.className = `notice ${type === "error" ? "error" : ""}`.trim();
}

function setActiveRoute(route) {
  document.querySelectorAll(".tab").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.route === route);
  });
  dom.directoryView.classList.toggle("is-active", route === "directory");
  dom.detailView.classList.toggle("is-active", route === "investor");
  dom.organizationsView.classList.toggle("is-active", route === "organizations");
}

function paramsFromFilters(params, filters) {
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  if (state.page > 1) params.set("page", String(state.page));
}

function buildDirectoryHash() {
  const params = new URLSearchParams();
  paramsFromFilters(params, state.filters);
  const query = params.toString();
  return query ? `#directory?${query}` : "#directory";
}

function updateHash(replace = false) {
  let next = "#directory";
  if (state.route === "organizations") next = "#organizations";
  if (state.route === "investor") next = `#investor?id=${encodeURIComponent(state.investorId)}`;
  if (state.route === "directory") next = buildDirectoryHash();
  if (location.hash === next) return;
  if (replace) {
    history.replaceState(null, "", next);
  } else {
    location.hash = next;
  }
}

function parseHash() {
  const raw = location.hash.replace(/^#/, "");
  if (!raw) return;
  const [route, query = ""] = raw.split("?");
  const params = new URLSearchParams(query);

  state.route = route || "directory";
  if (!["directory", "investor", "organizations"].includes(state.route)) {
    state.route = "directory";
  }
  state.investorId = params.get("id") || state.investorId || "";
  state.page = Number(params.get("page")) || 1;

  for (const key of Object.keys(state.filters)) {
    const value = params.get(key);
    if (value != null) state.filters[key] = value;
  }
}

function syncControlsFromState() {
  dom.searchInput.value = state.filters.query;
  dom.regionFilter.value = state.filters.region;
  dom.kindFilter.value = state.filters.organizationKind;
  dom.tierFilter.value = state.filters.ratingTier;
  dom.starsFilter.value = state.filters.stars;
  dom.tagFilter.value = state.filters.tag;
  dom.sortSelect.value = state.filters.sort;
  dom.organizationSearch.value = state.organizationFilters.query;
  dom.organizationKindFilter.value = state.organizationFilters.kind;
}

function optionHtml(value, label = value) {
  return `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`;
}

function setOptions(select, values, placeholder, formatter = (value) => value) {
  const current = select.value;
  select.innerHTML = optionHtml("", placeholder) + values.map((value) => optionHtml(value, formatter(value))).join("");
  select.value = current;
}

function renderSummaryCards(investors = []) {
  const organizationCount = new Set(investors.map((item) => item.organizationId || item.organizationName).filter(Boolean)).size;
  const metrics = [
    ["Investors", investors.length.toLocaleString()],
    ["Pages", Math.ceil(investors.length / state.pageSize).toLocaleString()],
    ["Page size", state.pageSize.toLocaleString()],
    ["Organizations", organizationCount.toLocaleString()],
  ];
  dom.summaryCards.innerHTML = metrics
    .map(([label, value]) => `
      <article class="metric-card">
        <div class="label">${escapeHtml(label)}</div>
        <div class="metric-value">${escapeHtml(value)}</div>
      </article>
    `)
    .join("");
}

function renderPager(target, pageInfo) {
  target.innerHTML = `
    <button type="button" data-page="${pageInfo.page - 1}" ${pageInfo.page <= 1 ? "disabled" : ""}>Prev</button>
    <span>${escapeHtml(pageInfo.page)} / ${escapeHtml(pageInfo.totalPages)}</span>
    <button type="button" data-page="${pageInfo.page + 1}" ${pageInfo.page >= pageInfo.totalPages ? "disabled" : ""}>Next</button>
  `;
  target.querySelectorAll("button[data-page]").forEach((button) => {
    button.addEventListener("click", () => {
      state.page = Number(button.dataset.page);
      updateHash(true);
      renderDirectory();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

function renderMetricList(metrics = [], limit = 2) {
  return metrics.slice(0, limit).map((metric) => `
    <div class="mini-metric">
      <strong>${escapeHtml(metric.label)}</strong>
      <span>${escapeHtml(formatScore(metric.score))}</span>
    </div>
  `).join("");
}

function radarPoint(index, radius, total = 6, cx = 84, cy = 78) {
  const angle = ((-90 + (360 / total) * index) * Math.PI) / 180;
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius,
  };
}

function pointList(points) {
  return points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
}

function shortRadarLabel(value) {
  const text = compact(value, "Skill");
  const aliases = {
    drypowder: "Powder",
    sectorfit: "Sector",
    decisionpower: "Decision",
    activity: "Activity",
    leadrole: "Lead",
    risk: "Risk",
  };
  const alias = aliases[text.toLowerCase().replace(/\s+/g, "")];
  if (alias) return alias;
  if (text.length <= 10) return text;
  const initials = text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("");
  return initials.length > 1 ? initials.slice(0, 4).toUpperCase() : text.slice(0, 8);
}

function renderSkillRadar(dimensions = [], mode = "card") {
  const skills = dimensions.slice(0, 6);
  if (!skills.length) return "";
  const axes = [...skills];
  while (axes.length < 6) axes.push({ label: "", score: 0 });

  const radius = 48;
  const rings = [1, 0.75, 0.5, 0.25]
    .map((scale) => `<polygon class="radar-grid" points="${pointList(axes.map((_, index) => radarPoint(index, radius * scale)))}"></polygon>`)
    .join("");
  const spokes = axes
    .map((_, index) => {
      const end = radarPoint(index, radius);
      return `<line class="radar-axis" x1="84" y1="78" x2="${end.x.toFixed(1)}" y2="${end.y.toFixed(1)}"></line>`;
    })
    .join("");
  const values = pointList(axes.map((dimension, index) => radarPoint(index, radius * (scoreToPercent(dimension.score) / 100))));
  const labels = axes
    .map((dimension, index) => {
      if (!dimension.label && !dimension.key) return "";
      const labelPoint = radarPoint(index, radius + 17);
      return `<text class="radar-label" x="${labelPoint.x.toFixed(1)}" y="${labelPoint.y.toFixed(1)}" text-anchor="middle" dominant-baseline="middle">${escapeHtml(shortRadarLabel(dimension.label || dimension.key))}</text>`;
    })
    .join("");
  const scoreItems = skills
    .map((dimension) => `
      <span class="radar-score">
        <strong>${escapeHtml(shortRadarLabel(dimension.label || dimension.key))}</strong>
        <span>${escapeHtml(formatScore(dimension.score))}</span>
      </span>
    `)
    .join("");

  return `
    <div class="skill-radar is-${escapeHtml(mode)}" aria-label="Six-dimension person skill radar">
      <svg viewBox="0 0 168 156" role="img" aria-label="Six-dimension person skill radar">
        <title>Six-dimension person skill radar</title>
        ${rings}
        ${spokes}
        <polygon class="radar-fill" points="${values}"></polygon>
        <polygon class="radar-stroke" points="${values}"></polygon>
        ${labels}
      </svg>
      <div class="radar-score-list">${scoreItems}</div>
    </div>
  `;
}

function renderInvestorCard(investor) {
  const tags = (investor.tags || []).slice(0, 5).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
  const skills = renderSkillRadar(investor.dimensions || investor.keyMetrics || [], "card");
  return `
    <article class="investor-card">
      <header>
        <div>
          <h3>${escapeHtml(investor.name)}</h3>
          <p class="muted">${escapeHtml(compact(investor.title))}</p>
        </div>
        <div class="score-pill">${escapeHtml(formatScore(investor.totalScore))}</div>
      </header>
      <div class="tag-row">
        <span class="star-text">${escapeHtml(formatStars(investor.stars))}</span>
        <span class="tier">${escapeHtml(normalizeTier(investor.ratingTier))}</span>
      </div>
      <p class="muted">${escapeHtml(compact(investor.organizationName))} · ${escapeHtml(compact(investor.region))}</p>
      <p class="summary">${escapeHtml(investor.summary || investor.actionRecommendation || "No summary available.")}</p>
      ${skills || `<div class="key-metrics">${renderMetricList(investor.keyMetrics || investor.dimensions || [])}</div>`}
      <div class="tag-row card-tags">${tags}</div>
      <button class="card-action" type="button" data-investor-id="${escapeHtml(investor.id)}">Open report</button>
    </article>
  `;
}

function wireTagRollers(root) {
  root.querySelectorAll(".card-tags").forEach((row) => {
    const refresh = () => {
      const overflow = row.scrollWidth - row.clientWidth;
      row.classList.toggle("is-rollable", overflow > 1);
      if (overflow <= 1) row.scrollLeft = 0;
    };

    row.addEventListener("pointerenter", refresh);
    row.addEventListener("pointermove", (event) => {
      const overflow = row.scrollWidth - row.clientWidth;
      if (overflow <= 1) return;
      const bounds = row.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
      row.scrollLeft = overflow * ratio;
    });
    row.addEventListener("pointerleave", () => {
      row.scrollTo({ left: 0, behavior: "smooth" });
    });
    refresh();
  });
}

async function ensureDirectoryFilters(investors) {
  if (dom.regionFilter.dataset.ready) return;
  const options = buildFilterOptions(investors);
  setOptions(dom.regionFilter, options.regions, "All regions");
  setOptions(dom.kindFilter, options.organizationKinds, "All kinds");
  setOptions(dom.tierFilter, options.ratingTiers, "All tiers", normalizeTier);
  setOptions(dom.starsFilter, options.stars, "Any stars", (value) => `${value}+ stars`);
  setOptions(dom.tagFilter, options.tags, "Any tag");
  dom.regionFilter.dataset.ready = "true";
  syncControlsFromState();
}

async function renderDirectory() {
  setActiveRoute("directory");
  setNotice(dom.directoryStatus, "Loading investor data...");
  try {
    const investors = await loadInvestors();
    renderSummaryCards(investors);
    await ensureDirectoryFilters(investors);
    const filtered = filterInvestors(investors, state.filters);
    const pageInfo = paginate(filtered, state.page, state.pageSize);
    state.page = pageInfo.page;
    dom.resultSummary.textContent = pageInfo.total
      ? `Showing ${pageInfo.start.toLocaleString()}-${pageInfo.end.toLocaleString()} of ${pageInfo.total.toLocaleString()} matches.`
      : "No investors match these filters.";
    dom.investorGrid.innerHTML = pageInfo.items.map(renderInvestorCard).join("");
    wireTagRollers(dom.investorGrid);
    dom.investorGrid.querySelectorAll("[data-investor-id]").forEach((button) => {
      button.addEventListener("click", () => {
        state.route = "investor";
        state.investorId = button.dataset.investorId;
        updateHash();
      });
    });
    renderPager(dom.topPager, pageInfo);
    renderPager(dom.bottomPager, pageInfo);
    setNotice(dom.directoryStatus, pageInfo.total ? "" : "No results. Adjust filters or reset the directory.");
  } catch (error) {
    dom.investorGrid.innerHTML = "";
    setNotice(dom.directoryStatus, error.message, "error");
  }
}

function renderDimension(dimension) {
  return `
    <div class="mini-metric">
      <strong>${escapeHtml(dimension.label || dimension.key)}</strong>
      <span>${escapeHtml(formatScore(dimension.score))} · ${escapeHtml(compact(dimension.tier, "tier n/a"))}</span>
    </div>
  `;
}

function renderSources(sources = []) {
  if (!sources.length) return `<p class="muted">No sources listed.</p>`;
  return `<div class="source-list">${sources.map((source) => `
    <a href="${escapeHtml(source.url || "#")}" target="_blank" rel="noreferrer">${escapeHtml(source.title || source.url || "Source")}</a>
  `).join("")}</div>`;
}

async function renderDetail() {
  setActiveRoute("investor");
  setNotice(dom.detailStatus, "Loading detailed report...");
  dom.detailPanel.innerHTML = `<h2 id="detailTitle">Investor detail</h2>`;
  try {
    const report = await loadReport(state.investorId);
    if (!report) {
      setNotice(dom.detailStatus, `No detailed report found for ${state.investorId}.`, "error");
      return;
    }
    const sections = sectionEntries(report.sections);
    dom.detailPanel.innerHTML = `
      <div class="detail-hero">
        <div>
          <div class="label">${escapeHtml(compact(report.organizationKind))}</div>
          <h2>${escapeHtml(report.name)}</h2>
          <p class="muted">${escapeHtml(compact(report.title))} · ${escapeHtml(compact(report.organizationName))} · ${escapeHtml(compact(report.region))}</p>
          <div class="tag-row">
            <span class="star-text">${escapeHtml(formatStars(report.stars))}</span>
            <span class="tier">${escapeHtml(normalizeTier(report.ratingTier))}</span>
            ${(report.tags || []).slice(0, 8).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
          </div>
        </div>
        <div class="score-pill">${escapeHtml(formatScore(report.totalScore))}</div>
      </div>
      <div class="detail-grid">
        <section class="detail-section">
          <h3>Summary</h3>
          <p class="section-text">${escapeHtml(report.summary || "No summary available.")}</p>
        </section>
        <section class="detail-section">
          <h3>Action recommendation</h3>
          <p class="section-text">${escapeHtml(report.actionRecommendation || "No recommendation available.")}</p>
        </section>
        <section class="detail-section">
          <h3>Perspective</h3>
          <p>${escapeHtml(compact(report.perspective, "Not specified"))}</p>
          <p class="muted">Generated ${escapeHtml(compact(report.generatedDate, "date unavailable"))}</p>
        </section>
        <section class="detail-section">
          <h3>Dimensions</h3>
          ${renderSkillRadar(report.dimensions || [], "detail")}
          <div class="key-metrics dimension-metrics">${(report.dimensions || []).map(renderDimension).join("")}</div>
        </section>
        <section class="detail-section">
          <h3>Key metrics</h3>
          <div class="key-metrics">${(report.keyMetrics || []).map(renderDimension).join("")}</div>
        </section>
        <section class="detail-section">
          <h3>Sources</h3>
          ${renderSources(report.sources)}
        </section>
        ${sections.map(([name, text]) => `
          <section class="detail-section">
            <h3>${escapeHtml(name)}</h3>
            <p class="section-text">${escapeHtml(text)}</p>
          </section>
        `).join("")}
      </div>
    `;
    setNotice(dom.detailStatus);
  } catch (error) {
    setNotice(dom.detailStatus, error.message, "error");
  }
}

function ensureOrganizationFilters(organizations) {
  if (dom.organizationKindFilter.dataset.ready) return;
  const kinds = [...new Set(organizations.map((item) => item.kind).filter(Boolean))].sort();
  setOptions(dom.organizationKindFilter, kinds, "All kinds");
  dom.organizationKindFilter.dataset.ready = "true";
  syncControlsFromState();
}

async function renderOrganizations() {
  setActiveRoute("organizations");
  setNotice(dom.organizationStatus, "Loading organizations...");
  try {
    const organizations = await loadOrganizations();
    ensureOrganizationFilters(organizations);
    const results = filterOrganizations(organizations, state.organizationFilters);
    dom.organizationSummary.textContent = `${results.length.toLocaleString()} of ${organizations.length.toLocaleString()} organizations shown.`;
    dom.organizationList.innerHTML = results.slice(0, 240).map((org) => `
      <article class="organization-card">
        <div class="org-visual" style="background:${escapeHtml(org.visual?.background || "")}"></div>
        <h3>${escapeHtml(compact(org.displayName || org.normalizedName))}</h3>
        <p class="muted">${escapeHtml(compact(org.kind))} · ${escapeHtml(Number(org.investorCount || 0).toLocaleString())} investors</p>
        <p>${escapeHtml((org.rawNames || []).slice(0, 5).join(", ") || "No aliases listed.")}</p>
      </article>
    `).join("");
    setNotice(dom.organizationStatus, results.length > 240 ? "Showing the first 240 organization matches. Narrow the search to reduce the list." : "");
  } catch (error) {
    setNotice(dom.organizationStatus, error.message, "error");
  }
}

async function render() {
  parseHash();
  syncControlsFromState();
  if (state.route === "investor") return renderDetail();
  if (state.route === "organizations") return renderOrganizations();
  return renderDirectory();
}

function applyDirectoryControls() {
  state.filters.query = dom.searchInput.value;
  state.filters.region = dom.regionFilter.value;
  state.filters.organizationKind = dom.kindFilter.value;
  state.filters.ratingTier = dom.tierFilter.value;
  state.filters.stars = dom.starsFilter.value;
  state.filters.tag = dom.tagFilter.value;
  state.filters.sort = dom.sortSelect.value;
  state.page = 1;
  state.route = "directory";
  updateHash(true);
  renderDirectory();
}

function bindEvents() {
  document.querySelectorAll("[data-route]").forEach((button) => {
    button.addEventListener("click", () => {
      state.route = button.dataset.route;
      updateHash();
    });
  });

  [
    dom.searchInput,
    dom.regionFilter,
    dom.kindFilter,
    dom.tierFilter,
    dom.starsFilter,
    dom.tagFilter,
    dom.sortSelect,
  ].forEach((control) => control.addEventListener("input", applyDirectoryControls));

  dom.resetFilters.addEventListener("click", () => {
    state.filters = { query: "", region: "", organizationKind: "", ratingTier: "", stars: "", tag: "", sort: "score-desc" };
    state.page = 1;
    syncControlsFromState();
    updateHash(true);
    renderDirectory();
  });

  dom.backToDirectory.addEventListener("click", () => {
    state.route = "directory";
    location.hash = buildDirectoryHash();
  });

  [dom.organizationSearch, dom.organizationKindFilter].forEach((control) => {
    control.addEventListener("input", () => {
      state.organizationFilters.query = dom.organizationSearch.value;
      state.organizationFilters.kind = dom.organizationKindFilter.value;
      renderOrganizations();
    });
  });

  window.addEventListener("hashchange", render);
}

function cacheDom() {
  Object.assign(dom, {
    summaryCards: $("#summaryCards"),
    directoryView: $("#directoryView"),
    detailView: $("#detailView"),
    organizationsView: $("#organizationsView"),
    resetFilters: $("#resetFilters"),
    searchInput: $("#searchInput"),
    regionFilter: $("#regionFilter"),
    kindFilter: $("#kindFilter"),
    tierFilter: $("#tierFilter"),
    starsFilter: $("#starsFilter"),
    tagFilter: $("#tagFilter"),
    sortSelect: $("#sortSelect"),
    resultSummary: $("#resultSummary"),
    directoryStatus: $("#directoryStatus"),
    investorGrid: $("#investorGrid"),
    topPager: $("#topPager"),
    bottomPager: $("#bottomPager"),
    backToDirectory: $("#backToDirectory"),
    detailStatus: $("#detailStatus"),
    detailPanel: $("#detailPanel"),
    organizationSearch: $("#organizationSearch"),
    organizationKindFilter: $("#organizationKindFilter"),
    organizationSummary: $("#organizationSummary"),
    organizationStatus: $("#organizationStatus"),
    organizationList: $("#organizationList"),
  });
}

async function init() {
  cacheDom();
  bindEvents();
  setOptions(dom.regionFilter, [], "All regions");
  setOptions(dom.kindFilter, [], "All kinds");
  setOptions(dom.tierFilter, [], "All tiers");
  setOptions(dom.starsFilter, [], "Any stars");
  setOptions(dom.tagFilter, [], "Any tag");
  setOptions(dom.organizationKindFilter, [], "All kinds");
  dom.summaryCards.innerHTML = `<article class="metric-card"><div class="label">Status</div><div class="metric-value">Loading</div></article>`;
  if (!location.hash) history.replaceState(null, "", "#directory");
  render();
}

init();
