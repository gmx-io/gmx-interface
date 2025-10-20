import uniq from "lodash/uniq";

import { ContractsChainId } from "config/chains";
import { getContract } from "config/contracts";
import { MARKETS } from "sdk/configs/markets";
import { convertTokenAddress } from "sdk/configs/tokens";
import { getOppositeCollateralFromConfig } from "sdk/utils/markets";
import { ExternalCallsPayload } from "sdk/utils/orderTransactions";

export function getOracleParams({ chainId, tokenAddresses }: { chainId: ContractsChainId; tokenAddresses: string[] }) {
  const uniqTokenAddresses = uniq(
    tokenAddresses.map((tokenAddress) => convertTokenAddress(chainId, tokenAddress, "wrapped"))
  );
  const chainLinkPriceFeedProvider = getContract(chainId, "ChainlinkPriceFeedProvider");

  return {
    tokens: uniqTokenAddresses,
    providers: Array(uniqTokenAddresses.length).fill(chainLinkPriceFeedProvider),
    data: Array(uniqTokenAddresses.length).fill("0x"),
  };
}

export function getOracleParamsForRelayParams({
  chainId,
  gasPaymentTokenAddress,
  relayerFeeTokenAddress,
  feeSwapPath,
  externalCalls,
  // marketsInfoData,
}: {
  chainId: ContractsChainId;
  gasPaymentTokenAddress: string;
  relayerFeeTokenAddress: string;
  feeSwapPath: string[];
  externalCalls: ExternalCallsPayload | undefined;
  // marketsInfoData: MarketsInfoData;
}) {
  const tokenAddresses = [gasPaymentTokenAddress, relayerFeeTokenAddress];

  if (externalCalls) {
    tokenAddresses.push(...externalCalls.sendTokens);
  }

  if (feeSwapPath.length) {
    tokenAddresses.push(
      ...getSwapPathOracleTokens({
        chainId,
        // marketsInfoData,
        initialCollateralAddress: gasPaymentTokenAddress,
        swapPath: feeSwapPath,
      })
    );
  }

  return getOracleParams({ chainId, tokenAddresses });
}

export function getSwapPathOracleTokens({
  chainId,
  // marketsInfoData,
  initialCollateralAddress,
  swapPath,
}: {
  chainId: ContractsChainId;
  // TODO MLTCH: why is it a heavy MarketsInfoData when it could be static MarketConfig
  // marketsInfoData: MarketsInfoData;
  initialCollateralAddress: string;
  swapPath: string[];
}): string[] {
  let currentToken = initialCollateralAddress;
  const tokenAddresses: string[] = [initialCollateralAddress];

  for (const marketAddress of swapPath) {
    // const marketInfo = getByKey(marketsInfoData, marketAddress);
    const marketConfig = MARKETS[chainId]?.[marketAddress];

    if (!marketConfig) {
      throw new Error(`Market not found for oracle params: ${marketAddress}`);
    }

    // const tokenOut = getOppositeCollateral(marketInfo, currentToken);
    const tokenOut = getOppositeCollateralFromConfig(marketConfig, currentToken);

    // if (!tokenOut?.address) {
    //   throw new Error(`Token not found for oracle params: ${initialCollateralAddress}`);
    // }

    currentToken = tokenOut;
    tokenAddresses.push(currentToken, marketConfig.indexTokenAddress);
  }

  return tokenAddresses;
}
