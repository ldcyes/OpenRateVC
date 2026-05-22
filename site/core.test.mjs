import test from "node:test";
import assert from "node:assert/strict";
import {
  filterInvestors,
  paginate,
  buildFilterOptions,
  indexById,
  formatStars,
  scoreToPercent,
} from "./core.mjs";

const investors = [
  {
    id: "a",
    name: "Ava Chen",
    title: "Partner",
    organizationName: "Northstar Ventures",
    organizationKind: "VC",
    region: "US",
    ratingTier: "A",
    stars: 5,
    totalScore: 91,
    sequence: 2,
    summary: "Enterprise AI and developer tools investor.",
    tags: ["AI", "Developer Tools"],
  },
  {
    id: "b",
    name: "Ben Ortiz",
    title: "Principal",
    organizationName: "SeedWorks",
    organizationKind: "Accelerator",
    region: "Europe",
    ratingTier: "B",
    stars: 3,
    totalScore: 70,
    sequence: 1,
    summary: "Seed-stage fintech focus.",
    tags: ["Fintech", "Seed"],
  },
  {
    id: "c",
    name: "Cara Singh",
    title: "Managing Director",
    organizationName: "Northstar Ventures",
    organizationKind: "VC",
    region: "US",
    ratingTier: "A",
    stars: 4,
    totalScore: 84,
    sequence: 3,
    summary: "B2B SaaS and infrastructure.",
    tags: ["SaaS", "Infrastructure"],
  },
];

test("filterInvestors searches text and applies selected filters", () => {
  const result = filterInvestors(investors, {
    query: "northstar ai",
    region: "US",
    organizationKind: "VC",
    ratingTier: "A",
    stars: "4",
    tag: "AI",
    sort: "score-desc",
  });

  assert.deepEqual(
    result.map((investor) => investor.id),
    ["a"],
  );
});

test("filterInvestors supports stable sort choices", () => {
  assert.deepEqual(
    filterInvestors(investors, { sort: "sequence" }).map((item) => item.id),
    ["b", "a", "c"],
  );
  assert.deepEqual(
    filterInvestors(investors, { sort: "name" }).map((item) => item.id),
    ["a", "b", "c"],
  );
});

test("paginate clamps page values and returns visible slice", () => {
  const page = paginate(investors, 2, 2);

  assert.equal(page.page, 2);
  assert.equal(page.totalPages, 2);
  assert.equal(page.start, 3);
  assert.equal(page.end, 3);
  assert.deepEqual(
    page.items.map((item) => item.id),
    ["c"],
  );
});

test("buildFilterOptions produces sorted distinct values", () => {
  const options = buildFilterOptions(investors);

  assert.deepEqual(options.regions, ["Europe", "US"]);
  assert.deepEqual(options.organizationKinds, ["Accelerator", "VC"]);
  assert.deepEqual(options.ratingTiers, ["A", "B"]);
  assert.deepEqual(options.stars, [3, 4, 5]);
  assert.deepEqual(options.tags, ["AI", "Developer Tools", "Fintech", "Infrastructure", "SaaS", "Seed"]);
});

test("indexById and formatStars handle common display cases", () => {
  const byId = indexById(investors);

  assert.equal(byId.get("b").name, "Ben Ortiz");
  assert.equal(formatStars(3), "★★★☆☆");
  assert.equal(formatStars(undefined), "☆☆☆☆☆");
});

test("scoreToPercent scales four-point dimension scores and clamps invalid values", () => {
  assert.equal(scoreToPercent(2), 50);
  assert.equal(scoreToPercent(4.8), 100);
  assert.equal(scoreToPercent(-1), 0);
  assert.equal(scoreToPercent(undefined), 0);
});
