const EMOJI_REPLACEMENTS: [RegExp, string][] = [
  [/📌/g, '§'],
  [/🔑/g, '•'],
  [/📖/g, '§'],
  [/⚠️/g, '[!]'],
  [/🎯/g, '•'],
  [/✅/g, '[OK]'],
  [/💡/g, '•'],
  [/✨/g, ''],
  [/🔥/g, ''],
  [/🚀/g, ''],
  [/🎉/g, ''],
  [/👍/g, ''],
];

const GENERAL_EMOJI_REGEX = /[\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF]/g;

export function sanitizeEmojis(text: string): string {
  if (!text) return text;
  let clean = text;

  // Strip <think>...</think> and <thought>...</thought> tags
  clean = clean.replace(/<think>[\s\S]*?<\/think>/gi, '');
  clean = clean.replace(/<thought>[\s\S]*?<\/thought>/gi, '');

  // Strip unclosed <think> or <thought> if output started with reasoning
  clean = clean.replace(/<think>[\s\S]*?(?=\n#|\n##|$)/gi, '');
  clean = clean.replace(/<thought>[\s\S]*?(?=\n#|\n##|$)/gi, '');

  // Strip stray tags
  clean = clean.replace(/<\/?think>/gi, '');
  clean = clean.replace(/<\/?thought>/gi, '');

  // Strip lead-in reasoning phrases if any
  clean = clean.replace(/Here's a thinking process:[\s\S]*?(?=\n#|\n##|$)/gi, '');
  clean = clean.replace(/Thinking Process:[\s\S]*?(?=\n#|\n##|$)/gi, '');

  for (const [re, rep] of EMOJI_REPLACEMENTS) {
    clean = clean.replace(re, rep);
  }
  return clean.replace(GENERAL_EMOJI_REGEX, '').trim();
}

