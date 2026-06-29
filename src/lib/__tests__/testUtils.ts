/**
 * Returns a Playwright CSS selector for a [data-qa="..."] attribute.
 * Use this in component tests instead of repeating the attribute selector by hand.
 */
export function getDataQALocator(name: string): string {
  return `[data-qa="${name}"]`;
}
