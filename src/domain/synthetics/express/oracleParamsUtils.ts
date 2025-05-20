import uniqBy from "lodash/uniqBy";
import { encodeAbiParameters, toHex } from "viem";

import { getContract } from "config/contracts";
import { MarketsInfoData } from "domain/synthetics/markets/types";
import type { UiContractsChain } from "sdk/configs/chains";
import { convertTokenAddress } from "sdk/configs/tokens";
import { TokenData, TokensData } from "sdk/types/tokens";
import { getOppositeCollateral } from "sdk/utils/markets";
import { getByKey } from "sdk/utils/objects";

import { OracleParamsPayload, RelayerFeeParams } from "./types";

export type OraclePriceParam = {
  tokenAddress: string;
  priceProvider: string;
  data: string;
};

export function getOracleParamsPayload(priceParams: OraclePriceParam[]): OracleParamsPayload {
  const uniqueTokens = uniqBy(priceParams, "tokenAddress");

  return {
    tokens: uniqueTokens.map((t) => t.tokenAddress),
    providers: uniqueTokens.map((t) => t.priceProvider),
    data: uniqueTokens.map((t) => t.data),
  };
}

export function getOraclePriceParamsForRelayFee({
  chainId,
  relayFeeParams,
  tokensData,
  marketsInfoData,
}: {
  chainId: UiContractsChain;
  relayFeeParams: RelayerFeeParams;
  tokensData: TokensData;
  marketsInfoData: MarketsInfoData;
}): OraclePriceParam[] {
  const swapTokens: TokenData[] = [];

  if (relayFeeParams?.externalCalls.sendTokens.length) {
    const tokenAddresses = [...relayFeeParams.externalCalls.sendTokens, relayFeeParams.feeParams.feeToken];

    for (const tokenAddress of tokenAddresses) {
      const token = getByKey(tokensData, tokenAddress);

      if (!token) {
        throw new Error(`Token not found for oracle params: ${tokenAddress}`);
      }

      swapTokens.push(token);
    }
  }

  if (relayFeeParams?.feeParams.feeSwapPath.length) {
    const swapPathTokens =
      getSwapPathOracleTokens({
        tokensData,
        marketsInfoData,
        initialCollateralAddress: relayFeeParams.feeParams.feeToken,
        swapPath: relayFeeParams.feeParams.feeSwapPath,
      }) ?? [];

    swapTokens.push(...swapPathTokens);
  }

  return swapTokens.map((t) => ({
    tokenAddress: convertTokenAddress(chainId, t.address, "wrapped"),
    priceProvider: getContract(chainId, "ChainlinkPriceFeedProvider"),
    data: encodeAbiParameters(
      [
        {
          name: "something",
          type: "bytes32[]",
        },
        {
          name: "report",
          type: "bytes",
        },
      ],
      [
        [toHex(0, { size: 32 }), toHex(0, { size: 32 }), toHex(0, { size: 32 })],
        "0x0001000000000000000000000000000000000000000000000000000000000000",
      ]
    ),
  }));
}

export function getSwapPathOracleTokens({
  marketsInfoData,
  tokensData,
  initialCollateralAddress,
  swapPath,
}: {
  marketsInfoData: MarketsInfoData;
  tokensData: TokensData;
  initialCollateralAddress: string;
  swapPath: string[];
}): TokenData[] | undefined {
  let currentToken = getByKey(tokensData, initialCollateralAddress);

  if (!currentToken) {
    throw new Error(`Token not found for oracle params: ${initialCollateralAddress}`);
  }

  const tokens: TokenData[] = [currentToken];

  for (const marketAddress of swapPath) {
    const marketInfo = getByKey(marketsInfoData, marketAddress);

    if (!marketInfo) {
      return undefined;
    }

    const tokenOut = getOppositeCollateral(marketInfo, currentToken?.address);

    currentToken = tokenOut;

    if (!currentToken) {
      throw new Error(`Token not found for oracle params: ${initialCollateralAddress}`);
    }

    tokens.push(currentToken, marketInfo.indexToken);
  }

  return tokens;
}
