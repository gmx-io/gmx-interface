import fs from "fs";
import { resolve } from "path";
import entries from "lodash/entries";

import { MARKETS } from "../../src/configs/markets";
import { hashMarketConfigKeys } from "../../src/utils/marketKeysAndConfigs";

export function prebuildMarketConfigKeys(outputDir: string) {
  const chainMarketKeys = entries(MARKETS).reduce((chainsAcc, [chainId, markets]) => {
    const chainMarkets = entries(markets).reduce((marketsAcc, [marketAddress, market]) => {
      const marketKeys = hashMarketConfigKeys(market);
      marketsAcc[marketAddress] = marketKeys;

      return marketsAcc;
    }, {});

    chainsAcc[chainId] = chainMarkets;

    return chainsAcc;
  }, {});

  fs.writeFileSync(resolve(outputDir, "hashedMarketConfigKeys.json"), JSON.stringify(chainMarketKeys, null, 2));

  return chainMarketKeys;
}
