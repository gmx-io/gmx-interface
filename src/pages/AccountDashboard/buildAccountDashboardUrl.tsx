import { NETWORK_ID_SLUGS_MAP, NETWORK_QUERY_PARAM, VERSION_QUERY_PARAM } from "./constants";

export function buildAccountDashboardUrl(
  account: string | undefined,
  chainId: number | undefined,
  version: number | undefined = 2
) {
  let path = `/accounts`;

  if (account) {
    path += `/${account}`;
  }

  const qs = new URLSearchParams();

  if (chainId) {
    qs.set(NETWORK_QUERY_PARAM, NETWORK_ID_SLUGS_MAP[chainId]);
  }

  qs.set(VERSION_QUERY_PARAM, version.toString());

  return path + "?" + qs.toString();
}
