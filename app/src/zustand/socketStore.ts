/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import { create } from 'zustand';
import { getSocketServerUrl, IS_DEVELOPMENT } from '@/config/env';
import {
  GMX_SOLANA_MARKET_TOKENS,
  GMX_SOLANA_TOKENS_RAW,
} from '@/config/program';
import { getNormalizedTokenSymbolForFetchingPrice } from '@/utils/token/getNormalizedTokenSymbolForFetchingPrice';
import { useWsLastUpdatedAtStore } from './wsLastUpdatedAtStore';
import { ONE_USD } from '@/config/constants';
import { BN } from '@coral-xyz/anchor';
import {
  getGmw374Enabled,
  getGmw391Enabled,
  getGmw395Enabled,
  getGmw418Enabled,
} from '@/config/featureFlagEnable';
import { mergeLatestTickers } from './mergeLatestTickers';
import { createWebSocketFirstMessageTracker } from '@/utils/fetchWithTimeoutLog';

const SOCKET_SERVER_URL = getSocketServerUrl();

// Per GMW-224: reject published prices when feed deviation exceeds 1%.
const PRICE_DEVIATION_THRESHOLD = 0.01;
const PRICE_STALE_MS = 5000;
const PRICE_SCALE = 1e20;
// const ONE_USD_BN = 10n ** 20n;
const SUPPRESS_PRICE_DEVIATION_LOGS =
  import.meta.env.VITE_SUPPRESS_PRICE_DEVIATION_LOGS?.toLowerCase() === 'true';

export type PriceSource = 'socket' | 'keeper' | 'candle';
type GuardFreshnessSource = PriceSource;

interface MarketInfoSummary {
  marketToken: string;
  indexToken?: string;
  longToken?: string;
  shortToken?: string;
  minCollateralFactorForLong?: string;
  minCollateralFactorForShort?: string;
  [key: string]: unknown;
}

interface IndexTokenItem {
  indexToken: string;
  percentChange24h: string | number;
  marketInfos: MarketInfoSummary[];
  [key: string]: unknown;
}

interface TickerItem {
  symbol: string;
  [key: string]: unknown;
}

type TickerData = TickerItem[];
type CandleData = any[];
type IndexTokenData = IndexTokenItem[];
type SwapListData = any[];

export interface StoreBalanceToken {
  mint: string;
  account: string;
  amount: string;
  programId: string;
}

export interface StoreBalancesPayload {
  store: string;
  solBalance: string;
  tokenBalances: StoreBalanceToken[];
  isSnapshot: boolean;
  isLastSnapshot: boolean;
  hasLastSnapshot: boolean;
}

export interface TokenMintPayload {
  pubkey: string;
  programId: string;
  decimals: number;
  supply: string;
  data?: string;
  isSnapshot: boolean;
  isLastSnapshot: boolean;
  hasLastSnapshot: boolean;
}

export interface GlvAccountMarketPayload {
  marketToken: string;
  maxAmount: string;
  maxValue: string;
  flags?: {
    isDepositAllowed?: boolean;
  };
}

export interface GlvAccountPayload {
  glv: string;
  data?: string;
  config?: {
    glvToken: string;
    longToken: string;
    shortToken: string;
    minTokensForFirstDeposit: string;
    shiftLastExecutedAt: string;
  };
  markets?: GlvAccountMarketPayload[];
  removed?: boolean;
  isSnapshot: boolean;
  isLastSnapshot: boolean | null;
  hasLastSnapshot: boolean;
}

interface SocketState {
  tickers: TickerData;
  candles: CandleData;
  indexTokens: IndexTokenData;
  swapList: SwapListData;
  storeBalances: StoreBalancesPayload | null;
  tokenMints: Record<string, TokenMintPayload>;
  glvAccounts: Record<string, GlvAccountPayload>;
  readyState: number;
  /** True once WebSocket has delivered at least one indexTokens message */
  socketIndexTokensReady: boolean;
  /** Symbols whose socket price was rejected due to >1% deviation from keeper */
  inconsistentSymbols: Set<string>;
  /** Snapshot of symbols whose real-time price source was stale when the store last updated */
  staleSymbols: Set<string>;
  /** ms timestamp of last socket tickers message; 0 = never received or after disconnect */
  lastSocketTickerAt: number;
  /** Per-symbol ms timestamp of last successfully published socket price */
  symbolPriceUpdatedAt: Map<string, number>;
  /** Per-symbol source update timestamps used by the price guard */
  priceSourceUpdatedAt: Map<string, Map<PriceSource, number>>;
  /** ms timestamp when the WebSocket last closed/errored; 0 = connected or never disconnected */
  socketDisconnectedAt: number;
  sendJsonMessage: (data: any) => void;
  connect: () => void;
  reconnect: () => void;
  reconnectImmediately: () => void;
  disconnect: () => void;
  setKeeperIndexTokens: (keeperTokens: any[]) => void;
  setKeeperTickers: (keeperTickers: any[]) => void;
  setCandlePrices: (
    candlePrices: Array<{
      symbol?: string;
      tokenAddress?: string;
      price: string | number;
      updatedAt?: number;
    }>
  ) => void;
}

