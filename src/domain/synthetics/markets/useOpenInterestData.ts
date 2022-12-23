import { useMemo } from "react";
import { openInterestKey, useDataStoreKeys } from "domain/synthetics/dataStore";
import { OpenInterestData, getMarket, useMarketsData } from "../markets";
import { BigNumber } from "ethers";

export function useOpenInterestData(chainId: number): OpenInterestData {
  const marketsData = useMarketsData(chainId);

  const dataStoreReq = useMemo(() => {
    return Object.keys(marketsData).reduce((req, address) => {
      const market = getMarket(marketsData, address);

      req[`${address}-longToken-long`] = openInterestKey(address, market!.longTokenAddress, true);
      req[`${address}-shortToken-short`] = openInterestKey(address, market!.shortTokenAddress, false);

      req[`${address}-longToken-short`] = openInterestKey(address, market!.longTokenAddress, false);
      req[`${address}-shortToken-long`] = openInterestKey(address, market!.shortTokenAddress, true);

      return req;
    }, {});
  }, [marketsData]);

  const dataStoreResult = useDataStoreKeys(chainId, {
    method: "getUint",
    keys: dataStoreReq,
  });

  const result = useMemo(() => {
    if (!dataStoreResult) return {};

    const openInterestData = Object.keys(marketsData).reduce((acc: OpenInterestData, address) => {
      const longInterestUsingLongToken = dataStoreResult[`${address}-longToken-long`];
      const longInterestUsingShortToken = dataStoreResult[`${address}-shortToken-long`];

      const shortInterestUsingLongToken = dataStoreResult[`${address}-longToken-short`];
      const shortInterestUsingShortToken = dataStoreResult[`${address}-shortToken-short`];

      const longInterest = BigNumber.from(0)
        .add(longInterestUsingLongToken || BigNumber.from(0))
        .add(longInterestUsingShortToken || BigNumber.from(0));

      const shortInterest = BigNumber.from(0)
        .add(shortInterestUsingLongToken || BigNumber.from(0))
        .add(shortInterestUsingShortToken || BigNumber.from(0));

      acc[address] = {
        longInterest,
        shortInterest,
      };

      return acc;
    }, {} as OpenInterestData);

    return openInterestData;
  }, [dataStoreResult, marketsData]);

  return result;
}
