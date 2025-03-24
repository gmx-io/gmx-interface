import { ARBITRUM, AVALANCHE, AVALANCHE_FUJI } from "configs/chains";

export const getOracleKeeperUrlByChain = (chainId: number) => {
  return {
    [ARBITRUM]: "https://arbitrum-api.gmxinfra.io",
    [AVALANCHE]: "https://avalanche-api.gmxinfra.io",
    [AVALANCHE_FUJI]: "https://synthetics-api-avax-fuji-upovm.ondigitalocean.app",
  }[chainId];
};
