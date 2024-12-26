import { EXECUTION_FEE_CONFIG_V2, GAS_PRICE_PREMIUM_MAP, MAX_PRIORITY_FEE_PER_GAS_MAP } from "config/chains";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { bigMath } from "lib/bigmath";
import { getProvider } from "lib/rpc";
import useSWR from "swr";
import { estimateExecutionGasPrice } from "./utils";

export function useGasPrice(chainId: number) {
  const settings = useSettings();

  const executionFeeConfig = EXECUTION_FEE_CONFIG_V2[chainId];

  const { data: gasPrice } = useSWR<bigint | undefined>(
    ["gasPrice", chainId, executionFeeConfig.shouldUseMaxPriorityFeePerGas, settings.executionFeeBufferBps],
    {
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
              maxPriorityFeePerGas: executionFeeConfig.shouldUseMaxPriorityFeePerGas
                ? bigMath.max(feeData?.maxPriorityFeePerGas ?? 0n, MAX_PRIORITY_FEE_PER_GAS_MAP[chainId] ?? 0n)
                : undefined,
              bufferBps: BigInt(settings.executionFeeBufferBps ?? 0),
              premium: GAS_PRICE_PREMIUM_MAP[chainId],
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
