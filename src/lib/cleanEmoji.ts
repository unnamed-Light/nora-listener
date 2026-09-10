const EMOJI_REPLACEMENTS: [RegExp, string][] = [
  [/\u{1F4CC}/gu, '§'],
  [/\u{1F511}/gu, '•'],
  [/\u{1F4D6}/gu, '§'],
  [/\u{26A0}\u{FE0F}?/gu, '[!]'],
  [/\u{1F3AF}/gu, '•'],
  [/\u{2705}/gu, '[OK]'],
  [/\u{1F4A1}/gu, '•'],
  [/\u{2728}/gu, ''],
  [/\u{1F525}/gu, ''],
  [/\u{1F680}/gu, ''],
  [/\u{1F389}/gu, ''],
  [/\u{1F44D}/gu, ''],
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

  clean = clean.replace(GENERAL_EMOJI_REGEX, '');
  return clean;
}
