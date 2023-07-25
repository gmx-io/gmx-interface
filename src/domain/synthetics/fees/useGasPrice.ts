import { useWeb3React } from "@web3-react/core";
import { BASIS_POINTS_DIVISOR, DEFAULT_EXECUTION_FEE_BUFFER_BPS } from "config/factors";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { BigNumber } from "ethers";
import { getProvider } from "lib/rpc";
import useSWR from "swr";

export function useGasPrice(chainId: number) {
  const { library } = useWeb3React();
  const settings = useSettings();

  const { data: gasPrice } = useSWR<BigNumber | undefined>(["gasPrice", chainId], {
    fetcher: () => {
      return new Promise(async (resolve, reject) => {
        const provider = getProvider(library, chainId);

        if (!provider) {
          resolve(undefined);
          return;
        }

        try {
          let gasPrice = await provider.getGasPrice();

          if (settings.shouldUseExecutionFeeBuffer) {
            const feeData = await provider.getFeeData();

            // the wallet provider might not return maxPriorityFeePerGas in feeData
            // in which case we should fallback to the usual getGasPrice flow handled below
            if (feeData && feeData.maxPriorityFeePerGas) {
              gasPrice = gasPrice.add(feeData.maxPriorityFeePerGas);
            }

            const buffer = settings.executionFeeBufferBps || DEFAULT_EXECUTION_FEE_BUFFER_BPS[chainId];

            gasPrice = gasPrice.mul(BASIS_POINTS_DIVISOR + buffer).div(BASIS_POINTS_DIVISOR);
          }

          resolve(gasPrice);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(e);
          reject(e);
        }
      });
    },
  });

  return { gasPrice };
}
