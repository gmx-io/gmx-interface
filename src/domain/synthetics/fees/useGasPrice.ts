import useSWR from "swr";

import { BOTANIX } from "config/chains";
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

  const useEip1559 = chainId === BOTANIX;

  const { data: gasPrice } = useSWR<bigint | undefined>(["gasPrice", chainId, settings.executionFeeBufferBps], {
    fetcher: () => {
      return new Promise<bigint | undefined>(async (resolve, reject) => {
        const provider = getProvider(undefined, chainId);

        if (!provider) {
          resolve(undefined);
          return;
        }

        try {
          let baseFeePerGas = 0n;
          let maxPriorityFeePerGas = 0n;

          if (useEip1559) {
            const [block, maxPriorityFeePerGasHex] = await Promise.all([
              provider.getBlock("latest"),
              provider.send("eth_maxPriorityFeePerGas", []),
            ]);
            baseFeePerGas = block?.baseFeePerGas ?? 0n;
            maxPriorityFeePerGas = BigInt(maxPriorityFeePerGasHex);
          } else {
            const feeData = await provider.getFeeData();

            baseFeePerGas = feeData.gasPrice ?? 0n;
            maxPriorityFeePerGas = feeData?.maxPriorityFeePerGas ?? 0n;
          }

          const gasPrice = estimateExecutionGasPrice({
            rawGasPrice: baseFeePerGas,
            maxPriorityFeePerGas: getMaxPriorityFeePerGas(chainId, maxPriorityFeePerGas),
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

  return gasPrice === undefined ? undefined : BigInt(gasPrice);
}
