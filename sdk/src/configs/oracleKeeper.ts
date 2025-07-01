import random from "lodash/random";
import sample from "lodash/sample";

import { ARBITRUM, AVALANCHE, AVALANCHE_FUJI, BOTANIX, UiContractsChain } from "./chains";

const ORACLE_KEEPER_URLS: Record<UiContractsChain, string[]> = {
  [ARBITRUM]: ["https://arbitrum-api.gmxinfra.io", "https://arbitrum-api.gmxinfra2.io"],

  [AVALANCHE]: ["https://avalanche-api.gmxinfra.io", "https://avalanche-api.gmxinfra2.io"],

  [AVALANCHE_FUJI]: ["https://synthetics-api-avax-fuji-upovm.ondigitalocean.app"],

  [BOTANIX]: ["https://botanix-api.gmxinfra.io", "https://botanix-api.gmxinfra2.io"],
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

      if (!url) {
        throw new Error(`No oracle keeper urls for chain ${chainId}`);
      }

      return urls.indexOf(url);
    }
  }

  return random(0, urls.length - 1);
}
