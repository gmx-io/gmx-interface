import { getOracleKeeperBaseUrl } from "config/oracleKeeper";
import queryString from "query-string";

export function getOracleKeeperEndpoint(chainId: number, path: string, query?: any) {
  const qs = query ? `?${queryString.stringify(query)}` : "";

  return `${getOracleKeeperBaseUrl(chainId)}${path}${qs}`;
}
