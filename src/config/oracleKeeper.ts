import { sample } from "lodash";
import { ARBITRUM, ARBITRUM_GOERLI, AVALANCHE, AVALANCHE_FUJI } from "./chains";

const ORACLE_KEEPER_URLS = {
  [ARBITRUM]: ["https://arbitrum.gmx-oracle.io", "https://arbitrum-2.gmx-oracle.io"],

  [AVALANCHE]: ["https://avalanche.gmx-oracle.io", "https://avalanche-2.gmx-oracle.io"],

  [ARBITRUM_GOERLI]: ["https://oracle-api-arb-goerli-xyguy.ondigitalocean.app"],

  [AVALANCHE_FUJI]: ["https://gmx-oracle-keeper-ro-avax-fuji-d4il9.ondigitalocean.app"],

  default: ["https://gmx-oracle-keeper-ro-avax-fuji-d4il9.ondigitalocean.app"],
};

export function getOracleKeeperRandomUrl(chainId: number, bannedUrls?: string[]): string {
  let urls = ORACLE_KEEPER_URLS[chainId] || ORACLE_KEEPER_URLS.default;

  if (bannedUrls?.length) {
    const filteredUrls = urls.filter((url) => !bannedUrls.includes(url));

    if (filteredUrls.length) {
      urls = filteredUrls;
    }
  }

  return sample(urls);
}
