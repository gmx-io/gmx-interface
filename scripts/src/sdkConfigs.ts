export const sdkConfigs = {
  arbitrum: {
    chainId: 42161,
    oracleUrl: "https://arbitrum-api.gmxinfra.io",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    subsquidUrl: "https://gmx.squids.live/gmx-synthetics-arbitrum:live/api/graphql",
    subgraphUrl: "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/synthetics-arbitrum-stats/api"
  },
  avalanche: {
    chainId: 43114,
    oracleUrl: "https://avalanche-api.gmxinfra.io",
    rpcUrl: "https://1rpc.io/avax/c",
    subsquidUrl: "https://gmx.squids.live/gmx-synthetics-avalanche@5ca3d5/api/graphql",
    subgraphUrl: "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/synthetics-avalanche-stats/api"
  },
  avalanche_fuji: {
    chainId: 43113,
    oracleUrl: "https://synthetics-api-avax-fuji-upovm.ondigitalocean.app",
    rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
    subsquidUrl: "https://gmx.squids.live/gmx-synthetics-fuji@5ca3d5/api/graphql",
    subgraphUrl: "https://api.thegraph.com/subgraphs/name/gmx-io/gmx-avalanche-stats",
  },
};
