import useSWR from "swr";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { getProvider } from "lib/rpc";

import {
  estimateExecutionGasPrice,
  getExecutionFeeBufferBps,
  getGasPremium,
  getMaxPriorityFeePerGas,
} from "./utils/executionFee";

export function useGasPrice(chainId: number) {
  const settings = useSettings();

  const { data: gasPrice } = useSWR<bigint | undefined>(["gasPrice", chainId, settings.executionFeeBufferBps], {
    fetcher: () => {
      return new Promise<bigint | undefined>(async (resolve, reject) => {
        const provider = getProvider(undefined, chainId);

        if (!provider) {
          resolve(undefined);
          return;
        }

        try {
          const feeData = await provider.getFeeData();

          const gasPrice = estimateExecutionGasPrice({
            rawGasPrice: feeData.gasPrice ?? 0n,
            maxPriorityFeePerGas: getMaxPriorityFeePerGas(chainId, feeData?.maxPriorityFeePerGas),
            bufferBps: getExecutionFeeBufferBps(chainId, settings.executionFeeBufferBps),
            premium: getGasPremium(chainId),
          });

          resolve(gasPrice);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(e);
          reject(e);
        }
      });
    },
  });

  // return 100_000_000n;
  return gasPrice === undefined ? undefined : BigInt(gasPrice);
}
