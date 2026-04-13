/**
 * Simple HTML sanitizer that strips all HTML tags to prevent XSS.
 * Since the LLM is instructed NOT to return HTML, any tags found are likely
 * unintended or malicious.
 */
export function sanitize(html: string | null | undefined): string {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, '');
}
