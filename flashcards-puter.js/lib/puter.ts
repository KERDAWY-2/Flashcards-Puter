// Thin wrapper around the global `puter` object provided by the Puter.js CDN script.
// We avoid the npm package so we don't have to wrestle with SSR — Puter is a
// browser-only SDK and lives on `window.puter` once the script tag in
// `app/layout.tsx` has loaded.

import type { Deck, Flashcard } from "./types";

// Minimal subset of the Puter.js surface that this app touches. The real type
// lives on window at runtime; declaring it here keeps the call sites typed.
type PuterAPI = {
  ai: {
    chat: (
      prompt: string | Array<{ role: string; content: string }>,
      options?: { model?: string; temperature?: number; max_tokens?: number },
    ) => Promise<{ message?: { content?: string }; toString: () => string }>;
  };
  kv: {
    set: (key: string, value: unknown) => Promise<boolean>;
    get: (key: string) => Promise<unknown>;
    list: (pattern?: string, returnValues?: boolean) => Promise<string[]>;
    del: (key: string) => Promise<boolean>;
  };
};

declare global {
  interface Window {
    puter?: PuterAPI;
  }
}

/** Resolves once `window.puter` is available (the CDN script has loaded). */
export function getPuter(): Promise<PuterAPI> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Puter.js is browser-only"));
      return;
    }
    if (window.puter) {
      resolve(window.puter);
      return;
    }
    // Poll briefly for the script to land — usually instant on a warm cache.
    let attempts = 0;
    const id = window.setInterval(() => {
      attempts += 1;
      if (window.puter) {
        window.clearInterval(id);
        resolve(window.puter);
      } else if (attempts > 50) {
        // ~5s
        window.clearInterval(id);
        reject(new Error("Puter.js failed to load"));
      }
    }, 100);
  });
}

// All decks live under this prefix so KV stays tidy if the user
// shares the Puter account with other apps.
const DECK_PREFIX = "flashcards:deck:";

/** Persists a deck under a stable key. Overwrites any prior version. */
export async function saveDeck(deck: Deck): Promise<void> {
  const puter = await getPuter();
  await puter.kv.set(DECK_PREFIX + deck.id, deck);
}

/** Lists every deck currently stored in the user's Puter KV. */
export async function loadDecks(): Promise<Deck[]> {
  const puter = await getPuter();
  // `list` returns key strings — we then `get` each one in parallel.
  const keys = await puter.kv.list(DECK_PREFIX + "*");
  if (!Array.isArray(keys) || keys.length === 0) return [];
  const values = await Promise.all(keys.map((k) => puter.kv.get(k)));
  return values
    .filter((v): v is Deck => !!v && typeof v === "object" && "cards" in (v as object))
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** Removes a deck from KV. */
export async function deleteDeck(deckId: string): Promise<void> {
  const puter = await getPuter();
  await puter.kv.del(DECK_PREFIX + deckId);
}

/**
 * Asks Puter's AI to produce a deck of flashcards on a topic.
 * We instruct the model to return strict JSON, then parse defensively
 * because LLMs occasionally wrap output in code fences.
 */
export async function generateDeckWithAI(
  topic: string,
  count: number,
): Promise<Flashcard[]> {
  const puter = await getPuter();

  const prompt = `Generate exactly ${count} concise study flashcards about: "${topic}".

Return ONLY a valid JSON array. No prose, no markdown fences. Each item must have this shape:
{ "front": "<question or term, max ~120 chars>", "back": "<answer or definition, max ~280 chars>" }

Keep fronts and backs distinct, factual, and self-contained.`;

  const raw = await puter.ai.chat(prompt, { model: "gpt-5-nano", temperature: 0.4 });
  const text =
    typeof raw === "string"
      ? raw
      : raw?.message?.content ?? (raw?.toString ? raw.toString() : "");

  return parseFlashcardsJSON(text, count);
}

/** Best-effort JSON extraction — tolerates code fences and surrounding prose. */
function parseFlashcardsJSON(text: string, max: number): Flashcard[] {
  // Strip ```json fences if the model returned them.
  const cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```/g, "")
    .trim();

  // Grab the first JSON array we can find.
  const match = cleaned.match(/\[[\s\S]*\]/);
  const candidate = match ? match[0] : cleaned;

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    throw new Error("AI did not return parseable JSON. Try again.");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("AI response was not an array of cards.");
  }

  return parsed.slice(0, max).map((c, i) => ({
    id: `${Date.now()}-${i}`,
    front: String((c as { front?: unknown }).front ?? "").trim(),
    back: String((c as { back?: unknown }).back ?? "").trim(),
  }));
}
