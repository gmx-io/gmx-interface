import { isTestnetChain } from "config/chains";

const LZ_BASE_URL = "https://scan.layerzero-api.com/v1";
const TEST_LZ_BASE_URL = "https://scan-testnet.layerzero-api.com/v1";

export function getLzBaseUrl(chainId: number): string {
  if (isTestnetChain(chainId)) {
    return TEST_LZ_BASE_URL;
  }
  return LZ_BASE_URL;
}
