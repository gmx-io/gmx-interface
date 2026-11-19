import { readdirSync, readFileSync } from "node:fs";
import type { BrowserContext } from "@playwright/test";
import ts from "typescript";
import { zeroAddress } from "viem";

import { MARKETS } from "../../../sdk/src/configs/markets";
import {
  convertTokenAddress,
  getToken,
  getTokenVisualMultiplier,
  isChartAvailableForToken,
} from "../../../sdk/src/configs/tokens";
import type { Token } from "../../../sdk/src/utils/tokens/types";
import { readObject } from "./deploymentConfig";
import type { ApiMarket } from "./marketData";

export type KeeperMarket = { marketToken: string; indexToken: string; isListed: boolean; listingDate?: string };

export const KEEPER_MARKETS_URL = /-api(?:-fallback)?\.gmxinfra2?\.io\/markets(?:\?|$)/;

const CHAIN_KEYS: Record<number, string> = { 42161: "[ARBITRUM]", 43114: "[AVALANCHE]" };
const RECENTLY_LISTED_MS = 30 * 24 * 60 * 60 * 1000;

// App config modules use path aliases the regression tsconfig cannot resolve, so their address lists are parsed.
function readAddressList(path: string, name: string, chainId: number) {
  // This checkout, not the candidate: the CI sparse checkout omits these files.
  const { file, object } = readObject(path, name, ".");
  const chain = object.properties.find(
    (property): property is ts.PropertyAssignment =>
      ts.isPropertyAssignment(property) && property.name.getText(file) === CHAIN_KEYS[chainId]
  );
  if (!chain) return [];
  if (!ts.isArrayLiteralExpression(chain.initializer)) throw new Error(`${name} is not an address list`);
  return chain.initializer.elements.map((element) => {
    if (ts.isStringLiteral(element)) return element.text;
    if (ts.isIdentifier(element) && element.text === "zeroAddress") return zeroAddress;
    throw new Error(`Unexpected ${name} entry ${element.getText(file)}`);
  });
}

export function sortedMarketAddresses(chainId: number) {
  return readAddressList("src/config/static/sortedMarkets.ts", "SORTED_MARKETS", chainId);
}

export function promotedTokenAddresses(chainId: number) {
  return readAddressList("src/config/promotedTokens.ts", "PROMOTED_TOKENS_ORDER", chainId);
}

// The bundler emits byte-identical images once under one of their names, so ic_gold.svg may load as ic_xau-<hash>.svg.
export function tokenIconPattern(symbol: string) {
  const dir = "src/img/tokens";
  const files = readdirSync(dir);
  const own = [`ic_${symbol.toLowerCase()}.svg`, `ic_${symbol.toLowerCase()}.png`].find((name) => files.includes(name));
  const content = own && readFileSync(`${dir}/${own}`);
  const names = content
    ? files.filter((name) => readFileSync(`${dir}/${name}`).equals(content)).map((name) => name.replace(/\.\w+$/, ""))
    : [`ic_${symbol.toLowerCase()}`];
  return new RegExp(`/(?:${names.map((name) => name.replace(/[.]/g, "\\.")).join("|")})(?:-[^/]*)?\\.(?:svg|png)$`);
}

export function marketLabel(token: Token) {
  return `${getTokenVisualMultiplier(token)}${token.baseSymbol || token.symbol}/USD`;
}

// Entries keyed by market address under the chain's key, e.g. MARKETS[ARBITRUM].
function readMarketEntries(path: string, name: string, chainId: number, root?: string) {
  const { file, object } = readObject(path, name, root);
  const chain = object.properties.find(
    (property): property is ts.PropertyAssignment =>
      ts.isPropertyAssignment(property) && property.name.getText(file) === CHAIN_KEYS[chainId]
  );
  if (!chain) return { file, entries: [] };
  if (!ts.isObjectLiteralExpression(chain.initializer)) throw new Error(`${name} is not keyed by market`);
  const entries = chain.initializer.properties.filter(
    (entry): entry is ts.PropertyAssignment & { name: ts.StringLiteral } =>
      ts.isPropertyAssignment(entry) && ts.isStringLiteral(entry.name)
  );
  return { file, entries };
}

const deployedMarkets = new Map<number, Set<string>>();

// The suite runs from the PR merge commit, which can list markets the deployed PR head lacks,
// e.g. a master hotfix listing on a release PR; the app redirects or hides markets it has no config for.
function deployedMarketAddresses(chainId: number) {
  if (!deployedMarkets.has(chainId)) {
    const { entries } = readMarketEntries("sdk/src/configs/markets.ts", "MARKETS", chainId);
    if (!entries.length) throw new Error(`Missing MARKETS for ${chainId}`);
    deployedMarkets.set(chainId, new Set(entries.map((entry) => entry.name.text)));
  }
  return deployedMarkets.get(chainId)!;
}