let socket: WebSocket | null = null;

// Reconnect with exponential backoff capped at 20s, giving up only after
// 999 attempts.
const MAIN_SOCKET_MAX_RECONNECT_ATTEMPTS = 999;
const MAIN_SOCKET_RECONNECT_BASE_DELAY = 1000;
const MAIN_SOCKET_RECONNECT_MAX_DELAY = 20000;
let shouldReconnect = false;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
let socketOpenedAt = 0;
let socketHealthTimer: ReturnType<typeof setInterval> | null = null;

// Tickers are expected continuously. If the browser keeps a dead connection in
// OPEN state after a network change, replace it instead of waiting forever for
// onclose/onerror, which may never arrive for a half-open TCP connection.
export const MAIN_SOCKET_TICKER_TIMEOUT_MS = 15000;
const MAIN_SOCKET_HEALTH_CHECK_INTERVAL_MS = 5000;

function scheduleSocketReconnect(reconnect: () => void) {
  if (!shouldReconnect || reconnectTimer) return;
  if (reconnectAttempts >= MAIN_SOCKET_MAX_RECONNECT_ATTEMPTS) {
    console.error(
      '[mainSocket] giving up reconnect after',
      MAIN_SOCKET_MAX_RECONNECT_ATTEMPTS,
      'attempts'
    );
    return;
  }
  const delay = Math.min(
    MAIN_SOCKET_RECONNECT_MAX_DELAY,
    MAIN_SOCKET_RECONNECT_BASE_DELAY * 2 ** reconnectAttempts
  );
  const jitter = Math.floor(Math.random() * 1000);
  reconnectAttempts += 1;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    reconnect();
  }, delay + jitter);
}

function clearSocketHealthTimer() {
  if (socketHealthTimer) {
    clearInterval(socketHealthTimer);
    socketHealthTimer = null;
  }
}

// Internal storage for merging
let _socketIndexTokens: IndexTokenItem[] = [];
let _keeperIndexTokens: IndexTokenItem[] = [];
let _socketTickers: TickerItem[] = [];
let _keeperTickers: TickerItem[] = [];
// Tracks which symbols were rejected in the latest price merge calls.
let _inconsistentSymbols: Set<string> = new Set();
let _tickerInconsistentSymbols: Set<string> = new Set();
let _indexInconsistentSymbols: Set<string> = new Set();
let _staleSymbols: Set<string> = new Set();
// Per-symbol timestamp of last successfully published price (ms since epoch)
let _symbolPriceUpdatedAt: Map<string, number> = new Map();
let _priceSourceUpdatedAt: Map<string, Map<PriceSource, number>> = new Map();
let _candlePrices: TickerItem[] = [];
let priceGuardTimer: ReturnType<typeof setInterval> | null = null;

function addSymbolAliases(target: Set<string>, symbol?: string) {
  if (!symbol) return;
  target.add(symbol);
  target.add(getNormalizedTokenSymbolForFetchingPrice(symbol));
}

function getSymbolAliases(symbol?: string): string[] {
  if (!symbol) return [];
  return Array.from(
    new Set([symbol, getNormalizedTokenSymbolForFetchingPrice(symbol)])
  );
}

function getTokenSymbol(tokenAddress?: string): string | undefined {
  return tokenAddress ? GMX_SOLANA_TOKENS_RAW[tokenAddress]?.symbol : undefined;
}

function getTokenDecimals(symbol?: string): number | undefined {
  if (!symbol) return undefined;
  const normalizedSymbol = getNormalizedTokenSymbolForFetchingPrice(symbol);
  const token = Object.values(GMX_SOLANA_TOKENS_RAW).find(
    (item) =>
      item.symbol === symbol ||
      getNormalizedTokenSymbolForFetchingPrice(item.symbol) === normalizedSymbol
  );
  // unitPrice is per SPL token unit; use on-chain decimals, not decimals_gmx.
  return token?.decimals ?? token?.decimals_gmx;
}

function markSourceUpdated(
  symbol: string | undefined,
  source: PriceSource,
  at = Date.now()
) {
  for (const alias of getSymbolAliases(symbol)) {
    const sourceMap = new Map(_priceSourceUpdatedAt.get(alias));
    sourceMap.set(source, at);
    _priceSourceUpdatedAt.set(alias, sourceMap);
  }
}

function markSourcesUpdated(
  symbol: string | undefined,
  sources: PriceSource[],
  at = Date.now()
) {
  for (const source of sources) {
    markSourceUpdated(symbol, source, at);
  }
}

