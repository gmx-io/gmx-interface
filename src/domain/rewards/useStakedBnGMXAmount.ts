import useSWR from "swr";

import { useChainId } from "lib/chains";
import { contractFetcher } from "lib/contracts";
import useWallet from "lib/wallets/useWallet";
import { getContract } from "config/contracts";
import Token from "abis/Token.json";

export function useStakedBnGMXAmount() {
  const { signer, active } = useWallet();
  const { chainId } = useChainId();
  const bnGmxAddress = getContract(chainId, "BN_GMX");
  const feeGmxTrackerAddress = getContract(chainId, "FeeGmxTracker");

  const { data: stakedBnGMXAmount } = useSWR(
    [`stakedBnGMXAmount:${active}`, chainId, bnGmxAddress, "balanceOf", feeGmxTrackerAddress],
    {
      fetcher: contractFetcher(signer, Token),
    }
  );

  return stakedBnGMXAmount;
}
