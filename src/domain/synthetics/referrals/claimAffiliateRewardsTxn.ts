import { t } from "@lingui/macro";
import { Signer, ethers } from "ethers";

import { getContract } from "config/contracts";
import { callContract } from "lib/contracts";
import { abis } from "sdk/abis";

import { validateSignerAddress } from "components/Errors/txnErrorsToasts";

type Params = {
  account: string;
  rewardsParams: {
    marketAddresses: string[];
    tokenAddresses: string[];
  };
  setPendingTxns: (txns: any) => void;
};

export async function claimAffiliateRewardsTxn(chainId: number, signer: Signer, p: Params) {
  const { setPendingTxns, rewardsParams, account } = p;

  await validateSignerAddress(signer, account);

  const contract = new ethers.Contract(getContract(chainId, "ExchangeRouter"), abis.ExchangeRouter, signer);

  return callContract(
    chainId,
    contract,
    "claimAffiliateRewards",
    [rewardsParams.marketAddresses, rewardsParams.tokenAddresses, account],
    {
      sentMsg: t`Affiliate Rewards Claimed`,
      successMsg: t`Success claimings`,
      failMsg: t`Claiming failed`,
      hideSuccessMsg: true,
      setPendingTxns,
    }
  );
}
