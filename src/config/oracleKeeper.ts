import { ARBITRUM, AVALANCHE, AVALANCHE_FUJI } from "./chains";
import queryString from "query-string";

const ORACLE_KEEPER_URLS = {
  [ARBITRUM]: "https://seashell-app-zdvwo.ondigitalocean.app",

  [AVALANCHE]: "https://seashell-app-zdvwo.ondigitalocean.app",

  [AVALANCHE_FUJI]: "https://gmx-oracle-keeper-ro-avalanche-fuji-glyu6psrea-ew.a.run.app",

  default: "https://gmx-oracle-keeper-ro-avalanche-fuji-glyu6psrea-ew.a.run.app",
};

export function getOracleKeeperBaseUrl(chainId: number) {
  const url = ORACLE_KEEPER_URLS[chainId] || ORACLE_KEEPER_URLS.default;

  return url;
}

export function getOracleKeeperUrl(chainId: number, path: string, query?: any) {
  const qs = query ? `?${queryString.stringify(query)}` : "";

  return `${getOracleKeeperBaseUrl(chainId)}${path}${qs}`;
}
