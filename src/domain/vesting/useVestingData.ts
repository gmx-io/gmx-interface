import { useMemo } from "react";
import useSWR from "swr";
import { zeroAddress } from "viem";

import type { ContractsChainId } from "config/chains";
import { getContract } from "config/contracts";
import { useChainId } from "lib/chains";
import { contractFetcher } from "lib/contracts";
import { PLACEHOLDER_ACCOUNT, getVestingData } from "lib/legacy";
import useWallet from "lib/wallets/useWallet";
import type { ContractName } from "sdk/configs/contracts";

export default function useVestingData(account?: string, targetChainId?: ContractsChainId) {
  const { active } = useWallet();
  const { chainId: currentChainId } = useChainId();
  const chainId = targetChainId ?? currentChainId;

  const readerAddress = getContract(chainId, "Reader");
  const vesterAddresses = (["GmxVester", "GlpVester", "AffiliateVester"] satisfies ContractName[])
    .map((contractName) => getContract(chainId, contractName))
    .filter(Boolean);

  const { data: vestingInfo } = useSWR(
    readerAddress !== zeroAddress && [
      `StakeV2:vestingInfo:${active}`,
      chainId,
      readerAddress,
      "getVestingInfo",
      account ?? PLACEHOLDER_ACCOUNT,
    ],
    {
      fetcher: contractFetcher(undefined, "ReaderV2", [vesterAddresses.filter(Boolean)]),
    }
  );

  return useMemo(() => {
    if (!vestingInfo) return;
    return getVestingData(vestingInfo);
  }, [vestingInfo]);
}
