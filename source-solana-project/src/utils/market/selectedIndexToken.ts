import {
  DEFAULT_TRADE_MARKET_SLUG,
  getCanonicalTradePath,
  indexTokenToSlug,
} from './marketSlug';

export const SELECTED_INDEX_TOKEN_KEY = 'selectedIndexToken';

export function getSelectedIndexToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return localStorage.getItem(SELECTED_INDEX_TOKEN_KEY);
}

export function setSelectedIndexToken(indexToken: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(SELECTED_INDEX_TOKEN_KEY, indexToken);
}

export function resolveBareTradeRedirectPath(search: string): string {
  const storedIndexToken = getSelectedIndexToken();
  const slug = storedIndexToken ? indexTokenToSlug(storedIndexToken) : null;

  if (!slug) {
    return `/trade/${DEFAULT_TRADE_MARKET_SLUG}${search}`;
  }

  return `${getCanonicalTradePath(slug)}${search}`;
}