function clearSource(source: PriceSource) {
  const next = new Map<string, Map<PriceSource, number>>();
  for (const [symbol, sourceMap] of _priceSourceUpdatedAt) {
    const newSourceMap = new Map(sourceMap);
    newSourceMap.delete(source);
    if (newSourceMap.size > 0) {
      next.set(symbol, newSourceMap);
    }
  }
  _priceSourceUpdatedAt = next;
}

function syncInconsistentSymbols() {
  _inconsistentSymbols = new Set([
    ..._tickerInconsistentSymbols,
    ..._indexInconsistentSymbols,
  ]);
}

function getFeedPriceMap(items: TickerItem[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of items) {
    const price = getComparableUsdPrice(item, item.symbol);
    if (price <= 0) continue;
    for (const alias of getSymbolAliases(item.symbol)) {
      map.set(alias, price);
    }
  }
  return map;
}

function toPositiveFiniteNumber(value: unknown): number {
  const price = Number(value);
  return Number.isFinite(price) && price > 0 ? price : 0;
}

function getComparableUsdPrice(item: unknown, symbolHint?: string): number {
  if (!item || typeof item !== 'object') return 0;
  const record = item as Record<string, unknown>;
  const directUsdPrice = toPositiveFiniteNumber(record.usdPrice);
  if (directUsdPrice > 0) return directUsdPrice;

  const symbol =
    symbolHint ||
    (typeof record.symbol === 'string' ? record.symbol : undefined);
  const decimals = getTokenDecimals(symbol);

  // Whole-token price from WS tickers is always scaled by PRICE_SCALE (1e20).
  // Candle feeds use `usdPrice` above, not this field.
  const wholeTokenPrice = toPositiveFiniteNumber(record.price);
  if (wholeTokenPrice > 0) {
    return wholeTokenPrice / PRICE_SCALE;
  }

  // unitPrice is per smallest token unit: usd = unitPrice * 10^decimals / 1e20.
  // Do not treat values <= 1e12 as already-USD — cheap tokens like PUMP sit under that.
  const unitPrice = [record.unitPrice, record.minUnitPrice, record.maxUnitPrice]
    .map(toPositiveFiniteNumber)
    .find((price) => price > 0);
  if (unitPrice != null) {
    if (decimals != null) {
      return (unitPrice * 10 ** decimals) / PRICE_SCALE;
    }
    return unitPrice > 1e12 ? unitPrice / PRICE_SCALE : unitPrice;
  }

  return 0;
}

function getComparablePrice(item: unknown, symbolHint?: string): number {
  return getComparableUsdPrice(item, symbolHint);
}

export function getLatestSocketPriceUsd(symbol: string): number | undefined {
  const aliases = new Set(getSymbolAliases(symbol));
  const ticker = _socketTickers.find((item) => aliases.has(item.symbol));
  const price = getComparableUsdPrice(ticker, symbol);
  return price > 0 ? price : undefined;
}

function isTickerItem(item: TickerItem | null): item is TickerItem {
  return Boolean(item);
}

function normalizeCandleUpdatedAt(updatedAt: number | undefined): number {
  return Number.isFinite(updatedAt) && Number(updatedAt) > 0
    ? Number(updatedAt)
    : Date.now();
}

function hasDeviation(
  symbol: string,
  sourcePrice: number,
  baselines: number[]
): boolean {
  return baselines.some((baselinePrice) => {
    const deviation = Math.abs(sourcePrice - baselinePrice) / baselinePrice;
    if (deviation > PRICE_DEVIATION_THRESHOLD) {
      reportPriceDeviation(
        symbol,
        sourcePrice,
        baselinePrice,
        (deviation * 100).toFixed(2)
      );
      return true;
    }
    return false;
  });
}

function addInconsistentSymbol(target: Set<string>, symbol: string) {
  addSymbolAliases(target, symbol);
}

function getItemSymbol(item: IndexTokenItem): string | undefined {
  const symbol = item.symbol;
  return typeof symbol === 'string'
    ? symbol
    : GMX_SOLANA_TOKENS_RAW[item.indexToken]?.symbol;
}

/**
 * 2026-7-7:
 * Compute the stricter leverage limit for one market pair.
 * Formula: leverage = ONE_USD * ONE_USD / minCollateralFactor.
 * Long and short can have different min collateral factors, so use the smaller leverage.
 */
function calculateMinLeverageForMarketInfo(
  marketInfo: MarketInfoSummary
): string | undefined {
  const minCollateralFactorForLong = new BN(
    marketInfo.minCollateralFactorForLong || 0
  );
  const minCollateralFactorForShort = new BN(
    marketInfo.minCollateralFactorForShort || 0
  );

  if (
    minCollateralFactorForLong.isZero() ||
    minCollateralFactorForShort.isZero()
  ) {
    return undefined;
  }

  const longLeverage =
    ONE_USD.mul(ONE_USD).div(minCollateralFactorForLong);
  const shortLeverage =
    ONE_USD.mul(ONE_USD).div(minCollateralFactorForShort);

  return (longLeverage < shortLeverage ? longLeverage : shortLeverage).toString();
}

