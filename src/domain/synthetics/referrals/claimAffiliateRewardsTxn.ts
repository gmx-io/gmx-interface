import { t } from "@lingui/macro";
import { Signer, ethers } from "ethers";

import { getContract } from "config/contracts";
import { callContract } from "lib/contracts";
import { abis } from "sdk/abis";
import type { ContractsChainId } from "sdk/configs/chains";

import { validateSignerAddress } from "components/Errors/errorToasts";

type Params = {
  account: string;
  rewardsParams: {
    marketAddresses: string[];
    tokenAddresses: string[];
  };
  setPendingTxns: (txns: any) => void;
};

export async function claimAffiliateRewardsTxn(chainId: ContractsChainId, signer: Signer, p: Params) {
  const { setPendingTxns, rewardsParams, account } = p;

  await validateSignerAddress(signer, account);

  const contract = new ethers.Contract(getContract(chainId, "ExchangeRouter"), abis.ExchangeRouter, signer);

  return callContract(
    chainId,
    contract,
    "claimAffiliateRewards",
    [rewardsParams.marketAddresses, rewardsParams.tokenAddresses, account],
    {
      sentMsg: t`Affiliate rewards claimed.`,
      successMsg: t`Claiming successful.`,
      failMsg: t`Claiming failed.`,
      hideSuccessMsg: true,
      setPendingTxns,
    }
  );
}
