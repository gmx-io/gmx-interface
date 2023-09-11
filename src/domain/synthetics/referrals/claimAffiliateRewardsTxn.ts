import { t } from "@lingui/macro";
import { getContract } from "config/contracts";
import ExchangeRouter from "abis/ExchangeRouter.json";
import { Signer, ethers } from "ethers";
import { callContract } from "lib/contracts";

type Params = {
  account: string;
  rewardsParams: {
    marketAddresses: string[];
    tokenAddresses: string[];
  };
  setPendingTxns: (txns: any) => void;
};

export function claimAffiliateRewardsTxn(chainId: number, signer: Signer, p: Params) {
  const { setPendingTxns, rewardsParams, account } = p;

  const contract = new ethers.Contract(getContract(chainId, "ExchangeRouter"), ExchangeRouter.abi, signer);

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
