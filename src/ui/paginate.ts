// paginate.ts - group authored dialogue lines into text-box pages.
// Script text is written as boxes of up to three short lines (sentences run
// across lines), so showing one array element per page split sentences.

/** "Sten: ...", "Seer Ingrid: ..." - a new speaker turn starts a new page */
const SPEAKER_TURN = /^[A-Z][a-z]+(?: [A-Z][a-z]+)?: /;

export function paginate(lines: string[], maxLines = 3): string[] {
  const pages: string[][] = [];
  for (const line of lines) {
    const cur = pages[pages.length - 1];
    if (!cur || cur.length >= maxLines || (cur.length > 0 && SPEAKER_TURN.test(line))) pages.push([line]);
    else cur.push(line);
  }
  return pages.map((p) => p.join("\n"));
}
