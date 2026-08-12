import { numberToUsd } from "../costs";
import type {
  HyperliquidBookBundle,
  HyperliquidBookPrecisionKey,
  HyperliquidL2BookResponse,
  HyperliquidMetaAndAssetCtxsResponse,
  HyperliquidNormalizedMarket,
} from "./types";

const HYPERLIQUID_INFO_URL = "https://api.hyperliquid.xyz/info";

type HyperliquidBookAggregation = {
  nSigFigs?: 3 | 4 | 5;
  mantissa?: 5;
};

const HYPERLIQUID_BOOK_PRECISION_LEVELS: {
  key: HyperliquidBookPrecisionKey;
  label: string;
  aggregation?: HyperliquidBookAggregation;
}[] = [
  { key: "default", label: "default 20-level book" },
  { key: "5SigFigsMantissa5", label: "5 significant figures, mantissa 5", aggregation: { nSigFigs: 5, mantissa: 5 } },
  { key: "4SigFigs", label: "4 significant figures", aggregation: { nSigFigs: 4 } },
  { key: "3SigFigs", label: "3 significant figures", aggregation: { nSigFigs: 3 } },
];

async function postHyperliquidInfo<T>(body: Record<string, string | number>): Promise<T> {
  const response = await fetch(HYPERLIQUID_INFO_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Hyperliquid info request failed: ${response.status}`);
  }

  return response.json();
}

function parseOptionalNumber(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function normalizeHyperliquidMarkets(
  response: HyperliquidMetaAndAssetCtxsResponse,
  timestamp: number
): HyperliquidNormalizedMarket[] {
  const [meta, contexts] = response;

  return meta.universe.flatMap((asset, index) => {
    const ctx = contexts[index];

    if (!ctx || asset.isDelisted) {
      return [];
    }

    const volume = parseOptionalNumber(ctx.dayNtlVlm);

    return {
      symbol: asset.name,
      displayName: asset.name,
      isDisabled: false,
      volume24hUsd: volume === undefined ? undefined : numberToUsd(volume),
      markPrice: parseOptionalNumber(ctx.markPx),
      midPrice: parseOptionalNumber(ctx.midPx),
      hourlyFundingRate: parseOptionalNumber(ctx.funding),
      timestamp,
    };
  });
}

export async function fetchHyperliquidMetaAndAssetCtxs(): Promise<HyperliquidNormalizedMarket[]> {
  const timestamp = Date.now();
  const response = await postHyperliquidInfo<HyperliquidMetaAndAssetCtxsResponse>({ type: "metaAndAssetCtxs" });
  return normalizeHyperliquidMarkets(response, timestamp);
}

export async function fetchHyperliquidL2Book(
  coin: string,
  aggregation?: HyperliquidBookAggregation
): Promise<HyperliquidL2BookResponse> {
  return postHyperliquidInfo<HyperliquidL2BookResponse>({ type: "l2Book", coin, ...aggregation });
}

async function fetchHyperliquidL2BookSafely(
  coin: string,
  aggregation?: HyperliquidBookAggregation
): Promise<HyperliquidL2BookResponse | Error> {
  try {
    return await fetchHyperliquidL2Book(coin, aggregation);
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error));
  }
}

export async function fetchHyperliquidL2Books(coins: string[]): Promise<Record<string, HyperliquidBookBundle>> {
  const entries = await Promise.all(
    coins.map(async (coin) => {
      const books = await Promise.all(
        HYPERLIQUID_BOOK_PRECISION_LEVELS.map(async (precision) => ({
          key: precision.key,
          label: precision.label,
          book: await fetchHyperliquidL2BookSafely(coin, precision.aggregation),
        }))
      );

      return [coin, books] as const;
    })
  );

  return Object.fromEntries(entries);
}
