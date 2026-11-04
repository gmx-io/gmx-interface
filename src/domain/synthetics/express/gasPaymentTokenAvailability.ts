import { type Address, isAddressEqual } from "viem";

import { getContract } from "config/contracts";
import { getIsSwapPathFillable } from "domain/synthetics/usdgPools/usdcConversion";
import type { TokensData } from "domain/tokens";
import { expandDecimals, USD_DECIMALS } from "lib/numbers";
import { getByKey } from "lib/objects";
import { getPublicClientWithRpc } from "lib/wallets/walletConfig";
import { abis } from "sdk/abis";
import type { ContractsChainId } from "sdk/configs/chains";
import { getGasPaymentTokens, getRelayerFeeToken } from "sdk/configs/express";
import { getOracleParamsForRelayParams } from "sdk/utils/express";
import type { FindSwapPath } from "sdk/utils/trade/types";

export type GasPaymentTokenUnavailableReason = "feeSwap" | "price" | "paused";

export type GasPaymentTokensOnchainState = {
  // the relay fee swap reverts when it can't read one of these prices, e.g. a Chainlink feed past its heartbeat
  unpricedTokenAddresses: string[];
  pausedTokenAddresses: string[];
};

// well above any relay fee, so a route that can't swap it can't swap the real fee either
const FEE_SWAP_CHECK_USD = expandDecimals(10, USD_DECIMALS);

export async function fetchGasPaymentTokensOnchainState(
  chainId: ContractsChainId
): Promise<GasPaymentTokensOnchainState> {
  const tokenAddresses = getGasPaymentTokens(chainId) as Address[];
  const priceFeedProvider = getContract(chainId, "ChainlinkPriceFeedProvider") as Address;

  const results = await getPublicClientWithRpc(chainId).multicall({
    allowFailure: true,
    contracts: tokenAddresses.flatMap((tokenAddress) => [
      {
        address: priceFeedProvider,
        abi: abis.ChainlinkPriceFeedProvider,
        functionName: "getOraclePrice",
        args: [tokenAddress, "0x"],
      } as const,
      { address: tokenAddress, abi: abis.Pausable, functionName: "paused" } as const,
    ]),
  });

  return {
    unpricedTokenAddresses: tokenAddresses.filter((_, index) => results[index * 2].status === "failure"),
    // tokens without paused() can't be paused
    pausedTokenAddresses: tokenAddresses.filter((_, index) => results[index * 2 + 1].result === true),
  };
}

export function getGasPaymentTokenUnavailableReason({
  chainId,
  tokenAddress,
  findFeeSwapPath,
  onchainState,
}: {
  chainId: ContractsChainId;
  tokenAddress: string;
  findFeeSwapPath: FindSwapPath;
  onchainState: GasPaymentTokensOnchainState | undefined;
}): GasPaymentTokenUnavailableReason | undefined {
  if (onchainState?.pausedTokenAddresses.includes(tokenAddress)) {
    return "paused";
  }

  const relayerFeeTokenAddress = getRelayerFeeToken(chainId).address;
  let feeSwapPath: string[] = [];

  if (tokenAddress !== relayerFeeTokenAddress) {
    const feeSwapPathStats = findFeeSwapPath(FEE_SWAP_CHECK_USD, { order: ["length"] });

    if (feeSwapPathStats === undefined || !getIsSwapPathFillable(feeSwapPathStats)) {
      return "feeSwap";
    }

    feeSwapPath = feeSwapPathStats.swapPath;
  }

  const { tokens: oracleTokenAddresses } = getOracleParamsForRelayParams({
    chainId,
    gasPaymentTokenAddress: tokenAddress,
    relayerFeeTokenAddress,
    feeSwapPath,
  });

  const isUnpriced = oracleTokenAddresses.some((oracleTokenAddress) =>
    onchainState?.unpricedTokenAddresses.some((address) =>
      isAddressEqual(address as Address, oracleTokenAddress as Address)
    )
  );

  return isUnpriced ? "price" : undefined;
}

/**
 * The saved token, or when it can't pay right now, the first listed token that can and has a balance.
 * Nothing is saved, so the saved token pays again once it can.
 */
export function getAvailableGasPaymentTokenAddress({
  chainId,
  savedTokenAddress,
  unavailableTokens,
  tokensData,
  isGmxAccount,
}: {
  chainId: number;
  savedTokenAddress: string;
  unavailableTokens: Record<string, GasPaymentTokenUnavailableReason>;
  tokensData: TokensData | undefined;
  isGmxAccount: boolean;
}): string {
  if (unavailableTokens[savedTokenAddress] === undefined) {
    return savedTokenAddress;
  }

  return (
    getGasPaymentTokens(chainId).find((tokenAddress) => {
      if (unavailableTokens[tokenAddress] !== undefined) return false;

      const token = getByKey(tokensData, tokenAddress);
      const balance = isGmxAccount ? token?.gmxAccountBalance : token?.walletBalance;

      return balance !== undefined && balance > 0n;
    }) ?? savedTokenAddress
  );
}
