import fs from "fs";
import entries from "lodash/entries";
import { resolve } from "path";

import { MARKETS } from "../../src/configs/markets";
import { hashKinkModelKeys } from "../../src/utils/markets/hashKeys";

export function prebuildKinkModelMarketRatesKeys(outputDir: string) {
  const chainMarketKeys = entries(MARKETS).reduce((chainsAcc, [chainId, markets]) => {
    const chainMarkets = entries(markets).reduce((marketsAcc, [marketAddress]) => {
      const marketKeys = hashKinkModelKeys(marketAddress);

      marketsAcc[marketAddress] = marketKeys;

      return marketsAcc;
    }, {});

    chainsAcc[chainId] = chainMarkets;

    return chainsAcc;
  }, {});

  fs.writeFileSync(resolve(outputDir, "hashedKinkModelMarketRatesKeys.json"), JSON.stringify(chainMarketKeys, null, 2));

  return chainMarketKeys;
}
