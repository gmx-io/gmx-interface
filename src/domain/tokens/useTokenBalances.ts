import { useWeb3React } from "@web3-react/core";
import { getContract } from "config/contracts";
import ReaderV2 from "abis/ReaderV2.json";
import { useChainId } from "lib/chains";
import { contractFetcher } from "lib/contracts";
import { PLACEHOLDER_ACCOUNT } from "lib/legacy";
import useSWR from "swr";
import { BigNumber } from "ethers";

export function useTokenBalances(p: { tokenAddresses: string[] }) {
  const { chainId } = useChainId();
  const { library, active, account } = useWeb3React();
  const readerAddress = getContract(chainId, "Reader");

  const cacheKey = [`getTokenBalances`, active, chainId, readerAddress, account || PLACEHOLDER_ACCOUNT];

  const { data, ...state } = useSWR<BigNumber[]>(cacheKey, {
    fetcher: contractFetcher(library, ReaderV2, [p.tokenAddresses]),
  });

  return {
    tokenBalances: data,
    ...state,
  };
}
