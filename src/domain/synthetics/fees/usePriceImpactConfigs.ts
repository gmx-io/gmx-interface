import { useMemo } from "react";
import { swapImpactExponentFactorKey, swapImpactFactorKey, useDataStoreKeys } from "domain/synthetics/dataStore";
import { PriceImpactConfigsData } from "./types";
import { decimalToFloat } from "./utils";
import { useMarketsData } from "../markets";

export function usePriceImpactConfigs(chainId: number): PriceImpactConfigsData {
  const marketsData = useMarketsData(chainId);

  const marketAddresses = Object.keys(marketsData);

  const dataStoreReq: { [key: string]: string } = {};

  marketAddresses.forEach((address) => {
    dataStoreReq[`${address}-impactFactor-positive`] = swapImpactFactorKey(address, true);
    dataStoreReq[`${address}-impactFactor-negative`] = swapImpactFactorKey(address, false);
    dataStoreReq[`${address}-exponentImpactFactor`] = swapImpactExponentFactorKey(address);
  });

  const dataStoreResult = useDataStoreKeys(chainId, { keys: dataStoreReq, method: "getUint" });

  const result: PriceImpactConfigsData = useMemo(() => {
    if (!dataStoreResult) return {};

    const priceImpactConfigs = marketAddresses.reduce((acc, address) => {
      const factorPositive = dataStoreResult[`${address}-impactFactor_positive`];
      const factorNegative = dataStoreResult[`${address}-impactFactor_negative`];
      const exponentFactor = dataStoreResult[`${address}-exponentImpactFactor`];

      acc[address] = {
        factorPositive: factorPositive?.gt(0) ? factorPositive : decimalToFloat(2, 8),
        factorNegative: factorNegative?.gt(0) ? factorNegative : decimalToFloat(2, 8),
        exponentFactor: exponentFactor?.gt(0) ? exponentFactor : decimalToFloat(2, 0),
      };

      return acc;
    }, {} as PriceImpactConfigsData);

    return priceImpactConfigs;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataStoreResult, marketAddresses.join("-")]);

  return result;
}
