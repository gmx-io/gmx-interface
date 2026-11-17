import { createPublicClient, http } from "viem";

import * as chainIds from "../../../sdk/src/configs/chainIds";
import { CONTRACTS_CHAIN_IDS, getViemChain, isTestnetChain } from "../../../sdk/src/configs/chains";
import { readRegressionEndpoints } from "./deploymentConfig";

export const productionChains = Object.entries(chainIds)
  .filter(([, id]) => (CONTRACTS_CHAIN_IDS as readonly number[]).includes(id))
  .map(([name, id]) => ({ name, id, configKey: `[${name}]` }));

const nonProductionKeys = new Set([
  "test",
  ...Object.entries(chainIds)
    .filter(([, id]) => isTestnetChain(id))
    .map(([name]) => `[${name}]`),
]);

export function readProductionEndpoints() {
  return readRegressionEndpoints().filter(({ keys }) => !keys.some((key) => nonProductionKeys.has(key)));
}

export function publicClient(chainId: number) {
  const chain = getViemChain(chainId);
  return createPublicClient({ chain, transport: http(chain.rpcUrls.default.http[0], { timeout: 15_000 }) });
}
