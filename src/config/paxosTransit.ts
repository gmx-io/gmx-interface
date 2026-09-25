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
    // TODO: back to 250_000 before launch, lowered to the Transit floor for testing with small amounts
    minAmountUsd: expandDecimals(35, USD_DECIMALS),
  },
};

export function getPaxosTransitConfig(chainId: ContractsChainId): PaxosTransitConfig | undefined {
  return PAXOS_TRANSIT_CONFIGS[chainId];
}
