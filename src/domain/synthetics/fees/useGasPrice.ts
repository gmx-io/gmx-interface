import useSWR from "swr";
import { useWeb3React } from "@web3-react/core";
import { BigNumber } from "ethers";
import { getProvider } from "lib/rpc";

export function useGasPrice(chainId) {
  const { library } = useWeb3React();

  const { data: gasPrice, error } = useSWR<BigNumber | undefined>(["gasPrice", chainId], {
    fetcher: () => {
      return new Promise(async (resolve, reject) => {
        const provider = getProvider(library, chainId);
        if (!provider) {
          resolve(undefined);
          return;
        }

        try {
          const gasPrice = await provider.getGasPrice();
          resolve(gasPrice);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(e);
        }
      });
    },
  });

  return { gasPrice, isLoading: !gasPrice && !error, error };
}
