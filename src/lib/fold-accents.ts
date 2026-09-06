import { itu } from "@morsecodeapp/morse/core";

export type EncodedLetter = {
  /** Same index MorsePlayer.onSignal / onCharacter use */
  charIndex: number;
  /** Original grapheme from user input */
  sourceChar: string;
  /** Folded base used for ITU lookup and text follow-along */
  foldedChar: string;
  /** Morse pattern for this letter */
  morse: string;
};

export type EncodeResult = {
  letters: EncodedLetter[];
  /** Standard Morse string: letters spaced, words as ` / ` */
  morse: string;
  /** Text follow-along tokens including spaces between words */
  textTokens: TextToken[];
};

export type TextToken =
  | { type: "letter"; letter: EncodedLetter }
  | { type: "space" };

/** Strip combining marks so é/è → e, à → a, etc. */
export function foldAccents(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "");
}

function foldGrapheme(ch: string): string {
  return foldAccents(ch);
}

/**
 * Encode plaintext to Morse with a shared charIndex map for dual follow-along.
 * Skips characters with no ITU mapping (after accent folding).
 */
export function encodeText(text: string): EncodeResult {
  const letters: EncodedLetter[] = [];
  const textTokens: TextToken[] = [];
  const morseWords: string[] = [];
  let charIndex = 0;
  let currentWord: string[] = [];

  const flushWord = () => {
    if (currentWord.length === 0) return;
    morseWords.push(currentWord.join(" "));
    currentWord = [];
  };

  for (const sourceChar of Array.from(text)) {
    if (/\s/.test(sourceChar)) {
      flushWord();
      // Collapse consecutive spaces into a single visual gap once a word exists
      if (
        textTokens.length > 0 &&
        textTokens[textTokens.length - 1]?.type !== "space" &&
        letters.length > 0
      ) {
        textTokens.push({ type: "space" });
      }
      continue;
    }

    const folded = foldGrapheme(sourceChar).toUpperCase();
    if (!folded) continue;

    // Multi-codepoint after fold is rare; take first mapped char
    const foldedChar = Array.from(folded)[0] ?? "";
    const pattern = itu.charToMorse[foldedChar];
    if (pattern === undefined) continue;

    const letter: EncodedLetter = {
      charIndex: charIndex++,
      sourceChar,
      foldedChar,
      morse: pattern,
    };
    letters.push(letter);
    textTokens.push({ type: "letter", letter });
    currentWord.push(pattern);
  }

  flushWord();

  // Trim trailing space tokens
  while (textTokens.length > 0 && textTokens[textTokens.length - 1]?.type === "space") {
    textTokens.pop();
  }

  return {
    letters,
    morse: morseWords.join(" / "),
    textTokens,
  };
}

/** @deprecated Prefer encodeText — kept for simple string-only callers */
export function textToMorse(text: string): string {
  return encodeText(text).morse;
}
