import { useMemo } from "react";
import { swapImpactExponentFactorKey, swapImpactFactorKey } from "../dataStore/keys";
import { useDataStoreData } from "../dataStore/useDataStoreData";
import { PriceImpactConfig, PriceImpactConfigsData } from "./types";
import { decimalToFloat } from "./utils";

export function usePriceImpactData(chainId: number, p: { marketAddresses: string[] }): PriceImpactConfigsData {
  const dataStoreReq = p.marketAddresses.reduce((acc, address) => {
    acc[`${address}_impactFactor_positive`] = swapImpactFactorKey(address, true);
    acc[`${address}_impactFactor_negative`] = swapImpactFactorKey(address, false);
    acc[`${address}_exponentImpactFactor`] = swapImpactExponentFactorKey(address);

    return acc;
  }, {});

  const dataStoreResult = useDataStoreData(chainId, { keys: dataStoreReq, method: "getUint" });

  const result: PriceImpactConfigsData = useMemo(() => {
    if (!dataStoreResult)
      return {
        priceImpactConfigs: {},
      };

    const priceImpactConfigs = p.marketAddresses.reduce((acc, address) => {
      const factorPositive = dataStoreResult[`${address}_impactFactor_positive`];
      const factorNegative = dataStoreResult[`${address}_impactFactor_negative`];
      const exponentFactor = dataStoreResult[`${address}_exponentImpactFactor`];

      acc[address] = {
        factorPositive: factorPositive?.gt(0) ? factorPositive : decimalToFloat(2, 8),
        factorNegative: factorNegative?.gt(0) ? factorNegative : decimalToFloat(2, 8),
        exponentFactor: exponentFactor?.gt(0) ? exponentFactor : decimalToFloat(2, 0),
      };

      return acc;
    }, {} as { [marketAddress: string]: PriceImpactConfig });

    return {
      priceImpactConfigs,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataStoreResult, p.marketAddresses.join("-")]);

  return result;
}
