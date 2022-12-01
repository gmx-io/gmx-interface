import { useWeb3React } from "@web3-react/core";
import { getContract } from "config/contracts";
import Reader from "abis/ReaderV2.json";
import { contractFetcher } from "lib/contracts";
import useSWR from "swr";

export function useTokenBalances(chainId: number, p: { tokenAddresses: string[] }) {
  const { library, active, account } = useWeb3React();
  const readerAddress = getContract(chainId, "Reader");

  const { data, ...state } = useSWR<any>(
    active ? [active, chainId, readerAddress, "getTokenBalances", account] : null,
    {
      fetcher: contractFetcher(library, Reader, [p.tokenAddresses]),
    }
  );

  return {
    tokenBalances: data,
    ...state,
  };
}
