import useSWR from "swr";
import { useWeb3React } from "@web3-react/core";
import { BigNumber } from "ethers";
import { getProvider } from "lib/rpc";
import { AVALANCHE, AVALANCHE_FUJI } from "config/chains";

export function useGasPrice(chainId: number) {
  const { library } = useWeb3React();

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

          if ([AVALANCHE, AVALANCHE_FUJI].includes(chainId)) {
            const feeData = await provider.getFeeData();

            // the wallet provider might not return maxPriorityFeePerGas in feeData
            // in which case we should fallback to the usual getGasPrice flow handled below
            if (feeData && feeData.maxPriorityFeePerGas) {
              gasPrice = gasPrice.add(feeData.maxPriorityFeePerGas);
            }
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