// Mirrors getMarketClosingState: a market in MARKET_CLOSING_DATES is closed from that date on.
export function closedMarketAddresses(chainId: number, now = Date.now()) {
  const { file, entries } = readMarketEntries("src/config/static/markets.ts", "MARKET_CLOSING_DATES", chainId, ".");
  return entries.flatMap((entry) => {
    const date = entry.initializer;
    const parts = ts.isCallExpression(date) && date.expression.getText(file) === "Date.UTC" ? date.arguments : [];
    if (parts.length !== 3 || !parts.every(ts.isNumericLiteral))
      throw new Error(`Unexpected closing date ${date.getText(file)}`);
    const [year, month, day] = parts.map((part) => Number(part.text));
    return now >= Date.UTC(year, month, day) ? [entry.name.text] : [];
  });
}

export function configuredMarkets(chainId: number) {
  const deployed = deployedMarketAddresses(chainId);
  return Object.values(MARKETS[chainId as 42161])
    .filter((market) => deployed.has(market.marketTokenAddress))
    .map((market) => {
      const indexToken =
        market.indexTokenAddress === zeroAddress
          ? undefined
          : getToken(chainId, convertTokenAddress(chainId, market.indexTokenAddress, "native"));
      const pool = `${getToken(chainId, market.longTokenAddress).symbol}-${getToken(chainId, market.shortTokenAddress).symbol}`;
      return { ...market, indexToken, pool };
    });
}

export type ConfiguredMarket = ReturnType<typeof configuredMarkets>[number];

// The newest perp market of each index token, newest first; sortedMarkets.ts is appended to on every listing.
export function newestPerpMarkets(chainId: number) {
  const markets = new Map(configuredMarkets(chainId).map((market) => [market.marketTokenAddress, market]));
  return sortedMarketAddresses(chainId)
    .map((address) => markets.get(address))
    .filter((market): market is ConfiguredMarket & { indexToken: Token } => Boolean(market?.indexToken))
    .reverse()
    .filter((market, i, all) => all.findIndex((other) => other.indexTokenAddress === market.indexTokenAddress) === i);
}

function isMarketDeprecated(config: ApiMarket) {
  return (
    BigInt(String(config.maxOpenInterestLong)) <= 10n ** 30n &&
    BigInt(String(config.maxOpenInterestShort)) <= 10n ** 30n
  );
}

// Mirrors the market selector's filter.
export function selectorIndexTokens(chainId: number, apiConfigs: ApiMarket[]) {
  const configs = new Map(apiConfigs.map((config) => [config.marketTokenAddress, config]));
  const tokens = new Map<string, { token: Token; markets: ConfiguredMarket[] }>();
  for (const market of configuredMarkets(chainId)) {
    const config = configs.get(market.marketTokenAddress);
    if (!market.indexToken || !isChartAvailableForToken(chainId, market.indexToken.symbol)) continue;
    if (!config || config.isDisabled || isMarketDeprecated(config)) continue;
    const entry = tokens.get(market.indexToken.address) ?? { token: market.indexToken, markets: [] };
    entry.markets.push(market);
    tokens.set(market.indexToken.address, entry);
  }
  return [...tokens.values()];
}

// Mirrors the keeper contract: an index token's listing date is its earliest market listing.
export function recentlyListedIndexTokens(markets: KeeperMarket[], now = Date.now()) {
  const listed = new Map<string, number>();
  for (const market of markets) {
    const time = market.listingDate ? Date.parse(market.listingDate) : NaN;
    if (!market.indexToken || !Number.isFinite(time)) continue;
    listed.set(market.indexToken, Math.min(listed.get(market.indexToken) ?? time, time));
  }
  return [...listed].filter(([, time]) => now - time < RECENTLY_LISTED_MS).map(([address]) => address);
}

export function isIndexToken(token: Token, address: string) {
  return token.address === address || token.wrappedAddress === address;
}

export async function overrideJson<T>(context: BrowserContext, url: RegExp, transform: (json: T) => T) {
  const served = { count: 0 };
  await context.route(url, async (route) => {
    // A request still in flight when the test ends fails once the context closes; the app sees a network error.
    const response = await route.fetch().catch(() => undefined);
    if (!response) return route.abort().catch(() => undefined);
    const json = transform(await response.json());
    served.count++;
    await route.fulfill({ response, json });
  });
  return served;
}