/**
 * 2026-7-7:
 * Recalculate the outer index-token maxLeverage from all nested marketInfos.
 * If one index token has multiple market pairs, use the smallest pair-level leverage.
 */
function recalculateIndexTokenMaxLeverage(
  item: IndexTokenItem
): IndexTokenItem {
  const minLeverage = item.marketInfos.reduce<bigint | undefined>(
    (minValue, marketInfo) => {
      const leverage = calculateMinLeverageForMarketInfo(marketInfo);
      if (leverage === undefined) return minValue;

      const leverageBn = BigInt(leverage);
      return minValue === undefined || leverageBn < minValue
        ? leverageBn
        : minValue;
    },
    undefined
  );

  return minLeverage === undefined
    ? item
    : {
        ...item,
        maxLeverage: minLeverage.toString(),
      };
}

function reportPriceDeviation(
  symbol: string,
  sourcePrice: number,
  baselinePrice: number,
  deviationPct: string
) {
  if (SUPPRESS_PRICE_DEVIATION_LOGS) {
    return;
  }

  console.error(
    '[price-guard] deviation rejected - source price not published',
    {
      symbol,
      sourcePrice,
      baselinePrice,
      deviationPct,
      ts: new Date().toISOString(),
    }
  );
}

function reportInvalidPrice(
  symbol: string,
  source: PriceSource,
  sourcePrice: number
) {
  console.error(
    '[price-guard] invalid price rejected - source price not published',
    {
      symbol,
      source,
      sourcePrice,
      ts: new Date().toISOString(),
    }
  );
}

function mergeIndexTokens(
  keeperIndexTokens: IndexTokenItem[],
  socketIndexTokens: IndexTokenItem[]
): IndexTokenItem[] {
  // Keeper is the baseline; socket overrides only when token-level price
  // deviation is within the same 1% guard used by tickers.
  // Special case: socket currently sends percentChange24h="0" for keeper-source tokens
  // (e.g. WTI). Backfill that single field from keeper when socket value is missing/zero.
  const keeperMap = new Map<string, IndexTokenItem>();
  for (const item of keeperIndexTokens) {
    keeperMap.set(item.indexToken, item);
  }
  const out = new Map<string, IndexTokenItem>();
  const inconsistent = new Set<string>();
  for (const item of keeperIndexTokens) {
    out.set(item.indexToken, item);
  }
  for (const item of socketIndexTokens) {
    const keeperItem = keeperMap.get(item.indexToken);
    const symbol =
      getItemSymbol(item) || getItemSymbol(keeperItem) || item.indexToken;
    const socketPrice = getComparablePrice(item, symbol);
    if (socketPrice <= 0) {
      reportInvalidPrice(symbol, 'socket', socketPrice);
      addInconsistentSymbol(inconsistent, symbol);
      continue;
    }
    if (keeperItem) {
      const keeperPrice = getComparablePrice(keeperItem, symbol);
      if (keeperPrice > 0 && hasDeviation(symbol, socketPrice, [keeperPrice])) {
        addInconsistentSymbol(inconsistent, symbol);
        continue;
      }
    }
    if (IS_DEVELOPMENT && keeperItem) {
      out.set(item.indexToken, {
        ...item,
        ...keeperItem,
      });
    } else if (
      keeperItem &&
      (!item.percentChange24h || item.percentChange24h === '0')
    ) {
      out.set(item.indexToken, {
        ...item,
        percentChange24h: keeperItem.percentChange24h,
      });
    } else {
      out.set(item.indexToken, item);
    }
  }
  _indexInconsistentSymbols = inconsistent;
  syncInconsistentSymbols();
  return Array.from(out.values());
}

