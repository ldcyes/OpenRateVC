# OpenRateVC Interactive Site Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local static website that turns the extracted OpenRateVC APK data into an interactive VC directory with an APK/source explorer.

**Architecture:** The site is a dependency-free static frontend served from `site/`. `index.html` provides the shell, `styles.css` owns layout and visual design, and `app.js` owns data loading, routing, filtering, rendering, and error states. JSON data is copied into `site/data/`, with a small generated `source-summary.json` for APK/source metadata.

**Tech Stack:** Plain HTML, CSS, JavaScript, static JSON assets, Python standard-library HTTP server for local browsing.

---

## Chunk 1: Static Site Files

### Task 1: Data And Metadata

**Files:**
- Create: `site/data/investors.json`
- Create: `site/data/organizations.json`
- Create: `site/data/investor-reports.json`
- Create: `site/data/search-index.bin`
- Create: `site/data/source-summary.json`

- [ ] **Step 1: Create `site/data`**

Run: `mkdir -p site/data`
Expected: directory exists.

- [ ] **Step 2: Copy extracted data assets**

Run: `cp extracted/jadx_decompiled/resources/assets/data/investors.json site/data/investors.json` and equivalent commands for `organizations.json`, `investor-reports.json`, and `search-index.bin`.
Expected: four asset files exist under `site/data`.

- [ ] **Step 3: Create `source-summary.json`**

Add manifest facts, asset sizes, source file names, important class descriptions, and decompile caveats.

- [ ] **Step 4: Verify data files**

Run: `find site/data -maxdepth 1 -type f -printf '%f %s\n' | sort`
Expected: copied data assets and `source-summary.json` are listed.

### Task 2: HTML Shell

**Files:**
- Create: `site/index.html`

- [ ] **Step 1: Create semantic app shell**

Add header, tab navigation, status region, filter controls, results containers, detail container, organizations container, APK explorer container, and noscript fallback.

- [ ] **Step 2: Wire CSS and JS**

Reference `styles.css` and `app.js` from `index.html`.

- [ ] **Step 3: Verify shell references**

Run: `rg -n "styles.css|app.js|Directory|APK Explorer" site/index.html`
Expected: references and labels are present.

### Task 3: Styling

**Files:**
- Create: `site/styles.css`

- [ ] **Step 1: Add responsive application layout**

Implement compact header, tab bar, filter/sidebar layout, cards, detail sections, tables, buttons, form controls, and mobile stacking.

- [ ] **Step 2: Add stable dimensions and overflow guards**

Ensure cards, buttons, tags, and tables avoid text overlap on desktop and mobile.

- [ ] **Step 3: Verify important selectors**

Run: `rg -n "app-header|filter-panel|investor-card|detail-grid|source-browser|@media" site/styles.css`
Expected: selectors exist.

## Chunk 2: Interactive Behavior

### Task 4: Data Store And Router

**Files:**
- Create: `site/app.js`

- [ ] **Step 1: Implement state and asset loader**

Create `state`, `loadJson`, `loadInvestors`, `loadOrganizations`, `loadReports`, `loadSourceSummary`, and id indexes.

- [ ] **Step 2: Implement hash router**

Support `#directory`, `#organizations`, `#apk`, and `#investor=<id>` states while preserving directory filters.

- [ ] **Step 3: Verify symbols**

Run: `rg -n "loadInvestors|loadReports|parseHash|navigateTo|state" site/app.js`
Expected: functions and state are present.

### Task 5: Directory And Detail Views

**Files:**
- Modify: `site/app.js`

- [ ] **Step 1: Implement filter and sort pipeline**

Search by investor name, title, organization, summary, tags, and region. Filter by region, organization kind, rating tier, stars, and tag. Sort by score, name, organization, or sequence.

- [ ] **Step 2: Render paginated investor cards**

Render cards with score, stars, name, title, organization, region, summary, tags, and key metrics.

- [ ] **Step 3: Render investor detail**

Load reports on first detail request, find by id, render summary, recommendation, perspective, dimensions, key metrics, sections, and sources.

- [ ] **Step 4: Verify directory code**

Run: `rg -n "applyFilters|renderDirectory|renderInvestorCard|renderDetail|renderSources" site/app.js`
Expected: functions exist.

### Task 6: Organizations And APK Explorer

**Files:**
- Modify: `site/app.js`

- [ ] **Step 1: Render organizations view**

Search organizations by display name, normalized name, raw names, and kind. Filter by kind.

- [ ] **Step 2: Render APK explorer**

Render manifest, data assets, source summary, source file list, important classes, native library, and caveats.

- [ ] **Step 3: Verify view code**

Run: `rg -n "renderOrganizations|renderApkExplorer|source-summary|Native library" site/app.js`
Expected: functions and labels exist.

## Chunk 3: Verification And Browsing

### Task 7: Static Server Verification

**Files:**
- No code changes unless verification finds issues.

- [ ] **Step 1: Validate asset references**

Run: `rg -n "data/investors.json|data/organizations.json|data/investor-reports.json|data/source-summary.json" site/app.js`
Expected: all referenced paths exist.

- [ ] **Step 2: Start local server**

Run: `python3 -m http.server 8000 --directory site`
Expected: server starts and serves `http://localhost:8000`.

- [ ] **Step 3: Probe main assets**

Run: `curl -I http://localhost:8000/`, `curl -I http://localhost:8000/app.js`, and `curl -I http://localhost:8000/data/investors.json`.
Expected: HTTP 200 responses.

- [ ] **Step 4: Browser smoke test if possible**

Use available browser tooling or a simple HTTP probe to verify page assets load. If browser tooling is unavailable, report that limitation.

- [ ] **Step 5: Final status**

Report the local URL, key files, and verification commands run.
