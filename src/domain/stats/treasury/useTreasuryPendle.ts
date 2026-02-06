import { useMemo } from "react";
import useSWR from "swr";

import { USD_DECIMALS } from "config/factors";
import type { TokenPricesData } from "domain/synthetics/tokens";
import { ARBITRUM, type ContractsChainId } from "sdk/configs/chains";
import { expandDecimals } from "sdk/utils/numbers";
import { convertToUsd, getMidPrice } from "sdk/utils/tokens";
import type { Token } from "sdk/utils/tokens/types";

import { TREASURY_EMPTY_RESULT } from "./constants";
import type { TreasuryBalanceAsset, TreasuryData } from "./types";

const PENDLE_API_URL = "https://api-v2.pendle.finance/core/v1/dashboard/positions/database";
const SUPPORTED_CHAIN_ID = ARBITRUM;
const MICRO_DECIMALS = 6;
const USD_MICRO_MULTIPLIER = expandDecimals(1, USD_DECIMALS - MICRO_DECIMALS);

export function useTreasuryPendle({
  chainId,
  addresses,
  tokenMap,
  pricesData,
}: {
  chainId: ContractsChainId;
  addresses: string[];
  tokenMap: Record<string, Token>;
  pricesData?: TokenPricesData;
}): TreasuryData | undefined {
  const shouldFetch = chainId === SUPPORTED_CHAIN_ID && addresses.length > 0;

  const { data } = useSWR(shouldFetch ? ["useTreasuryPendle", chainId, addresses.join("-")] : null, () =>
    fetchPendlePositions(addresses)
  );

  return useMemo(() => {
    if (!shouldFetch) {
      return TREASURY_EMPTY_RESULT;
    }

    if (!data) {
      return undefined;
    }

    const assets: TreasuryBalanceAsset[] = [];
    let totalUsd = 0n;

    data.forEach(({ positions }) => {
      positions.forEach((position) => {
        if (position.chainId !== SUPPORTED_CHAIN_ID) {
          return;
        }

        position.openPositions?.forEach((openPosition) => {
          totalUsd += addComponentAsset({
            assets,
            componentKey: `${openPosition.marketId}-lp`,
            valuation: openPosition.lp?.valuation,
            chainId,
          });

          totalUsd += addComponentAsset({
            assets,
            componentKey: `${openPosition.marketId}-pt`,
            valuation: openPosition.pt?.valuation,
            chainId,
          });

          totalUsd += addComponentAsset({
            assets,
            componentKey: `${openPosition.marketId}-yt`,
            valuation: openPosition.yt?.valuation,
            chainId,
          });

          totalUsd += processClaimTokens({
            assets,
            claimTokenAmounts: openPosition.lp?.claimTokenAmounts,
            chainId,
            tokenMap,
            pricesData,
          });

          totalUsd += processClaimTokens({
            assets,
            claimTokenAmounts: openPosition.yt?.claimTokenAmounts,
            chainId,
            tokenMap,
            pricesData,
          });
        });
      });
    });

    return { assets, totalUsd };
  }, [chainId, data, pricesData, shouldFetch, tokenMap]);
}

async function fetchPendlePositions(addresses: string[]) {
  const responses = await Promise.all(
    addresses.map(async (address) => {
      try {
        const res = await fetch(`${PENDLE_API_URL}/${address}`);

        if (!res.ok) {
          throw new Error(`Failed to fetch Pendle positions for ${address}`);
        }

        const json = (await res.json()) as PendlePositionsResponse;
        return json;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("pendle fetch error", address, error);

        return { positions: [] };
      }
    })
  );

  return responses;
}

function addComponentAsset({
  assets,
  componentKey,
  valuation,
  chainId,
}: {
  assets: TreasuryBalanceAsset[];
  componentKey: string;
  valuation?: number;
  chainId: ContractsChainId;
}) {
  const usdValue = numberToUsdBigInt(valuation);

  if (usdValue === 0n) {
    return 0n;
  }

  assets.push({
    address: componentKey,
    type: "pendle",
    balance: usdValue,
    usdValue,
    chainId,
    decimals: USD_DECIMALS,
  });

  return usdValue;
}

function processClaimTokens({
  assets,
  claimTokenAmounts,
  chainId,
  tokenMap,
  pricesData,
}: {
  assets: TreasuryBalanceAsset[];
  claimTokenAmounts?: PendleClaimToken[];
  chainId: ContractsChainId;
  tokenMap: Record<string, Token>;
  pricesData?: TokenPricesData;
}): bigint {
  if (!claimTokenAmounts?.length) {
    return 0n;
  }

  let total = 0n;

  claimTokenAmounts.forEach((claim) => {
    const [, tokenAddressRaw] = claim.token.split("-");

    if (!tokenAddressRaw) {
      return;
    }

    const token = tokenMap[tokenAddressRaw];
    const tokenPrices = pricesData?.[tokenAddressRaw];

    if (!token || !tokenPrices) {
      return;
    }

    const amount = BigInt(claim.amount);
    const usdValue = convertToUsd(amount, token.decimals, getMidPrice(tokenPrices));

    if (typeof usdValue !== "bigint" || usdValue === 0n) {
      return;
    }

    assets.push({
      address: `${claim.token}-rewards`,
      type: "pendle",
      balance: amount,
      usdValue,
      chainId,
      token,
      decimals: token.decimals,
    });

    total += usdValue;
  });

  return total;
}

function numberToUsdBigInt(value?: number) {
  if (!value || !Number.isFinite(value)) {
    return 0n;
  }

  const micro = Math.round(value * 10 ** MICRO_DECIMALS);

  return BigInt(micro) * USD_MICRO_MULTIPLIER;
}

type PendleClaimToken = {
  token: string;
  amount: string;
};

type PendleComponent = {
  valuation?: number;
  balance?: string;
  claimTokenAmounts?: PendleClaimToken[];
};

type PendleOpenPosition = {
  marketId: string;
  pt?: PendleComponent;
  yt?: PendleComponent;
  lp?: PendleComponent;
};

type PendleAddressPositions = {
  chainId: number;
  openPositions: PendleOpenPosition[];
};

type PendlePositionsResponse = {
  positions: PendleAddressPositions[];
};
