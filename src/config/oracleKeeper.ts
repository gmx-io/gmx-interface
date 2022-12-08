import { ARBITRUM, AVALANCHE, AVALANCHE_FUJI } from "./chains";
import queryString from "query-string";

const ORACLE_KEEPER_URLS = {
  [ARBITRUM]: "https://oracle-keeper-testing-arbitrum-8raup.ondigitalocean.app",

  [AVALANCHE]: "https://oracle-keeper-testing-arbitrum-8raup.ondigitalocean.app",

  [AVALANCHE_FUJI]: "https://oracle-keeper-testing-arbitrum-8raup.ondigitalocean.app",

  default: "https://oracle-keeper-testing-arbitrum-8raup.ondigitalocean.app",
};

export function getOracleKeeperBaseUrl(chainId: number) {
  const url = ORACLE_KEEPER_URLS[chainId] || ORACLE_KEEPER_URLS.default;

  return url;
}

export function getOracleKeeperUrl(chainId: number, path: string, query?: any) {
  const qs = query ? `?${queryString.stringify(query)}` : "";

  return `${getOracleKeeperBaseUrl(chainId)}${path}${qs}`;
}
