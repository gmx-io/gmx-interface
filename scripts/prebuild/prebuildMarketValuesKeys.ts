import fs from 'fs';
import { resolve } from 'path';
import entries from 'lodash/entries';

import { hashDataMap } from 'lib/multicall/hashDataMap';

import {
  OPEN_INTEREST_IN_TOKENS_KEY,
  OPEN_INTEREST_KEY,
  POOL_AMOUNT_KEY,
  POSITION_IMPACT_POOL_AMOUNT_KEY,
  SWAP_IMPACT_POOL_AMOUNT_KEY,
} from "config/dataStore";

import { MARKETS } from "config/static/markets";

export function prebuildMarketValuesKeys(outputDir: string) {
  const chainMarketKeys = entries(MARKETS).reduce((chainsAcc, [chainId, markets]) => {
    const chainMarkets = entries(markets).reduce((marketsAcc, [marketAddress, market]) => {
      const marketKeys = hashDataMap({
        longPoolAmount: [
          ["bytes32", "address", "address"],
          [POOL_AMOUNT_KEY, marketAddress, market.longTokenAddress],
        ],
        shortPoolAmount: [
          ["bytes32", "address", "address"],
          [POOL_AMOUNT_KEY, marketAddress, market.shortTokenAddress],
        ],
        positionImpactPoolAmount: [
          ["bytes32", "address"],
          [POSITION_IMPACT_POOL_AMOUNT_KEY, marketAddress],
        ],
        swapImpactPoolAmountLong: [
          ["bytes32", "address", "address"],
          [SWAP_IMPACT_POOL_AMOUNT_KEY, marketAddress, market.longTokenAddress],
        ],
        swapImpactPoolAmountShort: [
          ["bytes32", "address", "address"],
          [SWAP_IMPACT_POOL_AMOUNT_KEY, marketAddress, market.shortTokenAddress],
        ],
        longInterestUsingLongToken: [
          ["bytes32", "address", "address", "bool"],
          [OPEN_INTEREST_KEY, marketAddress, market.longTokenAddress, true],
        ],
        longInterestUsingShortToken: [
          ["bytes32", "address", "address", "bool"],
          [OPEN_INTEREST_KEY, marketAddress, market.shortTokenAddress, true],
        ],
        shortInterestUsingLongToken: [
          ["bytes32", "address", "address", "bool"],
          [OPEN_INTEREST_KEY, marketAddress, market.longTokenAddress, false],
        ],
        shortInterestUsingShortToken: [
          ["bytes32", "address", "address", "bool"],
          [OPEN_INTEREST_KEY, marketAddress, market.shortTokenAddress, false],
        ],
        longInterestInTokensUsingLongToken: [
          ["bytes32", "address", "address", "bool"],
          [OPEN_INTEREST_IN_TOKENS_KEY, marketAddress, market.longTokenAddress, true],
        ],
        longInterestInTokensUsingShortToken: [
          ["bytes32", "address", "address", "bool"],
          [OPEN_INTEREST_IN_TOKENS_KEY, marketAddress, market.shortTokenAddress, true],
        ],
        shortInterestInTokensUsingLongToken: [
          ["bytes32", "address", "address", "bool"],
          [OPEN_INTEREST_IN_TOKENS_KEY, marketAddress, market.longTokenAddress, false],
        ],
        shortInterestInTokensUsingShortToken: [
          ["bytes32", "address", "address", "bool"],
          [OPEN_INTEREST_IN_TOKENS_KEY, marketAddress, market.shortTokenAddress, false],
        ],
      });

      marketsAcc[marketAddress] = marketKeys;

      return marketsAcc;
    }, {});

    chainsAcc[chainId] = chainMarkets;

    return chainsAcc;
  }, {});

  fs.writeFileSync(resolve(outputDir, 'hashedMarketValuesKeys.json'), JSON.stringify(chainMarketKeys, null, 2));

  return chainMarketKeys;
}
