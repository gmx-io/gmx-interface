import type { GmxSdk } from "..";

export type SubgraphType = "stats" | "referrals" | "nissohVault" | "syntheticsStats" | "subsquid";

export function getSubgraphUrl(sdk: GmxSdk, subgraph: SubgraphType): string | undefined {
  return sdk.config.subgraph[subgraph];
}
