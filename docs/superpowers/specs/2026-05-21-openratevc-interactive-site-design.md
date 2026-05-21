# OpenRateVC Interactive Site Design

## Context

The workspace contains an extracted Android APK for OpenRateVC. The APK includes:

- `investors.json`: 3,105 investor records.
- `organizations.json`: 1,706 organization records.
- `investor-reports.json`: 3,105 detailed investor reports.
- Decompiled app source under `extracted/jadx_decompiled/sources/com/vcpe/ratevc`.
- Decoded APK resources under `extracted/jadx_decompiled/resources`.

The site will turn these contents into one static interactive website. The selected direction is "Directory First": make the VC directory the primary experience, with APK/source exploration available as a secondary section.

## Goals

- Build a local static website that works when served by any simple static server.
- Make the investor data searchable, filterable, and easy to browse.
- Show full investor report details without overwhelming the list view.
- Provide a transparent APK/source explorer section that summarizes the recovered Android package, manifest, data assets, source files, and native library.
- Keep the implementation dependency-free unless the existing repo already includes a frontend stack.

## Non-Goals

- Reconstruct the original Kotlin/Gradle Android project.
- Rebuild or re-sign the APK.
- Implement server-side search, authentication, persistence, or remote deployment.
- Guarantee that decompiled Java is equivalent to the original Kotlin source.

## Information Architecture

The website has four top-level tabs:

1. `Directory`
   - Primary landing view.
   - Shows summary counts, search, filters, sorting, paginated investor cards, and an empty state.

2. `Investor Detail`
   - Opens when a user selects an investor card.
   - Shows total score, stars, title, organization, region, tags, dimensions, key metrics, action recommendation, perspective, report sections, and sources.

3. `Organizations`
   - Lists organizations with kind, display name, investor count, raw names, and visual metadata when present.
   - Supports search and filtering by organization kind.

4. `APK Explorer`
   - Shows manifest/package metadata, extracted asset inventory, important app classes, source-file counts, decompile limitations, and native library information.
   - Provides a browsable list of app-package source files and key decoded resource paths.

## Directory UX

The directory is designed for repeated scanning:

- A compact header shows project name, active tab navigation, and global counts.
- The left filter column contains search, region, organization kind, rating tier, stars, and tag filters.
- The main content area shows investor cards in a responsive grid.
- Each card shows name, title, organization, region, score, rating tier, stars, summary, tags, and key metrics.
- Pagination or "load more" avoids rendering all 3,105 investors at once.
- Sort options include score descending, name, organization, and sequence.

On mobile, filters collapse above the results or into a drawer-like panel so cards remain readable.

## Detail UX

Selecting a card opens the detail view without a page reload:

- The detail header repeats name, title, organization, score, stars, and tags.
- The body includes summary, action recommendation, perspective, dimensions, key metrics, structured report sections, and sources.
- A back control returns to the previous directory state.
- Missing reports are handled with a clear message instead of a broken panel.

## APK Explorer UX

The APK explorer is a compact technical view:

- Manifest card: package `com.vcpe.ratevc`, version `0.1.1`, version code `2`, min SDK `26`, target SDK `36`, label `RateVC`, main activity `com.vcpe.ratevc.MainActivity`.
- Data assets card: lists `investors.json`, `organizations.json`, `investor-reports.json`, and `search-index.bin` with sizes.
- Source summary card: shows the app-package Java files recovered by JADX and calls out that some large Compose/Kotlin methods were skipped.
- Source browser: lists `com/vcpe/ratevc/*.java` files and shows a short description for important classes such as `MainActivity`, `StaticInvestorRepository`, `NativeSearchEngine`, `InvestorScreensKt`, and `InvestorComponentsKt`.
- Native library card: notes `lib/arm64-v8a/libratevc_search_jni.so` and its role in loading/querying the bundled search index.

## Data Flow

- The site loads small metadata immediately from a generated source-summary file.
- Large JSON files are fetched lazily:
  - `investors.json` when entering `Directory`.
  - `investor-reports.json` on the first detail view request, then indexed by id and reused.
  - `organizations.json` when entering `Organizations`, and also for lookup enrichment in `Directory`.
- Data is indexed in memory by id after load.
- Filters and sorting are applied client-side.
- The current selected tab, search query, filter values, sort, page, and selected investor id are reflected in URL hash state where practical.

## Error Handling

- If a JSON asset fails to load, show a visible error state with the file path and suggested local-server note.
- If a report id is missing, show an unavailable detail message and keep the user in the app.
- If the page is opened directly from the filesystem and JSON `fetch()` is blocked by the browser, show guidance to run a local static server.
- If a filter returns no results, show an empty state with a reset-filters action.

## Implementation Shape

Preferred implementation:

- `site/index.html`
- `site/styles.css`
- `site/app.js`
- `site/data/` copied from `extracted/jadx_decompiled/resources/assets/data/`
- Optional generated metadata file such as `site/data/source-summary.json` for APK/source explorer paths and manifest facts.

The frontend uses plain JavaScript modules, semantic HTML, and responsive CSS. No build step is required.

Implementation units:

- `dataStore`: loads JSON assets, memoizes loaded datasets, builds id maps, and returns filtered/sorted result slices.
- `router`: owns hash state, selected tab, selected investor id, and back/forward behavior.
- `directoryView`: renders filters, result summary, investor cards, pagination, loading states, and empty states.
- `detailView`: renders a selected investor report and handles missing reports.
- `organizationsView`: renders organization search/filter results.
- `apkExplorerView`: renders generated APK/source metadata and source-file summaries.
- `uiState`: small shared helpers for loading, error, and empty-state rendering.

## Visual Direction

The design should feel like a practical research and screening tool:

- Dense but readable layout.
- Neutral background with restrained accent colors.
- Compact cards with clear scores and tags.
- Tables/lists for technical APK metadata.
- No marketing hero page.
- No decorative gradient/orb background.

## Verification

Manual verification should cover:

- Opening the site and seeing the Directory as the first screen.
- Loading investors and rendering a paginated list.
- Searching by investor name and organization.
- Filtering by at least region, organization kind, rating tier, and stars.
- Opening a detail report and returning to the previous result set.
- Loading Organizations and filtering by kind.
- Loading APK Explorer and confirming package/version/source metadata appears.
- Mobile-width layout does not overlap text or controls.

Automated/lightweight checks:

- Confirm referenced data files exist in `site/data`.
- Run a local static server and verify `index.html`, CSS, JS, and JSON requests return successfully.
- Use browser console or Playwright if available to check for runtime errors on the main tabs.
