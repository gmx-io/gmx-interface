import { createTestClient, http, publicActions, walletActions } from "viem";

import { ARBITRUM, getChain } from "configs/chains";

import { GmxSdk } from "../index";

const client = createTestClient({
  chain: getChain(ARBITRUM),
  mode: "hardhat",
  transport: http(),
})
  .extend(publicActions)
  .extend(walletActions);

export const arbitrumSdk = new GmxSdk({
  chainId: ARBITRUM,
  account: "0x9f7198eb1b9Ccc0Eb7A07eD228d8FbC12963ea33",
  oracleUrl: "https://arbitrum-api.gmxinfra.io",
  rpcUrl: "https://arb1.arbitrum.io/rpc",
  walletClient: client,
  subgraph: {
    stats: "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/gmx-arbitrum-stats/api",
    referrals: "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/gmx-arbitrum-referrals/api",
    nissohVault: "https://api.thegraph.com/subgraphs/name/nissoh/gmx-vault",
    syntheticsStats: "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/synthetics-arbitrum-stats/api",
    subsquid: "https://gmx.squids.live/gmx-synthetics-arbitrum/v/v20/graphql",
  },
});
