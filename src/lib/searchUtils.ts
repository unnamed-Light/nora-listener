export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getContextSnippet(
  fullText: string,
  query: string,
  radiusBefore = 35,
  radiusAfter = 65
): string {
  if (!fullText || !query) return '';
  const lowerText = fullText.toLowerCase();
  const lowerQuery = query.toLowerCase().trim();
  const idx = lowerText.indexOf(lowerQuery);
  if (idx === -1) {
    return fullText.slice(0, 100) + (fullText.length > 100 ? '...' : '');
  }
  const start = Math.max(0, idx - radiusBefore);
  const end = Math.min(fullText.length, idx + lowerQuery.length + radiusAfter);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < fullText.length ? '...' : '';
  return prefix + fullText.slice(start, end).replace(/\s+/g, ' ') + suffix;
}

export function countMatches(text: string, query: string): number {
  if (!text || !query.trim()) return 0;
  try {
    const escaped = escapeRegex(query.trim());
    const matches = text.match(new RegExp(escaped, 'gi'));
    return matches ? matches.length : 0;
  } catch {
    return 0;
  }
}

// Highlight query matches in HTML while safely skipping tags
export function highlightHtmlMatches(html: string, query: string): string {
  if (!html || !query.trim()) return html;
  try {
    const escaped = escapeRegex(query.trim());
    // Only match text outside of HTML tags (<...>)
    const pattern = new RegExp(`(?<!<[^>]*)${escaped}(?![^<]*>)`, 'gi');
    return html.replace(pattern, (match) => {
      return `<mark class="search-highlight" style="background-color: #ffd54f; color: #000; padding: 1px 4px; border-radius: 3px; font-weight: 600;">${match}</mark>`;
    });
  } catch {
    return html;
  }
}
