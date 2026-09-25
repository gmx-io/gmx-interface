import { useSyncExternalStore } from "react";

import { createGmxSolanaWebSocketClient } from "lib/gmxSolanaRequest";

import { GMX_SOLANA_TOKENS } from "../config/solanaProgram";
import { solanaPriceSymbol } from "../wallet/solanaWalletSession";

/** Market summary from the GMTrade backend `indexTokens` feed. Addresses are base58 strings. */
export type SolanaMarketInfo = {
  marketToken: string;
  indexToken: string;
  longToken: string;
  shortToken: string;
  /** Market token total supply as an integer string. Needed by the SDK market model. */
  supply: string;
  /**
   * Current fee rates as a fraction per hour × 1e20, signed from the position's point of view
   * (negative = the position pays). Absent when the feed omits them.
   */
  longFundingFeeRateHour?: bigint;
  longBorrowingFeeRateHour?: bigint;
  shortFundingFeeRateHour?: bigint;
  shortBorrowingFeeRateHour?: bigint;
  /** Maintenance margin factor per side, fraction × 1e20. */
  minCollateralFactorForLong?: bigint;
  minCollateralFactorForShort?: bigint;
};

/** Ticker from the GMTrade backend `tickers` feed. All values are integers scaled by 1e20. */
export type SolanaTicker = {
  symbol: string;
  /** Whole-token USD price × 1e20. */
  price?: bigint;
  /** Mid price per smallest token unit × 1e20. */
  unitPrice?: bigint;
  /** Price per smallest token unit × 1e20. These feed the SDK `status()` call. */
  minUnitPrice: bigint;
  maxUnitPrice: bigint;
};

export type SolanaMarketSocketStatus = "idle" | "connecting" | "ready" | "error";

export type SolanaMarketSocketState = {
  status: SolanaMarketSocketStatus;
  error: string | null;
  /** Keyed by market token mint. Empty until the first `indexTokens` message arrives. */
  marketInfoByToken: ReadonlyMap<string, SolanaMarketInfo>;
  /** Keyed by token mint (every mint in GMX_SOLANA_TOKENS sharing the ticker symbol). */
  tokenPriceByMint: ReadonlyMap<string, SolanaTicker>;
};

const INITIAL_STATE: SolanaMarketSocketState = {
  status: "idle",
  error: null,
  marketInfoByToken: new Map(),
  tokenPriceByMint: new Map(),
};

let state = INITIAL_STATE;
const listeners = new Set<() => void>();
let users = 0;
let client: { destroy: () => void; send: (data: string) => void } | undefined;
let tickersBySymbol = new Map<string, SolanaTicker>();

function emit(next: SolanaMarketSocketState) {
  state = next;
  listeners.forEach((listener) => listener());
}

function patch(partial: Partial<SolanaMarketSocketState>) {
  emit({ ...state, ...partial });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

export function toBigIntOrUndefined(value: unknown): bigint | undefined {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return Number.isSafeInteger(value) ? BigInt(value) : undefined;
  if (typeof value === "string" && /^\d+$/.test(value)) return BigInt(value);
  return undefined;
}

/** Like `toBigIntOrUndefined` but also accepts negative integers (fee rates are signed). */
export function toSignedBigIntOrUndefined(value: unknown): bigint | undefined {
  if (typeof value === "string" && /^-?\d+$/.test(value)) return BigInt(value);
  return toBigIntOrUndefined(value);
}

const MARKET_OPTIONAL_BIGINT_KEYS = [
  "longFundingFeeRateHour",
  "longBorrowingFeeRateHour",
  "shortFundingFeeRateHour",
  "shortBorrowingFeeRateHour",
  "minCollateralFactorForLong",
  "minCollateralFactorForShort",
] as const;

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value ? value : undefined;
}

