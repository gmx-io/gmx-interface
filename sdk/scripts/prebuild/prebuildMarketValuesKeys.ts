import fs from "fs";
import entries from "lodash/entries";
import { resolve } from "path";

import { MARKETS } from "../../src/configs/markets";
import { hashMarketValuesKeys } from "../../src/utils/marketKeysAndConfigs";

export function prebuildMarketValuesKeys(outputDir: string) {
  const chainMarketKeys = entries(MARKETS).reduce((chainsAcc, [chainId, markets]) => {
    const chainMarkets = entries(markets).reduce((marketsAcc, [marketAddress, market]) => {
      const marketKeys = hashMarketValuesKeys(market);

      marketsAcc[marketAddress] = marketKeys;

      return marketsAcc;
    }, {});

    chainsAcc[chainId] = chainMarkets;

    return chainsAcc;
  }, {});

  fs.writeFileSync(resolve(outputDir, "hashedMarketValuesKeys.json"), JSON.stringify(chainMarketKeys, null, 2));

  return chainMarketKeys;
}
