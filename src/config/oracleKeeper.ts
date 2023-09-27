import { sample, random } from "lodash";
import { ARBITRUM, ARBITRUM_GOERLI, AVALANCHE, AVALANCHE_FUJI } from "./chains";

const ORACLE_KEEPER_URLS = {
  [ARBITRUM]: ["https://arbitrum-api.gmxinfra.io", "https://arbitrum-api.gmxinfra2.io"],

  [AVALANCHE]: ["https://avalanche-api.gmxinfra.io", "https://avalanche-api.gmxinfra2.io"],

  [ARBITRUM_GOERLI]: ["https://gmx-synthetics-api-arb-goerli-4vgxk.ondigitalocean.app"],

  [AVALANCHE_FUJI]: ["https://synthetics-api-avax-fuji-upovm.ondigitalocean.app"],
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