/** Flattens `payload[].marketInfos` into market infos. Entries missing any token address are skipped. */
export function parseIndexTokensPayload(payload: unknown): SolanaMarketInfo[] {
  if (!Array.isArray(payload)) return [];
  const result: SolanaMarketInfo[] = [];
  for (const item of payload) {
    if (!item || typeof item !== "object") continue;
    const marketInfos = (item as { marketInfos?: unknown }).marketInfos;
    if (!Array.isArray(marketInfos)) continue;
    for (const info of marketInfos) {
      if (!info || typeof info !== "object") continue;
      const record = info as Record<string, unknown>;
      const marketToken = readString(record, "marketToken");
      const indexToken = readString(record, "indexToken");
      const longToken = readString(record, "longToken");
      const shortToken = readString(record, "shortToken");
      const supply = toBigIntOrUndefined(record.supply);
      if (!marketToken || !indexToken || !longToken || !shortToken || supply === undefined) continue;
      const marketInfo: SolanaMarketInfo = {
        marketToken,
        indexToken,
        longToken,
        shortToken,
        supply: supply.toString(),
      };
      for (const key of MARKET_OPTIONAL_BIGINT_KEYS) {
        const value = toSignedBigIntOrUndefined(record[key]);
        if (value !== undefined) marketInfo[key] = value;
      }
      result.push(marketInfo);
    }
  }
  return result;
}

/** Parses `tickers` payload entries. Entries without a positive min/max unit price are skipped. */
export function parseTickersPayload(payload: unknown): SolanaTicker[] {
  if (!Array.isArray(payload)) return [];
  const result: SolanaTicker[] = [];
  for (const item of payload) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const symbol = readString(record, "symbol");
    const minUnitPrice = toBigIntOrUndefined(record.minUnitPrice);
    const maxUnitPrice = toBigIntOrUndefined(record.maxUnitPrice);
    if (!symbol || minUnitPrice === undefined || maxUnitPrice === undefined) continue;
    if (minUnitPrice <= 0n || maxUnitPrice <= 0n) continue;
    const price = toBigIntOrUndefined(record.price);
    const unitPrice = toBigIntOrUndefined(record.unitPrice);
    result.push({
      symbol,
      price: price && price > 0n ? price : undefined,
      unitPrice: unitPrice && unitPrice > 0n ? unitPrice : undefined,
      minUnitPrice,
      maxUnitPrice,
    });
  }
  return result;
}

/** Tickers arrive incrementally: merge the latest per symbol. */
export function mergeTickers(
  current: ReadonlyMap<string, SolanaTicker>,
  incoming: SolanaTicker[]
): Map<string, SolanaTicker> {
  const next = new Map(current);
  for (const ticker of incoming) next.set(ticker.symbol, ticker);
  return next;
}

/** Maps tickers (keyed by symbol) onto every configured mint whose normalized symbol matches. */
export function mapTickersToMints(
  tickers: ReadonlyMap<string, SolanaTicker>,
  tokens: Record<string, { symbol: string }> = GMX_SOLANA_TOKENS
): Map<string, SolanaTicker> {
  const result = new Map<string, SolanaTicker>();
  for (const [mint, config] of Object.entries(tokens)) {
    const ticker = tickers.get(solanaPriceSymbol(config.symbol));
    if (ticker) result.set(mint, ticker);
  }
  return result;
}

function onSocketMessage(data: unknown) {
  let message: unknown;
  try {
    message = JSON.parse(String(data));
  } catch {
    return;
  }
  if (!message || typeof message !== "object") return;
  const { type, payload } = message as { type?: unknown; payload?: unknown };

  if (type === "indexTokens") {
    const infos = parseIndexTokensPayload(payload);
    if (infos.length === 0) return;
    patch({
      status: "ready",
      error: null,
      marketInfoByToken: new Map(infos.map((info) => [info.marketToken, info])),
    });
    return;
  }

  if (type === "tickers") {
    const incoming = parseTickersPayload(payload);
    if (incoming.length === 0) return;
    tickersBySymbol = mergeTickers(tickersBySymbol, incoming);
    patch({ tokenPriceByMint: mapTickersToMints(tickersBySymbol) });
  }
}

function open() {
  patch({ status: "connecting", error: null });
  const socket = createGmxSolanaWebSocketClient({
    onOpen() {
      socket.send(JSON.stringify({ subscribe: "indexTokens" }));
      socket.send(JSON.stringify({ subscribe: "tickers" }));
    },
    onMessage(event) {
      onSocketMessage(event.data);
    },
    onError(error) {
      if (state.status !== "ready") patch({ status: "error", error: error.message });
    },
  });
  client = socket;
  socket.connect();
}

/** Keeps one app-wide backend socket open while at least one consumer is mounted. */
export function retainSolanaMarketSocket() {
  users += 1;
  if (!client) open();
  return () => {
    users -= 1;
    if (users > 0) return;
    client?.destroy();
    client = undefined;
    tickersBySymbol = new Map();
    emit(INITIAL_STATE);
  };
}

export function useSolanaMarketSocketState() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
