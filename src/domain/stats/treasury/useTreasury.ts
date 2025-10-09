import { useMemo } from "react";

import { useMarkets } from "domain/synthetics/markets/useMarkets";
import { useTokenRecentPricesRequest, useTokensDataRequest } from "domain/synthetics/tokens";
import type { ContractsChainId, SourceChainId } from "sdk/configs/chains";
import { getTokensMap } from "sdk/configs/tokens";

import type { TreasuryData } from "./types";
import { useTreasuryGlv } from "./useTreasuryGlv";
import { useTreasuryGm } from "./useTreasuryGm";
import { useTreasuryPendle } from "./useTreasuryPendle";
import { useTreasuryTokens } from "./useTreasuryTokens";
import { useTreasuryUniswapV3 } from "./useTreasuryUniswapV3";
import { useTreasuryVenus } from "./useTreasuryVenus";

export type { TreasuryData } from "./types";

const TREASURY_ADDRESSES: {
  address: string;
  hasVenus?: boolean;
  hasPendle?: boolean;
}[] = [
  { address: "0x4bd1cdaab4254fc43ef6424653ca2375b4c94c0e" },
  { address: "0xc6378ddf536410c14666dc59bc92b5ebc0f2f79e" },
  { address: "0x0263ad94023a5df6d64f54bfef089f1fbf8a4ca0" },
  { address: "0xea8a734db4c7ea50c32b5db8a0cb811707e8ace3" },
  { address: "0xe1f7c5209938780625e354dc546e28397f6ce174", hasVenus: true, hasPendle: true },
  { address: "0x68863dde14303bced249ca8ec6af85d4694dea6a" },
  { address: "0x0339740d92fb8baf73bab0e9eb9494bc0df1cafd" },
  { address: "0x2c247a44928d66041d9f7b11a69d7a84d25207ba" },
  { address: "0x0a2962120b11A4a36700C5De00D4980E58a2D1C0" },
  { address: "0xe57fE47902A35Bc0d82C83e39610Af546E1D18B9" },
];

const addresses = TREASURY_ADDRESSES.map((item) => item.address);
const venusAddresses = TREASURY_ADDRESSES.filter((item) => item.hasVenus).map((item) => item.address);
const pendleAddresses = TREASURY_ADDRESSES.filter((item) => item.hasPendle).map((item) => item.address);

export function useTreasury(chainId: ContractsChainId, _sourceChainId?: SourceChainId): TreasuryData {
  const tokenMap = useMemo(() => getTokensMap(chainId), [chainId]);

  const { tokensData } = useTokensDataRequest(chainId);
  const { pricesData } = useTokenRecentPricesRequest(chainId);
  const { marketsData, marketsAddresses } = useMarkets(chainId);

  const tokenResult = useTreasuryTokens({
    chainId,
    addresses,
    tokenMap,
    pricesData,
  });

  const gmResult = useTreasuryGm({
    chainId,
    addresses,
    tokensData,
    marketsData,
    marketsAddresses,
  });

  const glvResult = useTreasuryGlv({
    chainId,
    addresses,
    tokensData,
    marketsData,
  });

  const uniswapV3Result = useTreasuryUniswapV3({
    chainId,
    addresses,
    tokenMap,
    pricesData,
  });

  const venusResult = useTreasuryVenus({
    chainId,
    addresses: venusAddresses,
    tokenMap,
    pricesData,
    tokensData,
    marketsData,
  });

  const pendleResult = useTreasuryPendle({
    chainId,
    addresses: pendleAddresses,
    tokenMap,
    pricesData,
  });

  return useMemo(() => {
    if (!tokenResult || !gmResult || !glvResult || !uniswapV3Result) {
      return undefined;
    }

    const assets = [
      ...tokenResult.assets,
      ...gmResult.assets,
      ...glvResult.assets,
      ...uniswapV3Result.assets,
      ...(venusResult?.assets ?? []),
      ...(pendleResult?.assets ?? []),
    ];

    const totalUsd =
      tokenResult.totalUsd +
      gmResult.totalUsd +
      glvResult.totalUsd +
      uniswapV3Result.totalUsd +
      (venusResult?.totalUsd ?? 0n) +
      (pendleResult?.totalUsd ?? 0n);

    return {
      assets,
      totalUsd,
    };
  }, [glvResult, gmResult, pendleResult, tokenResult, uniswapV3Result, venusResult]);
}
