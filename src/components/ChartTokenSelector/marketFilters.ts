import type { SubCategoryTab, TopLevelTab } from "context/TokensFavoritesContext/TokensFavoritesContextProvider";
import { ONE_MONTH_SECONDS } from "lib/dates";
import type { Token } from "sdk/utils/tokens/types";
import type { TokenCategory } from "sdk/utils/tokens/types";

const CRYPTO_CATEGORIES: TokenCategory[] = ["ai", "layer1", "layer2", "defi", "meme"];

function hasAnyCategory(token: Token, cats: TokenCategory[]): boolean {
  return Boolean(token.categories?.some((c) => cats.includes(c)));
}

export function applyTopLevelFilter(
  tokens: Token[],
  args: {
    topLevelTab: TopLevelTab;
    favoriteAddresses: string[];
    recentlyListedAddresses?: Set<string>;
  }
): Token[] {
  switch (args.topLevelTab) {
    case "all":
      return tokens;
    case "favorites":
      return tokens.filter((t) => args.favoriteAddresses.includes(t.address));
    case "crypto":
      return tokens.filter((t) => hasAnyCategory(t, CRYPTO_CATEGORIES));
    case "tradfi":
      return tokens.filter((t) => t.categories?.includes("tradfi"));
    case "recently-listed": {
      const set = args.recentlyListedAddresses;
      if (!set || set.size === 0) return [];
      return tokens.filter((t) => set.has(t.address.toLowerCase()) || set.has(t.address));
    }
  }
}

export function applySubCategoryFilter(
  tokens: Token[],
  args: { topLevelTab: TopLevelTab; subCategoryTab: SubCategoryTab }
): Token[] {
  if (args.subCategoryTab === "all") return tokens;
  if (args.topLevelTab !== "crypto" && args.topLevelTab !== "tradfi") return tokens;
  return tokens.filter((t) => t.categories?.includes(args.subCategoryTab as TokenCategory));
}

export function isMarketRecentlyListed(
  listingDate: number | undefined,
  now: number,
  windowMs: number = ONE_MONTH_SECONDS
): boolean {
  if (listingDate === undefined) return false;
  return now - listingDate < windowMs;
}

export function getRecentlyListedTokenAddresses(
  listingDateByIndexToken: Record<string, number>,
  now: number,
  windowMs: number = ONE_MONTH_SECONDS
): string[] {
  const result: string[] = [];
  for (const [address, ts] of Object.entries(listingDateByIndexToken)) {
    if (now - ts < windowMs) result.push(address.toLowerCase());
  }
  return result;
}
