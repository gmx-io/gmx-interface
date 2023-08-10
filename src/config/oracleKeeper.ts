import { ARBITRUM, ARBITRUM_GOERLI, AVALANCHE, AVALANCHE_FUJI } from "./chains";
import queryString from "query-string";

const ORACLE_KEEPER_URLS = {
  [ARBITRUM]: "https://arbitrum-2.gmx-oracle.io",

  [AVALANCHE]: "https://avalanche-2.gmx-oracle.io",

  [ARBITRUM_GOERLI]: "https://oracle-api-arb-goerli-xyguy.ondigitalocean.app",

  [AVALANCHE_FUJI]: "https://gmx-oracle-keeper-ro-avax-fuji-d4il9.ondigitalocean.app",

  default: "https://gmx-oracle-keeper-ro-avax-fuji-d4il9.ondigitalocean.app",
};

export function getOracleKeeperBaseUrl(chainId: number) {
  const url = ORACLE_KEEPER_URLS[chainId] || ORACLE_KEEPER_URLS.default;

  return url;
}

export function getOracleKeeperUrl(chainId: number, path: string, query?: any) {
  const qs = query ? `?${queryString.stringify(query)}` : "";

  const baseUrl = getOracleKeeperBaseUrl(chainId);

  return `${baseUrl}${path}${qs}`;
}
