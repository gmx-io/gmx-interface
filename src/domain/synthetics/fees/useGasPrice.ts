import { EXECUTION_FEE_CONFIG_V2, GAS_PRICE_PREMIUM_MAP, MAX_PRIORITY_FEE_PER_GAS_MAP } from "config/chains";
import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { bigMath } from "lib/bigmath";
import { getProvider } from "lib/rpc";
import useSWR from "swr";

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
            let gasPrice = feeData.gasPrice ?? 0n;

            if (executionFeeConfig.shouldUseMaxPriorityFeePerGas) {
              const maxPriorityFeePerGas = bigMath.max(
                feeData?.maxPriorityFeePerGas ?? 0n,
                MAX_PRIORITY_FEE_PER_GAS_MAP[chainId] ?? 0n
              );

              gasPrice = gasPrice + maxPriorityFeePerGas;
            }

            if (settings.executionFeeBufferBps) {
              const buffer = bigMath.mulDiv(
                gasPrice,
                BigInt(settings.executionFeeBufferBps),
                BASIS_POINTS_DIVISOR_BIGINT
              );
              gasPrice = gasPrice + buffer;
            }

            const premium = GAS_PRICE_PREMIUM_MAP[chainId] ?? 0n;

            resolve(gasPrice + premium);
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
