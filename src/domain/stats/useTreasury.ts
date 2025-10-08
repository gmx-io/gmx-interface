import { useMemo } from "react";

import { useTokenRecentPricesRequest, useTokensDataRequest } from "domain/synthetics/tokens";
import type { ContractsChainId, SourceChainId } from "sdk/configs/chains";
import { getTokensMap } from "sdk/configs/tokens";

import type { TreasuryData } from "./treasuryTypes";
import { useTreasuryUniswapV3 } from "./uniswapV3/useTreasuryUniswapV3";
import { useTreasuryGlv } from "./utils/useTreasuryGlv";
import { useTreasuryGm } from "./utils/useTreasuryGm";
import { useTreasuryTokens } from "./utils/useTreasuryTokens";

export type { TreasuryData } from "./treasuryTypes";

const TREASURY_ADDRESSES = [
  "0x4bd1cdaab4254fc43ef6424653ca2375b4c94c0e",
  "0xc6378ddf536410c14666dc59bc92b5ebc0f2f79e",
  "0x0263ad94023a5df6d64f54bfef089f1fbf8a4ca0",
  "0xea8a734db4c7ea50c32b5db8a0cb811707e8ace3",
  "0xe1f7c5209938780625e354dc546e28397f6ce174",
  "0x68863dde14303bced249ca8ec6af85d4694dea6a",
  "0x0339740d92fb8baf73bab0e9eb9494bc0df1cafd",
  "0x2c247a44928d66041d9f7b11a69d7a84d25207ba",
];

export function useTreasury(chainId: ContractsChainId, _sourceChainId?: SourceChainId): TreasuryData {
  const addresses = TREASURY_ADDRESSES;
  const addressesCount = addresses.length;

  const tokenMap = useMemo(() => getTokensMap(chainId), [chainId]);

  const { tokensData } = useTokensDataRequest(chainId);
  const { pricesData } = useTokenRecentPricesRequest(chainId);

  const tokenResult = useTreasuryTokens({
    chainId,
    addresses,
    addressesCount,
    tokenMap,
    pricesData,
  });

  const gmResult = useTreasuryGm({
    chainId,
    addresses,
    addressesCount,
    tokensData,
  });

  const glvResult = useTreasuryGlv({
    chainId,
    addresses,
    addressesCount,
    tokensData,
    tokenMap,
  });

  const uniswapV3Result = useTreasuryUniswapV3({
    chainId,
    addresses,
    tokenMap,
    pricesData,
  });

  return useMemo(() => {
    const entries = [...tokenResult.entries, ...gmResult.entries, ...glvResult.entries, ...uniswapV3Result.entries];

    if (!entries.length) {
      return undefined;
    }

    const totalUsd = tokenResult.totalUsd + gmResult.totalUsd + glvResult.totalUsd + uniswapV3Result.totalUsd;

    return {
      tokens: entries,
      totalUsd,
    };
  }, [glvResult, gmResult, tokenResult, uniswapV3Result]);
}
