export type MorseToken =
  | { type: "letter"; pattern: string; charIndex: number }
  | { type: "sep"; text: string };

/** Split standard Morse (`... --- / .-`) into letter + separator tokens. */
export function tokenizeMorse(morse: string): MorseToken[] {
  const trimmed = morse.trim();
  if (!trimmed) return [];

  const tokens: MorseToken[] = [];
  let charIndex = 0;
  const words = trimmed.split(/\s*\/\s*/);

  for (let wi = 0; wi < words.length; wi++) {
    if (wi > 0) {
      tokens.push({ type: "sep", text: " / " });
    }
    const word = words[wi]?.trim();
    if (!word) continue;
    const letters = word.split(/\s+/).filter(Boolean);
    for (let li = 0; li < letters.length; li++) {
      if (li > 0) {
        tokens.push({ type: "sep", text: " " });
      }
      tokens.push({
        type: "letter",
        pattern: letters[li]!,
        charIndex: charIndex++,
      });
    }
  }

  return tokens;
}
