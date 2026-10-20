import test from "node:test";
import assert from "node:assert/strict";
import { buildReviewPrompt, parseVerdict, reviewCleaningPhotos } from "../src/lib/photo-review.ts";

test("buildReviewPrompt mentions room counts with correct pluralisation", () => {
  assert.match(buildReviewPrompt(1, 1, false), /1 bedroom and 1 bathroom\./);
  assert.match(buildReviewPrompt(3, 2, true), /3 bedrooms and 2 bathrooms, plus an outdoor area\./);
});

test("parseVerdict: a clean pass", () => {
  const r = parseVerdict('{"looksGood": true, "note": ""}');
  assert.deepEqual(r, { ran: true, flagged: false, note: "" });
});

test("parseVerdict: a flagged result, with surrounding prose or markdown fences", () => {
  const r1 = parseVerdict('{"looksGood": false, "note": "Bed not made in bedroom 2."}');
  assert.deepEqual(r1, { ran: true, flagged: true, note: "Bed not made in bedroom 2." });

  const r2 = parseVerdict('Sure, here is my answer:\n```json\n{"looksGood": false, "note": "Bins still full."}\n```');
  assert.deepEqual(r2, { ran: true, flagged: true, note: "Bins still full." });
});

test("parseVerdict: flagged with an empty/missing note still gets a fallback note", () => {
  assert.equal(parseVerdict('{"looksGood": false, "note": ""}').note, "Something in the photos looked off -- worth a quick check.");
  assert.equal(parseVerdict('{"looksGood": false}').note, "Something in the photos looked off -- worth a quick check.");
});

test("parseVerdict: unparseable or malformed responses fail open (ran: false)", () => {
  assert.deepEqual(parseVerdict("not json at all"), { ran: false, flagged: false, note: "" });
  assert.deepEqual(parseVerdict('{"note": "missing the looksGood field"}'), { ran: false, flagged: false, note: "" });
  assert.deepEqual(parseVerdict('{"looksGood": "yes"}'), { ran: false, flagged: false, note: "" });
});

test("reviewCleaningPhotos: no-op (fails open) without an API key configured, and makes no network call", async () => {
  const originalKey = process.env.ANTHROPIC_API_KEY;
  const originalFetch = globalThis.fetch;
  delete process.env.ANTHROPIC_API_KEY;
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    throw new Error("should not be called");
  };
  try {
    const result = await reviewCleaningPhotos({
      photoUrls: ["https://example.com/a.jpg"],
      bedroomCount: 2,
      bathroomCount: 1,
      hasOutdoorArea: false,
    });
    assert.deepEqual(result, { ran: false, flagged: false, note: "" });
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey !== undefined) process.env.ANTHROPIC_API_KEY = originalKey;
  }
});

test("reviewCleaningPhotos: no-op with zero photos even if a key is configured", async () => {
  const originalKey = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = "test-key";
  try {
    const result = await reviewCleaningPhotos({ photoUrls: [], bedroomCount: 1, bathroomCount: 1, hasOutdoorArea: false });
    assert.deepEqual(result, { ran: false, flagged: false, note: "" });
  } finally {
    if (originalKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = originalKey;
  }
});

test("reviewCleaningPhotos: a configured key sends photos (capped) and the prompt, and parses the reply", async () => {
  const originalKey = process.env.ANTHROPIC_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.ANTHROPIC_API_KEY = "test-key";
  let capturedBody;
  globalThis.fetch = async (url, opts) => {
    capturedBody = JSON.parse(opts.body);
    return { ok: true, json: async () => ({ content: [{ text: '{"looksGood": false, "note": "Rubbish left on the counter."}' }] }) };
  };
  try {
    const urls = Array.from({ length: 12 }, (_, i) => `https://example.com/${i}.jpg`);
    const result = await reviewCleaningPhotos({ photoUrls: urls, bedroomCount: 2, bathroomCount: 1, hasOutdoorArea: true });
    assert.deepEqual(result, { ran: true, flagged: true, note: "Rubbish left on the counter." });
    const imageBlocks = capturedBody.messages[0].content.filter((c) => c.type === "image");
    assert.equal(imageBlocks.length, 8); // capped, not all 12
    assert.equal(imageBlocks[0].source.url, "https://example.com/0.jpg");
    const textBlock = capturedBody.messages[0].content.find((c) => c.type === "text");
    assert.match(textBlock.text, /outdoor area/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = originalKey;
  }
});

test("reviewCleaningPhotos: a non-ok HTTP response fails open", async () => {
  const originalKey = process.env.ANTHROPIC_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.ANTHROPIC_API_KEY = "test-key";
  globalThis.fetch = async () => ({ ok: false, json: async () => ({}) });
  try {
    const result = await reviewCleaningPhotos({ photoUrls: ["https://example.com/a.jpg"], bedroomCount: 1, bathroomCount: 1, hasOutdoorArea: false });
    assert.deepEqual(result, { ran: false, flagged: false, note: "" });
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = originalKey;
  }
});