function mergeTickers(): TickerItem[] {
  // Keeper is the baseline; socket and candle sources can publish only when all
  // available feed prices stay inside the same 1% guard.
  const map = new Map<string, TickerItem>();
  const inconsistent = new Set<string>();
  const keeperPrices = getFeedPriceMap(_keeperTickers);
  const candlePrices = getFeedPriceMap(_candlePrices);

  for (const item of _keeperTickers) {
    map.set(item.symbol, item);
  }
  for (const item of _socketTickers) {
    const keeper = map.get(item.symbol);
    const sourcePrice = getComparablePrice(item, item.symbol);
    if (sourcePrice <= 0) {
      reportInvalidPrice(item.symbol, 'socket', sourcePrice);
      addInconsistentSymbol(inconsistent, item.symbol);
      continue;
    }
    const baselines = [
      getComparablePrice(keeper, item.symbol),
      candlePrices.get(item.symbol),
      candlePrices.get(getNormalizedTokenSymbolForFetchingPrice(item.symbol)),
    ].filter(
      (price): price is number => typeof price === 'number' && price > 0
    );
    if (hasDeviation(item.symbol, sourcePrice, baselines)) {
      addInconsistentSymbol(inconsistent, item.symbol);
      // Reject socket price: keeper value stays in map, no override.
      continue;
    }
    map.set(item.symbol, item);
  }
  for (const item of _candlePrices) {
    const symbol = item.symbol;
    const candlePrice = getComparablePrice(item, symbol);
    if (candlePrice <= 0) {
      reportInvalidPrice(symbol, 'candle', candlePrice);
      addInconsistentSymbol(inconsistent, symbol);
      continue;
    }
    const baselines = [
      keeperPrices.get(symbol),
      keeperPrices.get(getNormalizedTokenSymbolForFetchingPrice(symbol)),
      getComparablePrice(map.get(symbol), symbol),
      getComparablePrice(
        map.get(getNormalizedTokenSymbolForFetchingPrice(symbol)),
        symbol
      ),
    ].filter(
      (price): price is number => typeof price === 'number' && price > 0
    );
    if (hasDeviation(symbol, candlePrice, baselines)) {
      addInconsistentSymbol(inconsistent, symbol);
    }
  }

  _tickerInconsistentSymbols = inconsistent;
  syncInconsistentSymbols();
  return Array.from(map.values());
}

function computeStaleSymbols(
  sourceUpdatedAt = _priceSourceUpdatedAt
): Set<string> {
  const now = Date.now();
  const stale = new Set<string>();
  for (const [symbol, sourceMap] of sourceUpdatedAt) {
    const sourceAges = Array.from(sourceMap.entries()).map(
      ([, updatedAt]) => now - updatedAt
    );
    if (sourceAges.some((age) => age > PRICE_STALE_MS)) {
      addSymbolAliases(stale, symbol);
    }
  }
  _staleSymbols = stale;
  return stale;
}

function getFreshestSourceMap(
  symbols: string[],
  sourceUpdatedAt: Map<string, Map<PriceSource, number>>
): Map<PriceSource, number> | undefined {
  return symbols.map((symbol) => sourceUpdatedAt.get(symbol)).find(Boolean);
}

function hasFreshSocketPrice(
  symbols: string[],
  symbolPriceUpdatedAt: Map<string, number>
): boolean {
  return symbols.some((symbol) => {
    const updatedAt = symbolPriceUpdatedAt.get(symbol);
    return updatedAt != null && Date.now() - updatedAt <= PRICE_STALE_MS;
  });
}

function getGuardFreshnessSources(
  sourceMap: Map<PriceSource, number>
): GuardFreshnessSource[] {
  return (['socket', 'keeper', 'candle'] as GuardFreshnessSource[]).filter(
    (source) => sourceMap.has(source)
  );
}

function getStaleRequiredSources(
  requiredSources: GuardFreshnessSource[],
  sourceMap: Map<PriceSource, number>
): GuardFreshnessSource[] {
  const now = Date.now();
  return requiredSources.filter((source) => {
    const updatedAt = sourceMap.get(source);
    return updatedAt != null && now - updatedAt > PRICE_STALE_MS;
  });
}

/** Returns how many ms ago `symbol`'s socket price was last published, or null if never. */
export function getPriceAgeMs(
  symbol: string,
  updatedAt: Map<string, number>
): number | null {
  const t = updatedAt.get(symbol);
  return t != null ? Date.now() - t : null;
}

export function getPriceGuardError({
  rawSymbol,
  readyState,
  socketDisconnectedAt,
  inconsistentSymbols,
  staleSymbols,
  symbolPriceUpdatedAt,
  priceSourceUpdatedAt,
}: {
  rawSymbol: string | undefined;
  readyState: number;
  socketDisconnectedAt: number;
  inconsistentSymbols: Set<string>;
  staleSymbols?: Set<string>;
  symbolPriceUpdatedAt: Map<string, number>;
  priceSourceUpdatedAt?: Map<string, Map<PriceSource, number>>;
}): 'disconnected' | 'inconsistent' | 'unavailable' | null {
  const normalizedSymbol = getNormalizedTokenSymbolForFetchingPrice(
    rawSymbol || ''
  );
  const symbols = getSymbolAliases(rawSymbol || normalizedSymbol);
  const disconnected = readyState !== WebSocket.OPEN;
  if (
    disconnected &&
    socketDisconnectedAt > 0 &&
    Date.now() - socketDisconnectedAt > PRICE_STALE_MS
  ) {
    return 'disconnected';
  }
  if (
    inconsistentSymbols.has(normalizedSymbol) ||
    inconsistentSymbols.has(rawSymbol || '')
  ) {
    return 'inconsistent';
  }
  if (priceSourceUpdatedAt) {
    const sourceMap = getFreshestSourceMap(symbols, priceSourceUpdatedAt);
    if (!sourceMap || sourceMap.size === 0) {
      return 'unavailable';
    }
    const requiredSources = getGuardFreshnessSources(sourceMap);
    if (requiredSources.length === 0) {
      return 'unavailable';
    }
    if (
      requiredSources.includes('socket') &&
      !hasFreshSocketPrice(symbols, symbolPriceUpdatedAt)
    ) {
      return 'unavailable';
    }
    const staleRequiredSources = getStaleRequiredSources(
      requiredSources,
      sourceMap
    );
    if (staleRequiredSources.length > 0) {
      return 'unavailable';
    }
    const liveStaleSymbols = computeStaleSymbols(priceSourceUpdatedAt);
    if (
      staleSymbols &&
      symbols.some(
        (symbol) => staleSymbols.has(symbol) || liveStaleSymbols.has(symbol)
      )
    ) {
      return 'unavailable';
    }
    return null;
  }
  const symbolAge = getPriceAgeMs(
    normalizedSymbol || rawSymbol || '',
    symbolPriceUpdatedAt
  );
  if (symbolAge === null || symbolAge > PRICE_STALE_MS) {
    return 'unavailable';
  }
  return null;
}

