import { ARBITRUM, AVALANCHE, AVALANCHE_FUJI_TESTNET } from "./chains";

const ORACLE_KEEPER_URLS = {
  [ARBITRUM]: "https://oracle-keeper-testing-arbitrum-8raup.ondigitalocean.app",

  [AVALANCHE]: "https://oracle-keeper-testing-arbitrum-8raup.ondigitalocean.app",

  [AVALANCHE_FUJI_TESTNET]: "https://oracle-keeper-testing-arbitrum-8raup.ondigitalocean.app",

  default: "https://oracle-keeper-testing-arbitrum-8raup.ondigitalocean.app",
};

export function getOracleKeeperBaseUrl(chainId: number) {
  const url = ORACLE_KEEPER_URLS[chainId] || ORACLE_KEEPER_URLS.default;

  return url;
}
