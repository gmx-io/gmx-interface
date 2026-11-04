import { type Address, isAddressEqual } from "viem";

import { getContract } from "config/contracts";
import { getNeedTokenApprove, type TokensAllowanceData } from "domain/synthetics/tokens";
import { getIsSwapPathFillable } from "domain/synthetics/usdgPools/usdcConversion";
import { convertToUsd, type SignedTokenPermit, type TokenData, type TokensData } from "domain/tokens";
import { isContractRevert } from "lib/multicall/utils";
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

  // a revert is the answer here, and useMulticall throws on any reverted call
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

  const priceResults = tokenAddresses.map((_, index) => results[index * 2]);

  // viem fails every call of a request the RPC didn't answer; throwing keeps the last known state for SWR
  // instead of marking every token unpriced
  if (priceResults.some((result) => result.status === "failure" && !isContractRevert(result.error))) {
    throw new Error("Gas payment token prices request failed");
  }

  return {
    unpricedTokenAddresses: tokenAddresses.filter((_, index) => priceResults[index].status === "failure"),
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

  const isOnRoute = (addresses: string[] | undefined) =>
    oracleTokenAddresses.some((oracleTokenAddress) =>
      addresses?.some((address) => isAddressEqual(address as Address, oracleTokenAddress as Address))
    );

  if (isOnRoute(onchainState?.pausedTokenAddresses)) {
    return "paused";
  }

  return isOnRoute(onchainState?.unpricedTokenAddresses) ? "price" : undefined;
}

type FallbackCandidate = {
  tokenAddress: string;
  canPayFee: boolean;
  isApproved: boolean;
  balanceUsd: bigint;
};

function isBetterFallbackCandidate(candidate: FallbackCandidate, best: FallbackCandidate) {
  if (candidate.canPayFee !== best.canPayFee) return candidate.canPayFee;
  if (candidate.isApproved !== best.isApproved) return candidate.isApproved;
  return candidate.balanceUsd > best.balanceUsd;
}

/**
 * The saved token, or when it can't pay right now, the listed token most likely to cover the fee: one whose balance
 * covers a minimal fee first, then an approved one, then the largest balance. The saved token isn't changed here,
 * so it pays again once it can.
 */
export function getAvailableGasPaymentTokenAddress({
  chainId,
  savedTokenAddress,
  unavailableTokens,
  tokensData,
  tokensAllowanceData,
  tokenPermits,
  isGmxAccount,
  getMinFeeAmount,
}: {
  chainId: number;
  savedTokenAddress: string;
  unavailableTokens: Record<string, GasPaymentTokenUnavailableReason>;
  tokensData: TokensData | undefined;
  tokensAllowanceData: TokensAllowanceData | undefined;
  tokenPermits: SignedTokenPermit[];
  isGmxAccount: boolean;
  // undefined until gas data loads
  getMinFeeAmount: (token: TokenData) => bigint | undefined;
}): string {
  if (unavailableTokens[savedTokenAddress] === undefined) {
    return savedTokenAddress;
  }

  let best: FallbackCandidate | undefined;

  for (const tokenAddress of getGasPaymentTokens(chainId)) {
    const token = getByKey(tokensData, tokenAddress);
    const balance = isGmxAccount ? token?.gmxAccountBalance : token?.walletBalance;

    if (unavailableTokens[tokenAddress] !== undefined || !token || balance === undefined || balance === 0n) {
      continue;
    }

    const minFeeAmount = getMinFeeAmount(token);
    const candidate: FallbackCandidate = {
      tokenAddress,
      canPayFee: minFeeAmount === undefined || balance >= minFeeAmount,
      // GMX Account fees need no approval
      isApproved:
        isGmxAccount || !getNeedTokenApprove(tokensAllowanceData, tokenAddress, minFeeAmount ?? balance, tokenPermits),
      balanceUsd: convertToUsd(balance, token.decimals, token.prices.minPrice) ?? 0n,
    };

    if (!best || isBetterFallbackCandidate(candidate, best)) {
      best = candidate;
    }
  }

  return best?.tokenAddress ?? savedTokenAddress;
}
