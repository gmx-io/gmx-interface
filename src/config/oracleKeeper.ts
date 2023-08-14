import { sample, random } from "lodash";
import { ARBITRUM, ARBITRUM_GOERLI, AVALANCHE, AVALANCHE_FUJI } from "./chains";

const ORACLE_KEEPER_URLS = {
  [ARBITRUM]: ["https://arbitrum.gmx-oracle.io", "https://arbitrum-2.gmx-oracle.io"],

  [AVALANCHE]: ["https://avalanche.gmx-oracle.io", "https://avalanche-2.gmx-oracle.io"],

  [ARBITRUM_GOERLI]: ["https://oracle-api-arb-goerli-xyguy.ondigitalocean.app"],

  [AVALANCHE_FUJI]: ["https://gmx-oracle-keeper-ro-avax-fuji-d4il9.ondigitalocean.app"],
};

export function getOracleKeeperUrl(chainId: number, index: number) {
  const urls = ORACLE_KEEPER_URLS[chainId];

  if (!urls.length) {
    throw new Error(`No oracle keeper urls for chain ${chainId}`);
  }

  return urls[index] || urls[0];
}

export function getOracleKeeperNextIndex(chainId: number, currentIndex: number) {
  const urls = ORACLE_KEEPER_URLS[chainId];

  if (!urls.length) {
    throw new Error(`No oracle keeper urls for chain ${chainId}`);
  }

  return urls[currentIndex + 1] ? currentIndex + 1 : 0;
}

export function getOracleKeeperRandomIndex(chainId: number, bannedIndexes?: number[]): number {
  const urls = ORACLE_KEEPER_URLS[chainId];

  if (bannedIndexes?.length) {
    const filteredUrls = urls.filter((url, i) => !bannedIndexes.includes(i));

    if (filteredUrls.length) {
      const url = sample(filteredUrls);
      return urls.indexOf(url);
    }
  }

  return random(0, urls.length - 1);
}
