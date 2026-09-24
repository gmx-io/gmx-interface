import { formatMarketName } from '@/components/TradeBoxNew/utils/formatMarketName';
import { GMX_SOLANA_TOKENS_RAW } from '@/config/program';
import { NATIVE_TOKEN_ADDRESS, SOL_TOKEN_ADDRESS } from '@/config/tokens';

export const DEFAULT_TRADE_MARKET_SLUG = 'SOL-USD';
export const SOL_DEFAULT_MINT = SOL_TOKEN_ADDRESS.toBase58();
const PLACEHOLDER_MINT = NATIVE_TOKEN_ADDRESS.toBase58();

export function marketNameToSlug(marketName: string): string {
  return marketName.replace(/\//g, '-');
}

export function normalizeSlug(slug: string): string {
  return slug.toUpperCase();
}

export function slugToMarketName(slug: string): string {
  return normalizeSlug(slug).replace(/-/g, '/');
}

export function isTradePathname(pathname: string): boolean {
  return pathname === '/trade' || pathname.startsWith('/trade/');
}

export function isBareTradePath(pathname: string): boolean {
  return pathname === '/trade' || pathname === '/trade/';
}

export function getMarketSlugFromPathname(pathname: string): string | null {
  if (!pathname.startsWith('/trade/')) {
    return null;
  }

  const slug = pathname.slice('/trade/'.length).split('/')[0];
  return slug || null;
}

export function indexTokenToSlug(indexToken: string): string | null {
  const marketName = formatMarketName(indexToken);
  if (!marketName) {
    return null;
  }

  return marketNameToSlug(marketName);
}

function buildStaticSlugMap(): Map<string, string> {
  const map = new Map<string, string>();

  // Prefer the canonical SOL index mint over placeholder / wrapped aliases.
  map.set(normalizeSlug(DEFAULT_TRADE_MARKET_SLUG), SOL_DEFAULT_MINT);

  for (const [mint, config] of Object.entries(GMX_SOLANA_TOKENS_RAW)) {
    if (mint === PLACEHOLDER_MINT) {
      continue;
    }

    const marketName = config.displayMarketName;
    if (!marketName) {
      continue;
    }

    const slugKey = normalizeSlug(marketNameToSlug(marketName));
    if (!map.has(slugKey)) {
      map.set(slugKey, mint);
    }
  }

  return map;
}

const staticSlugMap = buildStaticSlugMap();

export function buildSlugToIndexTokenMap(
  indexTokens: Array<{ indexToken: string }>
): Map<string, string> {
  const map = new Map<string, string>();

  for (const token of indexTokens) {
    const slug = indexTokenToSlug(token.indexToken);
    if (!slug) {
      continue;
    }

    const slugKey = normalizeSlug(slug);
    if (!map.has(slugKey)) {
      map.set(slugKey, token.indexToken);
    }
  }

  return map;
}

export function resolveSlugToIndexToken(
  slug: string,
  map?: Map<string, string>
): string | null {
  const slugKey = normalizeSlug(slug);
  const lookupMap = map ?? staticSlugMap;
  return lookupMap.get(slugKey) ?? null;
}

export function resolveSlugFromPathname(pathname: string): string | null {
  const slug = getMarketSlugFromPathname(pathname);
  if (!slug) {
    return null;
  }

  return resolveSlugToIndexToken(slug);
}

export function getCanonicalTradePath(slug: string): string {
  return `/trade/${normalizeSlug(slug)}`;
}