function ensurePriceGuardTimer(set: (partial: Partial<SocketState>) => void) {
  if (priceGuardTimer) return;
  priceGuardTimer = setInterval(() => {
    computeStaleSymbols();
    set({
      staleSymbols: new Set(_staleSymbols),
      priceSourceUpdatedAt: _priceSourceUpdatedAt,
      symbolPriceUpdatedAt: _symbolPriceUpdatedAt,
    });
  }, 1000);
}

function clearSocketData(set: (partial: Partial<SocketState>) => void) {
  ensurePriceGuardTimer(set);
  _socketIndexTokens = [];
  _socketTickers = [];
  clearSource('socket');
  // Re-merge with keeper-only data so the Zustand store reflects the current truth.
  const tickers = mergeTickers();
  const indexTokens = mergeIndexTokens(_keeperIndexTokens, []);
  _symbolPriceUpdatedAt = new Map();
  computeStaleSymbols();
  set({
    tickers,
    indexTokens,
    storeBalances: null,
    tokenMints: {},
    glvAccounts: {},
    readyState: WebSocket.CLOSED,
    socketIndexTokensReady: false,
    inconsistentSymbols: _inconsistentSymbols,
    staleSymbols: _staleSymbols,
    lastSocketTickerAt: 0,
    symbolPriceUpdatedAt: new Map(),
    priceSourceUpdatedAt: _priceSourceUpdatedAt,
    socketDisconnectedAt: Date.now(),
  });
}

function markSocketDisconnected(set: (partial: Partial<SocketState>) => void) {
  if (!getGmw418Enabled()) {
    clearSocketData(set);
    return;
  }

  ensurePriceGuardTimer(set);
  set({
    readyState: WebSocket.CLOSED,
    socketIndexTokensReady: false,
    lastSocketTickerAt: 0,
    socketDisconnectedAt: Date.now(),
  });
}

