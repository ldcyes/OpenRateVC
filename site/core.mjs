const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });

function clean(value) {
  return value == null ? "" : String(value).trim();
}

function lower(value) {
  return clean(value).toLowerCase();
}

function uniqueSorted(values) {
  return [...new Set(values.map(clean).filter(Boolean))].sort(collator.compare);
}

function tagsOf(item) {
  return Array.isArray(item?.tags) ? item.tags.map(clean).filter(Boolean) : [];
}

function searchableText(item) {
  return [
    item.name,
    item.title,
    item.organizationName,
    item.rawOrganization,
    item.organizationKind,
    item.region,
    item.ratingTier,
    item.summary,
    item.actionRecommendation,
    tagsOf(item).join(" "),
  ]
    .map(lower)
    .join(" ");
}

export function indexById(items, key = "id") {
  const map = new Map();
  for (const item of items || []) {
    if (item && item[key] != null) {
      map.set(String(item[key]), item);
    }
  }
  return map;
}

export function formatStars(value) {
  const count = Math.max(0, Math.min(5, Number(value) || 0));
  return "★".repeat(count) + "☆".repeat(5 - count);
}

export function normalizeTier(value) {
  return clean(value).replaceAll("_", " ");
}

export function formatScore(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(2) : "n/a";
}

export function buildFilterOptions(investors = []) {
  return {
    regions: uniqueSorted(investors.map((item) => item.region)),
    organizationKinds: uniqueSorted(investors.map((item) => item.organizationKind)),
    ratingTiers: uniqueSorted(investors.map((item) => item.ratingTier)),
    stars: [...new Set(investors.map((item) => Number(item.stars)).filter(Number.isFinite))].sort((a, b) => a - b),
    tags: uniqueSorted(investors.flatMap(tagsOf)),
  };
}

export function filterInvestors(investors = [], filters = {}) {
  const tokens = lower(filters.query).split(/\s+/).filter(Boolean);
  const region = clean(filters.region);
  const organizationKind = clean(filters.organizationKind);
  const ratingTier = clean(filters.ratingTier);
  const minStars = Number(filters.stars);
  const tag = clean(filters.tag);

  const filtered = investors.filter((investor) => {
    const text = searchableText(investor);
    if (tokens.length && !tokens.every((token) => text.includes(token))) return false;
    if (region && investor.region !== region) return false;
    if (organizationKind && investor.organizationKind !== organizationKind) return false;
    if (ratingTier && investor.ratingTier !== ratingTier) return false;
    if (Number.isFinite(minStars) && Number(investor.stars || 0) < minStars) return false;
    if (tag && !tagsOf(investor).includes(tag)) return false;
    return true;
  });

  return sortInvestors(filtered, filters.sort);
}

export function sortInvestors(investors = [], sort = "score-desc") {
  const sorted = [...investors];
  switch (sort) {
    case "name":
      sorted.sort((a, b) => collator.compare(clean(a.name), clean(b.name)));
      break;
    case "organization":
      sorted.sort((a, b) => collator.compare(clean(a.organizationName), clean(b.organizationName)) || collator.compare(clean(a.name), clean(b.name)));
      break;
    case "sequence":
      sorted.sort((a, b) => collator.compare(clean(a.sequence), clean(b.sequence)));
      break;
    case "score-asc":
      sorted.sort((a, b) => (Number(a.totalScore) || 0) - (Number(b.totalScore) || 0));
      break;
    case "score-desc":
    default:
      sorted.sort((a, b) => (Number(b.totalScore) || 0) - (Number(a.totalScore) || 0));
      break;
  }
  return sorted;
}

export function paginate(items = [], page = 1, pageSize = 24) {
  const size = Math.max(1, Number(pageSize) || 24);
  const totalPages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(Math.max(1, Number(page) || 1), totalPages);
  const startIndex = (current - 1) * size;
  const pageItems = items.slice(startIndex, startIndex + size);
  return {
    items: pageItems,
    page: current,
    pageSize: size,
    total: items.length,
    totalPages,
    start: items.length ? startIndex + 1 : 0,
    end: startIndex + pageItems.length,
  };
}

export function filterOrganizations(organizations = [], filters = {}) {
  const tokens = lower(filters.query).split(/\s+/).filter(Boolean);
  const kind = clean(filters.kind);
  return organizations
    .filter((organization) => {
      const rawNames = Array.isArray(organization.rawNames) ? organization.rawNames.join(" ") : "";
      const text = [organization.displayName, organization.normalizedName, organization.kind, rawNames].map(lower).join(" ");
      if (tokens.length && !tokens.every((token) => text.includes(token))) return false;
      if (kind && organization.kind !== kind) return false;
      return true;
    })
    .sort((a, b) => (Number(b.investorCount) || 0) - (Number(a.investorCount) || 0) || collator.compare(clean(a.displayName), clean(b.displayName)));
}

export function sectionEntries(sections) {
  if (!sections || typeof sections !== "object") return [];
  return Object.entries(sections).filter(([, value]) => clean(value));
}
