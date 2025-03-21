import { ARBITRUM, AVALANCHE, AVALANCHE_FUJI } from "configs/chains";

const ORACLE_KEEPER_URL_BY_CHAIN = {
  [ARBITRUM]: "https://arbitrum-api.gmxinfra.io",
  [AVALANCHE]: "https://avalanche-api.gmxinfra.io",
  [AVALANCHE_FUJI]: "https://synthetics-api-avax-fuji-upovm.ondigitalocean.app",
};

export const getOracleKeeperUrlByChain = (chainId: number) => {
  return ORACLE_KEEPER_URL_BY_CHAIN[chainId];
};