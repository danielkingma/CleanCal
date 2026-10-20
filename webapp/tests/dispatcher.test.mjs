import test from "node:test";
import assert from "node:assert/strict";
import { pickCleaner, shouldKeepCurrentCleaner } from "../src/lib/dispatcher.ts";

test("pickCleaner: picks the candidate with the most cleans at this property", () => {
  const result = pickCleaner({
    candidates: [
      { cleanerId: "a", cleaningsAtProperty: 2, lastCleanedDate: "2026-09-01" },
      { cleanerId: "b", cleaningsAtProperty: 5, lastCleanedDate: "2026-08-01" },
    ],
    unavailableCleanerIds: new Set(),
  });
  assert.equal(result, "b");
});

test("pickCleaner: ties on count are broken by most recent clean", () => {
  const result = pickCleaner({
    candidates: [
      { cleanerId: "a", cleaningsAtProperty: 3, lastCleanedDate: "2026-09-01" },
      { cleanerId: "b", cleaningsAtProperty: 3, lastCleanedDate: "2026-10-01" },
    ],
    unavailableCleanerIds: new Set(),
  });
  assert.equal(result, "b");
});

test("pickCleaner: skips an otherwise-top candidate who is unavailable", () => {
  const result = pickCleaner({
    candidates: [
      { cleanerId: "a", cleaningsAtProperty: 10, lastCleanedDate: "2026-09-01" },
      { cleanerId: "b", cleaningsAtProperty: 1, lastCleanedDate: "2026-08-01" },
    ],
    unavailableCleanerIds: new Set(["a"]),
  });
  assert.equal(result, "b");
});

test("pickCleaner: never picks a candidate with zero history at this property", () => {
  const result = pickCleaner({
    candidates: [
      { cleanerId: "a", cleaningsAtProperty: 0, lastCleanedDate: null },
      { cleanerId: "b", cleaningsAtProperty: 0, lastCleanedDate: null },
    ],
    unavailableCleanerIds: new Set(),
  });
  assert.equal(result, null);
});

test("pickCleaner: returns null when every candidate with history is unavailable", () => {
  const result = pickCleaner({
    candidates: [{ cleanerId: "a", cleaningsAtProperty: 4, lastCleanedDate: "2026-09-01" }],
    unavailableCleanerIds: new Set(["a"]),
  });
  assert.equal(result, null);
});

test("pickCleaner: returns null with no candidates at all", () => {
  assert.equal(pickCleaner({ candidates: [], unavailableCleanerIds: new Set() }), null);
});

test("shouldKeepCurrentCleaner: true unless they're in the unavailable set", () => {
  assert.equal(shouldKeepCurrentCleaner("a", new Set()), true);
  assert.equal(shouldKeepCurrentCleaner("a", new Set(["b"])), true);
  assert.equal(shouldKeepCurrentCleaner("a", new Set(["a"])), false);
});
