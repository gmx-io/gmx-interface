import { useChainId } from "lib/chains";
import { getProvider } from "lib/rpc";
import useWallet from "lib/wallets/useWallet";
import useSWR from "swr";

export function useTestGas() {
  const { signer } = useWallet();
  const { chainId } = useChainId();

  const { data } = useSWR<any | undefined>(["gasPrice test"], {
    fetcher: () => {
      return new Promise<any | undefined>(async (resolve, reject) => {
        const provider = getProvider(signer, chainId);
        const rpc = getProvider(undefined, chainId);
        const providerGasPrice = await provider.getGasPrice();
        const providerGasFeeData = await provider.getFeeData();

        const rpcGasPrice = await rpc.getGasPrice();
        const rpcGasFeeData = await rpc.getFeeData();

        if (!provider) {
          resolve(undefined);
          return;
        }

        try {
          resolve({
            providerGasPrice,
            rpcGasPrice,
            rpcGasFeeData,
            providerGasFeeData,
          });
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(e);
          reject(e);
        }
      });
    },
  });

  console.log({ data });

  return {
    providerGasPrice: data?.providerGasPrice,
    rpcGasPrice: data?.rpcGasPrice,
    providerGasFeeData: data?.providerGasFeeData,
    rpcGasFeeData: data?.rpcGasFeeData,
  };
}
