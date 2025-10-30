import { createTestClient, http, publicActions, walletActions } from "viem";

import { ARBITRUM, getViemChain } from "configs/chains";
import { GmxSdkConfig } from "types/sdk";

import { GmxSdk } from "../index";

const client = createTestClient({
  chain: getViemChain(ARBITRUM),
  mode: "hardhat",
  transport: http(),
})
  .extend(publicActions)
  .extend(walletActions);

export const arbitrumSdkConfig: GmxSdkConfig = {
  chainId: ARBITRUM,
  account: "0x9f7198eb1b9Ccc0Eb7A07eD228d8FbC12963ea33",
  oracleUrl: "https://arbitrum-api.gmxinfra.io",
  rpcUrl: "https://arb1.arbitrum.io/rpc",
  walletClient: client,
  subsquidUrl: "https://gmx.squids.live/gmx-synthetics-arbitrum:prod/api/graphql",
};

export const arbitrumSdk = new GmxSdk(arbitrumSdkConfig);
