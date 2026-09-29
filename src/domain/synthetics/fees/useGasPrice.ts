import useSWR from "swr";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { getProvider } from "lib/rpc";
import { EXPRESS_EXTRA_EXECUTION_FEE_BUFFER_BPS } from "sdk/configs/express";

import {
  estimateExecutionGasPrice,
  getExecutionFeeBufferBps,
  getExecutionFeeGasPricePremium,
  getMaxPriorityFeePerGas,
} from "./utils/executionFee";

export function useGasPrice(chainId: number | undefined) {
  const settings = useSettings();

  const queryCondition = chainId !== undefined;
  const { data: gasPrice } = useSWR<bigint | undefined>(
    queryCondition ? ["gasPrice", chainId, settings.executionFeeBufferBps] : null,
    {
      refreshInterval: 2000,
      fetcher: () => {
        if (!queryCondition) {
          return undefined;
        }

        return new Promise<bigint | undefined>(async (resolve, reject) => {
          const provider = getProvider(undefined, chainId);

          if (!provider) {
            resolve(undefined);
            return;
          }

          try {
            const feeData = await provider.getFeeData();

            const bufferBps =
              (settings.executionFeeBufferBps ?? 0) +
              (settings.expressOrdersEnabled ? EXPRESS_EXTRA_EXECUTION_FEE_BUFFER_BPS : 0);

            const gasPrice = estimateExecutionGasPrice({
              rawGasPrice: feeData.gasPrice ?? 0n,
              maxPriorityFeePerGas: getMaxPriorityFeePerGas(chainId, feeData?.maxPriorityFeePerGas),
              bufferBps: getExecutionFeeBufferBps(chainId, bufferBps),
              // the estimate covers a wallet-signed transaction; express takes the allowance out on its side
              premium: getExecutionFeeGasPricePremium(chainId, false),
            });

            resolve(gasPrice);
          } catch (e) {
            // eslint-disable-next-line no-console
            console.error(e);
            reject(e);
          }
        });
      },
    }
  );

  return gasPrice === undefined ? undefined : BigInt(gasPrice);
}
