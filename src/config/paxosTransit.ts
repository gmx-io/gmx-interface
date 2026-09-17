import { USD_DECIMALS } from "config/factors";
import { expandDecimals } from "lib/numbers";
import { getTokenBySymbol } from "sdk/configs/tokens";

import { ARBITRUM, ContractsChainId } from "./chains";

type PaxosTransitConfig = {
  usdcAddress: string;
  usdgAddress: string;
  swapMarketAddress: string;
  minAmountUsd: bigint;
};

const PAXOS_TRANSIT_CONFIGS: Partial<Record<ContractsChainId, PaxosTransitConfig>> = {
  [ARBITRUM]: {
    usdcAddress: getTokenBySymbol(ARBITRUM, "USDC").address,
    usdgAddress: getTokenBySymbol(ARBITRUM, "USDG").address,
    // SWAP-ONLY [USDC-USDG]
    swapMarketAddress: "0x408E8e83d4b8Ac4BDefFDF896B49268A5FE5Ef44",
    // TODO: back to 250_000 before launch, lowered for testing with small amounts
    minAmountUsd: expandDecimals(25, USD_DECIMALS - 1),
  },
};

export function getPaxosTransitConfig(chainId: ContractsChainId): PaxosTransitConfig | undefined {
  return PAXOS_TRANSIT_CONFIGS[chainId];
}

// swapFeesUsd is undefined when our pools can't fill the swap, which leaves Transit as the only route
export function getShouldShowPaxosTransit(p: {
  chainId: ContractsChainId;
  amountUsd: bigint;
  isWhitelisted: boolean;
  transitFeesUsd: bigint | undefined;
  swapFeesUsd: bigint | undefined;
}): boolean {
  const config = getPaxosTransitConfig(p.chainId);

  if (!config) {
    return false;
  }

  if (p.isWhitelisted) {
    return true;
  }

  if (p.transitFeesUsd === undefined) {
    return false;
  }

  if (p.swapFeesUsd === undefined) {
    return true;
  }

  return p.amountUsd >= config.minAmountUsd && p.transitFeesUsd < p.swapFeesUsd;
}
