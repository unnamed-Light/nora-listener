import katex from 'katex';
import { marked } from 'marked';

/**
 * Renders Markdown text with comprehensive LaTeX math formula support via KaTeX.
 * Supports:
 * - Display equations: $$ ... $$ and \\[ ... \\]
 * - Inline math: \\( ... \\) and $ ... $
 * - Parenthesized LaTeX expressions: (\\forall x (x \\in \\varnothing \\rightarrow x \\in A))
 * - Mathematical variable references: для произвольного (A)
 */
export function renderMarkdownWithMath(markdown: string): string {
  if (!markdown) return '';

  const mathPlaceholders: string[] = [];

  const pushMath = (formula: string, displayMode: boolean): number => {
    const id = mathPlaceholders.length;
    try {
      const html = katex.renderToString(formula.trim(), {
        displayMode,
        throwOnError: false,
        strict: false
      });
      mathPlaceholders.push(html);
    } catch {
      mathPlaceholders.push(displayMode ? `$$${formula}$$` : `$${formula}$`);
    }
    return id;
  };

  let text = markdown;

  // 1. Block math: $$ ... $$
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_, formula: string) => {
    const id = pushMath(formula, true);
    return `\n\n%%MATH_BLOCK_${id}%%\n\n`;
  });

  // 2. Block math: \[ ... \]
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_, formula: string) => {
    const id = pushMath(formula, true);
    return `\n\n%%MATH_BLOCK_${id}%%\n\n`;
  });

  // 3. Inline math: \( ... \)
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_, formula: string) => {
    const id = pushMath(formula, false);
    return `%%MATH_INLINE_${id}%%`;
  });

  // 4. Inline math: $ ... $
  text = text.replace(/(^|[^\$])\$([^\$\n]+?)\$(?!\$)/g, (match: string, prefix: string, formula: string) => {
    const trimmed = formula.trim();
    if (!trimmed || /^\d+(\.\d+)?$/.test(trimmed)) {
      return match;
    }
    const id = pushMath(trimmed, false);
    return `${prefix}%%MATH_INLINE_${id}%%`;
  });

  // 5. Parenthesized LaTeX expressions with balanced parentheses support:
  // e.g. (\forall x (x \in \varnothing \rightarrow x \in A))
  {
    let result = '';
    let i = 0;
    while (i < text.length) {
      if (text[i] === '(' && text[i + 1] === '\\') {
        const rest = text.slice(i + 2);
        const mathKeywords = /^(forall|exists|in|notin|subset|subseteq|cap|cup|varnothing|emptyset|mathbb|mathbf|to|rightarrow|leftarrow|neg|land|lor|sum|prod|int|sqrt|frac|times|cdot|le|ge|neq|equiv|sim)/;
        if (mathKeywords.test(rest)) {
          let depth = 1;
          let j = i + 1;
          while (j < text.length && depth > 0) {
            if (text[j] === '(') depth++;
            else if (text[j] === ')') depth--;
            j++;
          }
          if (depth === 0) {
            const formula = text.slice(i + 1, j - 1);
            const id = pushMath(formula, false);
            result += `%%MATH_INLINE_${id}%%`;
            i = j;
            continue;
          }
        }
      }
      result += text[i];
      i++;
    }
    text = result;
  }

  // 6. Parenthesized single variable after math context: e.g. "для произвольного (A)"
  text = text.replace(/(произвольного|любого|множеств[а-я]*|элемент[а-я]*)\s*\(([A-Za-z])\)/gi, (_, prefix: string, v: string) => {
    const id = pushMath(v, false);
    return `${prefix} %%MATH_INLINE_${id}%%`;
  });

  // 7. Parse standard Markdown
  let html = marked.parse(text, { breaks: true, gfm: true }) as string;

  // 8. Restore block placeholders
  html = html.replace(/<p>\s*%%MATH_BLOCK_(\d+)%%\s*<\/p>/g, (_, id: string) => {
    return `<div class="katex-display-wrapper" style="overflow-x: auto; margin: 12px 0; text-align: center;">${mathPlaceholders[parseInt(id, 10)]}</div>`;
  });

  html = html.replace(/%%MATH_BLOCK_(\d+)%%/g, (_, id: string) => {
    return `<div class="katex-display-wrapper" style="overflow-x: auto; margin: 12px 0; text-align: center;">${mathPlaceholders[parseInt(id, 10)]}</div>`;
  });

  // 9. Restore inline placeholders
  html = html.replace(/%%MATH_INLINE_(\d+)%%/g, (_, id: string) => {
    return mathPlaceholders[parseInt(id, 10)] || '';
  });

  return html;
}
