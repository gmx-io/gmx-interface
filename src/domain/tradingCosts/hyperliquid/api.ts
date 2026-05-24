import { numberToUsd } from "../costs";
import type {
  HyperliquidL2BookResponse,
  HyperliquidMetaAndAssetCtxsResponse,
  HyperliquidNormalizedMarket,
} from "./types";

const HYPERLIQUID_INFO_URL = "https://api.hyperliquid.xyz/info";

async function postHyperliquidInfo<T>(body: Record<string, string>): Promise<T> {
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

export async function fetchHyperliquidL2Book(coin: string): Promise<HyperliquidL2BookResponse> {
  return postHyperliquidInfo<HyperliquidL2BookResponse>({ type: "l2Book", coin });
}

export async function fetchHyperliquidL2Books(
  coins: string[]
): Promise<Record<string, HyperliquidL2BookResponse | Error>> {
  const entries = await Promise.all(
    coins.map(async (coin) => {
      try {
        return [coin, await fetchHyperliquidL2Book(coin)] as const;
      } catch (error) {
        return [coin, error instanceof Error ? error : new Error(String(error))] as const;
      }
    })
  );

  return Object.fromEntries(entries);
}
