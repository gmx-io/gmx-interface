import { useWeb3React } from "@web3-react/core";
import { BigNumber } from "ethers";
import useSWR from "swr";

export function useNativeTokenBalance() {
  const { library, active, account } = useWeb3React();

  const key = active && account ? [account] : null;

  // TODO: SWR is used only for polling here
  const { data } = useSWR<BigNumber>(key, {
    fetcher: async () => {
      const signer = library.getSigner();

      const result = await signer.getBalance("latest");

      return result;
    },
  });

  return data;
}