const useSocketStore = create<SocketState>((set, get) => ({
  tickers: [],
  candles: [],
  indexTokens: [],
  swapList: [],
  storeBalances: null,
  tokenMints: {},
  glvAccounts: {},
  readyState: WebSocket.CLOSED,
  socketIndexTokensReady: false,
  inconsistentSymbols: new Set(),
  staleSymbols: new Set(),
  lastSocketTickerAt: 0,
  symbolPriceUpdatedAt: new Map(),
  priceSourceUpdatedAt: new Map(),
  socketDisconnectedAt: 0,
  sendJsonMessage: (data: any) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket is not connected. Cannot send message.');
    }
  },
  setKeeperIndexTokens: (keeperTokens: any[]) => {
    ensurePriceGuardTimer(set);
    _keeperIndexTokens = keeperTokens;
    const now = Date.now();
    for (const item of keeperTokens) {
      markSourcesUpdated(getItemSymbol(item), ['keeper'], now);
    }
    computeStaleSymbols();
    set({
      indexTokens: mergeIndexTokens(keeperTokens, _socketIndexTokens),
      inconsistentSymbols: _inconsistentSymbols,
      staleSymbols: _staleSymbols,
      priceSourceUpdatedAt: _priceSourceUpdatedAt,
    });
  },
  setKeeperTickers: (keeperTickers: any[]) => {
    ensurePriceGuardTimer(set);
    _keeperTickers = keeperTickers;
    const now = Date.now();
    for (const item of keeperTickers) {
      markSourcesUpdated(item.symbol, ['keeper'], now);
    }
    const tickers = mergeTickers();
    computeStaleSymbols();
    set({
      tickers,
      inconsistentSymbols: _inconsistentSymbols,
      staleSymbols: _staleSymbols,
      symbolPriceUpdatedAt: _symbolPriceUpdatedAt,
      priceSourceUpdatedAt: _priceSourceUpdatedAt,
    });
  },
  setCandlePrices: (candlePrices) => {
    ensurePriceGuardTimer(set);
    _candlePrices = candlePrices
      .map((item) => {
        const symbol = item.symbol || getTokenSymbol(item.tokenAddress);
        if (!symbol) return null;
        const normalizedSymbol =
          getNormalizedTokenSymbolForFetchingPrice(symbol);
        const updatedAt = normalizeCandleUpdatedAt(item.updatedAt);
        markSourceUpdated(normalizedSymbol, 'candle', updatedAt);
        return {
          symbol: normalizedSymbol,
          usdPrice: item.price,
          updatedAt,
        };
      })
      .filter(isTickerItem);
    const tickers = mergeTickers();
    computeStaleSymbols();
    set({
      tickers,
      inconsistentSymbols: _inconsistentSymbols,
      staleSymbols: _staleSymbols,
      priceSourceUpdatedAt: _priceSourceUpdatedAt,
    });
  },
  connect: () => {
    const isGmw391Enabled = getGmw391Enabled();
    shouldReconnect = true;
    // A fresh connect intent (mount, visibility wake, or a scheduled retry)
    // supersedes any pending backoff timer.
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (socket && socket.readyState !== WebSocket.CLOSED) {
      return;
    }

    const firstMessageTracker =
      createWebSocketFirstMessageTracker(SOCKET_SERVER_URL);

    try {
      const currentSocket = new WebSocket(SOCKET_SERVER_URL);
      socket = currentSocket;
      set({ readyState: WebSocket.CONNECTING });

      currentSocket.onopen = () => {
        if (isGmw391Enabled && socket !== currentSocket) return;
        // Connection is healthy again: reset the backoff attempt counter.
        reconnectAttempts = 0;
        if (isGmw391Enabled) {
          socketOpenedAt = Date.now();
          clearSocketHealthTimer();
          socketHealthTimer = setInterval(() => {
            if (
              socket !== currentSocket ||
              currentSocket.readyState !== WebSocket.OPEN
            ) {
              return;
            }
            if (document.visibilityState !== 'visible' || !navigator.onLine) {
              return;
            }
            const lastTickerAt = get().lastSocketTickerAt;
            const freshnessReference = lastTickerAt || socketOpenedAt;
            if (
              Date.now() - freshnessReference >
              MAIN_SOCKET_TICKER_TIMEOUT_MS
            ) {
              console.warn('[mainSocket] ticker stream is stale; reconnecting');
              if (getGmw395Enabled()) {
                get().reconnectImmediately();
              } else {
                get().reconnect();
              }
            }
          }, MAIN_SOCKET_HEALTH_CHECK_INTERVAL_MS);
        }
        ensurePriceGuardTimer(set);
        console.log('WebSocket connected successfully');
        set({ readyState: WebSocket.OPEN, socketDisconnectedAt: 0 });
      };

      currentSocket.onmessage = (event) => {
        firstMessageTracker.firstMessage();
        if (isGmw391Enabled && socket !== currentSocket) return;
        try {
          const message = JSON.parse(event.data);
          useWsLastUpdatedAtStore
            .getState()
            .setWsLastUpdatedAt('mainSocket');
          if (message.type === 'indexTokens') {
            const validSocketIndexTokens = getValidMarket(message.payload);
            const socketIndexTokens = getGmw374Enabled()
              ? validSocketIndexTokens.map(recalculateIndexTokenMaxLeverage)
              : validSocketIndexTokens;
            _socketIndexTokens = socketIndexTokens;
            set({
              indexTokens: mergeIndexTokens(_keeperIndexTokens, socketIndexTokens),
              socketIndexTokensReady: true,
              inconsistentSymbols: _inconsistentSymbols,
            });
          } else if (message.type === 'tickers') {
            _socketTickers = mergeLatestTickers(
              _socketTickers,
              message.payload
            );
            const now = Date.now();
            const updatedAt = new Map<string, number>();
            for (const item of _socketTickers) {
              markSourcesUpdated(item.symbol, ['socket'], now);
              for (const alias of getSymbolAliases(item.symbol)) {
                updatedAt.set(alias, now);
              }
            }
            _symbolPriceUpdatedAt = updatedAt;
            const tickers = mergeTickers();
            computeStaleSymbols();
            set({
              tickers,
              inconsistentSymbols: _inconsistentSymbols,
              staleSymbols: _staleSymbols,
              lastSocketTickerAt: now,
              symbolPriceUpdatedAt: _symbolPriceUpdatedAt,
              priceSourceUpdatedAt: _priceSourceUpdatedAt,
            });
          } else if (message.type === 'storeBalances') {
            set({ storeBalances: message.payload });
          } else if (message.type === 'tokenMints') {
            const payload = message.payload;
            const tokenMints = Array.isArray(payload)
              ? payload
              : Array.isArray(payload?.tokenMints)
                ? payload.tokenMints
                : payload?.pubkey
                  ? [payload]
                  : null;
            if (Array.isArray(tokenMints)) {
              set((state) => {
                const nextTokenMints = { ...state.tokenMints };
                for (const tokenMint of tokenMints) {
                  if (tokenMint?.pubkey) {
                    nextTokenMints[tokenMint.pubkey] = tokenMint;
                  }
                }
                return { tokenMints: nextTokenMints };
              });
            }
          } else if (message.type === 'glvs') {
            const payload = message.payload;
            const glvs = Array.isArray(payload)
              ? payload
              : Array.isArray(payload?.glvs)
                ? payload.glvs
                : payload?.glv
                  ? [payload]
                  : null;
            if (Array.isArray(glvs)) {
              set((state) => {
                const nextGlvAccounts = { ...state.glvAccounts };
                for (const glvAccount of glvs) {
                  if (!glvAccount?.glv) continue;
                  if (glvAccount.removed) {
                    delete nextGlvAccounts[glvAccount.glv];
                  } else {
                    nextGlvAccounts[glvAccount.glv] = glvAccount;
                  }
                }
                return { glvAccounts: nextGlvAccounts };
              });
            }
          } else {
            set({ [message.type]: message.payload });
          }
          if (message.type === 'heartbeat' && message.event === 'pong') {
            console.log('Heartbeat pong received');
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      currentSocket.onclose = () => {
        firstMessageTracker.failed();
        if (isGmw391Enabled && socket !== currentSocket) return;
        clearSocketHealthTimer();
        socketOpenedAt = 0;
        socket = null;
        markSocketDisconnected(set);
        scheduleSocketReconnect(() => get().connect());
      };

      currentSocket.onerror = (error) => {
        firstMessageTracker.failed();
        if (isGmw391Enabled && socket !== currentSocket) return;
        console.error('WebSocket error:', error);
        if (!isGmw391Enabled) {
          socket = null;
          markSocketDisconnected(set);
          scheduleSocketReconnect(() => get().connect());
          return;
        }
        // Closing funnels cleanup and retry through onclose and prevents this
        // failed instance from racing with the replacement connection.
        currentSocket.close();
        // Some browsers do not reliably follow an error with a close event.
        // If that happens, do not leave the store stuck in OPEN indefinitely.
        setTimeout(() => {
          if (socket !== currentSocket) return;
          clearSocketHealthTimer();
          socketOpenedAt = 0;
          socket = null;
          markSocketDisconnected(set);
          scheduleSocketReconnect(() => get().connect());
        }, 0);
      };
    } catch (error) {
      firstMessageTracker.failed();
      console.error('Failed to create WebSocket connection:', error);
      set({ readyState: WebSocket.CLOSED });
      socket = null;
      scheduleSocketReconnect(() => get().connect());
    }
  },
  reconnect: () => {
    if (!shouldReconnect) return;
    const currentSocket = socket;
    if (!currentSocket) {
      get().connect();
      return;
    }
    if (
      currentSocket.readyState === WebSocket.OPEN ||
      currentSocket.readyState === WebSocket.CONNECTING
    ) {
      currentSocket.close();
    } else if (currentSocket.readyState === WebSocket.CLOSED) {
      socket = null;
      get().connect();
    }
  },
  reconnectImmediately: () => {
    if (!shouldReconnect) return;

    // Explicit recovery signals (online, visibility wake, or a stale ticker
    // stream) should not inherit backoff accumulated while the network was
    // unavailable. Failed replacement connections still return to the normal
    // exponential-backoff path through onclose/onerror.
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    reconnectAttempts = 0;
    clearSocketHealthTimer();
    socketOpenedAt = 0;

    const currentSocket = socket;
    socket = null;
    if (
      currentSocket &&
      (currentSocket.readyState === WebSocket.OPEN ||
        currentSocket.readyState === WebSocket.CONNECTING)
    ) {
      currentSocket.close();
    }

    markSocketDisconnected(set);
    get().connect();
  },
  disconnect: () => {
    // Intentional teardown: stop auto-reconnecting and drop any pending retry.
    shouldReconnect = false;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    reconnectAttempts = 0;
    clearSocketHealthTimer();
    socketOpenedAt = 0;
    if (socket) {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onclose = null;
      socket.onerror = null;
      socket.close();
      socket = null;
      clearSocketData(set);
    }
  },
}));

function getValidMarket(indexTokens: IndexTokenItem[]): IndexTokenItem[] {
  const gmxMarketTokenSet = new Set(
    GMX_SOLANA_MARKET_TOKENS.map((pk) => pk.toBase58())
  );
  const validIndexTokens: any[] = [];
  indexTokens.forEach((item) => {
    const markets = item.marketInfos.filter((marketInfo) =>
      gmxMarketTokenSet.has(marketInfo.marketToken)
    );
    if (markets.length > 0) {
      item.marketInfos = markets;
      validIndexTokens.push(item);
    }
  });
  return validIndexTokens;
}

export default useSocketStore;
