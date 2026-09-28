import { ARBITRUM_SEPOLIA, type ContractsChainId } from "./chains";
import { getContract } from "./contracts";

export function getRewardsVestingConfig(chainId: ContractsChainId) {
  if (chainId === ARBITRUM_SEPOLIA) {
    return {
      type: "ratio" as const,
      vester: getContract(chainId, "SeasonRatioVester"),
      abiId: "RatioVester" as const,
      reader: getContract(chainId, "RatioVesterReader"),
      issuer: getContract(chainId, "EsGmxIssuer"),
      issuerDeploymentBlock: 309737792n,
      esToken: getContract(chainId, "IncentiveEsGmx"),
      pairToken: getContract(chainId, "IncentivePairToken"),
      claimableToken: getContract(chainId, "IncentiveClaimableToken"),
      pairTokenSymbol: "sbfGMX",
    };
  }

  return {
    type: "legacy" as const,
    vester: getContract(chainId, "GmxVester"),
    abiId: "Vester" as const,
  };
}

export type RatioVestingConfig = Extract<ReturnType<typeof getRewardsVestingConfig>, { type: "ratio" }>;
