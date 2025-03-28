import { createTestClient, http, publicActions, walletActions } from "viem";

import { ARBITRUM, getViemChain } from "configs/chains";

import { GmxSdk } from "../index";

const client = createTestClient({
  chain: getViemChain(ARBITRUM),
  mode: "hardhat",
  transport: http(),
})
  .extend(publicActions)
  .extend(walletActions);

export const arbitrumSdkConfig = {
  chainId: ARBITRUM,
  account: "0x9f7198eb1b9Ccc0Eb7A07eD228d8FbC12963ea33",
  oracleUrl: "https://arbitrum-api.gmxinfra.io",
  rpcUrl: "https://arb1.arbitrum.io/rpc",
  walletClient: client,
  subsquidUrl: "https://gmx.squids.live/gmx-synthetics-arbitrum:live/api/graphql",
  subgraphUrl: "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/synthetics-arbitrum-stats/api",
};

export const arbitrumSdk = new GmxSdk(arbitrumSdkConfig);
