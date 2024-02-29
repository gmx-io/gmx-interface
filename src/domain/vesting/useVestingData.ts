import { getContract } from "config/contracts";
import { useChainId } from "lib/chains";
import { contractFetcher } from "lib/contracts";
import { PLACEHOLDER_ACCOUNT, getVestingData } from "lib/legacy";
import useWallet from "lib/wallets/useWallet";
import useSWR from "swr";
import ReaderV2 from "abis/ReaderV2.json";
import { useMemo } from "react";

export default function useVestingData(account?: string) {
  const { active } = useWallet();
  const { chainId } = useChainId();

  const readerAddress = getContract(chainId, "Reader");
  const vesterAddresses = ["GmxVester", "GlpVester", "AffiliateVester"]
    .map((contractName) => getContract(chainId, contractName))
    .filter(Boolean);

  const { data: vestingInfo } = useSWR(
    [`StakeV2:vestingInfo:${active}`, chainId, readerAddress, "getVestingInfo", account ?? PLACEHOLDER_ACCOUNT],
    {
      fetcher: contractFetcher(undefined, ReaderV2, [vesterAddresses.filter(Boolean)]),
    }
  );

  return useMemo(() => {
    if (!vestingInfo) return;
    return getVestingData(vestingInfo);
  }, [vestingInfo]);
}
