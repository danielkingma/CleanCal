// Checklist photo reviewer: after a cleaner marks a job complete, this
// sends the photos they took to an AI vision model to check against the
// basics any turnover clean should get right (bed made, bins emptied,
// surfaces clear, nothing left behind) and flags anything that looks
// off -- a second pair of eyes on the job before the next guest arrives,
// while the cleaner may still be nearby to go back and fix it.
//
// This is the one place in CleanCal that calls an external AI model --
// everywhere else in src/lib is deliberately pure/rule-based (see
// statements.ts, conflicts.ts). That's not possible here: whether a bed
// *looks* made isn't something a rule can check, only something that
// can be judged by actually looking at the photo. Requires the
// ANTHROPIC_API_KEY env var; without it this is a no-op, same pattern as
// push.ts/sms.ts gating themselves on their own env vars. A missing key,
// a network error, or a response that doesn't parse all fail open --
// `ran: false` -- never block a cleaner's job and never raise a false
// flag because the review itself didn't work.

export interface PhotoReviewInput {
  // Short-lived signed URLs -- the model fetches these itself, nothing
  // is downloaded or re-uploaded here.
  photoUrls: string[];
  bedroomCount: number;
  bathroomCount: number;
  hasOutdoorArea: boolean;
}

export interface PhotoReviewResult {
  // false if the review didn't actually run (no key, no photos, a
  // network/parse failure) -- callers must treat this the same as "no
  // opinion", never as a pass.
  ran: boolean;
  flagged: boolean;
  // A short, specific reason when flagged; empty otherwise.
  note: string;
}

// Caps cost and prompt size -- this is meant to spot-check a job, not
// transcribe every photo a cleaner took. A property rarely needs more
// than a handful of photos to tell whether the basics were done.
const MAX_PHOTOS = 8;

const DEFAULT_MODEL = "claude-haiku-5-5";

function configured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function buildReviewPrompt(bedroomCount: number, bathroomCount: number, hasOutdoorArea: boolean): string {
  const rooms = `${bedroomCount} bedroom${bedroomCount === 1 ? "" : "s"} and ${bathroomCount} bathroom${bathroomCount === 1 ? "" : "s"}${hasOutdoorArea ? ", plus an outdoor area" : ""}`;
  return [
    "You are doing a quality check for a short-term rental turnover clean, reviewing the photos a cleaner took right after finishing the job.",
    `This property has ${rooms}.`,
    "Look for the basics a guest would notice immediately: beds made with fresh linen, bins emptied, surfaces clear, floors clean, no rubbish or a previous guest's belongings left behind, and nothing obviously broken or damaged.",
    "Judge only what's actually visible in these photos -- don't assume a room is fine just because no photo shows it, and don't assume something is wrong just because a room wasn't photographed.",
    'Respond with ONLY a JSON object and nothing else: {"looksGood": boolean, "note": string}.',
    'Set "looksGood" to false if ANYTHING visible looks off, unfinished, or missed. When false, "note" must be one short, specific, actionable sentence a cleaner could act on (e.g. "The bed in one photo still has rumpled sheets, not fresh linen."). When true, "note" must be an empty string.',
  ].join(" ");
}

// Pulled out from reviewCleaningPhotos() so it can be tested directly
// against sample model output without a network call.
export function parseVerdict(responseText: string): PhotoReviewResult {
  const match = responseText.match(/\{[\s\S]*\}/);
  if (!match) return { ran: false, flagged: false, note: "" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return { ran: false, flagged: false, note: "" };
  }
  if (typeof parsed !== "object" || parsed === null || typeof (parsed as { looksGood?: unknown }).looksGood !== "boolean") {
    return { ran: false, flagged: false, note: "" };
  }
  const looksGood = (parsed as { looksGood: boolean }).looksGood;
  const rawNote = (parsed as { note?: unknown }).note;
  const note = typeof rawNote === "string" ? rawNote.trim() : "";
  return {
    ran: true,
    flagged: !looksGood,
    note: looksGood ? "" : note || "Something in the photos looked off -- worth a quick check.",
  };
}

export async function reviewCleaningPhotos(input: PhotoReviewInput): Promise<PhotoReviewResult> {
  if (!configured() || input.photoUrls.length === 0) {
    return { ran: false, flagged: false, note: "" };
  }

  const photos = input.photoUrls.slice(0, MAX_PHOTOS);
  const prompt = buildReviewPrompt(input.bedroomCount, input.bathroomCount, input.hasOutdoorArea);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY as string,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_PHOTO_REVIEW_MODEL || DEFAULT_MODEL,
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: [
              ...photos.map((url) => ({ type: "image", source: { type: "url", url } })),
              { type: "text", text: prompt },
            ],
          },
        ],
      }),
    });
    if (!res.ok) return { ran: false, flagged: false, note: "" };
    const data = (await res.json()) as { content?: { text?: string }[] };
    const text = data.content?.[0]?.text ?? "";
    return parseVerdict(text);
  } catch {
    return { ran: false, flagged: false, note: "" };
  }
}
