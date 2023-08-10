import { sample } from "lodash";
import { ARBITRUM, ARBITRUM_GOERLI, AVALANCHE, AVALANCHE_FUJI } from "./chains";

const ORACLE_KEEPER_URLS = {
  [ARBITRUM]: ["https://arbitrum.gmx-oracle.io", "https://arbitrum-2.gmx-oracle.io"],

  [AVALANCHE]: ["https://avalanche.gmx-oracle.io", "https://avalanche-2.gmx-oracle.io"],

  [ARBITRUM_GOERLI]: ["https://oracle-api-arb-goerli-xyguy.ondigitalocean.app"],

  [AVALANCHE_FUJI]: ["https://gmx-oracle-keeper-ro-avax-fuji-d4il9.ondigitalocean.app"],

  default: ["https://gmx-oracle-keeper-ro-avax-fuji-d4il9.ondigitalocean.app"],
};

export function getOracleKeeperUrl(chainId: number, index: number) {
  const urls = ORACLE_KEEPER_URLS[chainId] || ORACLE_KEEPER_URLS.default;

  if (index > urls.length - 1) {
    return urls[0];
  }

  return urls[index];
}

export function getOracleKeeperRandomIndex(chainId: number, bannedIndexes?: number[]): number {
  let urls = ORACLE_KEEPER_URLS[chainId] || ORACLE_KEEPER_URLS.default;

  if (bannedIndexes?.length) {
    const filteredUrls = urls.filter((url, i) => !bannedIndexes.includes(i));

    if (filteredUrls.length) {
      urls = filteredUrls;
    }
  }

  const url = sample(urls);

  return urls.indexOf(url);
}
