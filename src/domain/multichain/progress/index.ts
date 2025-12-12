import createClient from "openapi-fetch";

import { isTestnetChain } from "config/chains";

import type { paths } from "./gen";

const LZ_BASE_URL = "https://scan.layerzero-api.com/v1";
const TEST_LZ_BASE_URL = "https://scan-testnet.layerzero-api.com/v1";

export const layerZeroApi = createClient<paths>({ baseUrl: LZ_BASE_URL });

export function getLzBaseUrl(chainId: number): string {
  if (isTestnetChain(chainId)) {
    return TEST_LZ_BASE_URL;
  }
  return LZ_BASE_URL;
}
