import { t } from "@lingui/macro";
import { getContract } from "config/contracts";
import ExchangeRouter from "abis/ExchangeRouter.json";
import { ethers } from "ethers";
import { callContract } from "lib/contracts";
import { Web3Provider } from "@ethersproject/providers";

type Params = {
  account: string;
  rewardsParams: {
    marketAddresses: string[];
    tokenAddresses: string[];
  };
  setPendingTxns: (txns: any) => void;
};

export function claimAffiliateRewardsTxn(chainId: number, library: Web3Provider, p: Params) {
  const { setPendingTxns, rewardsParams, account } = p;

  const contract = new ethers.Contract(getContract(chainId, "ExchangeRouter"), ExchangeRouter.abi, library.getSigner());

  return callContract(
    chainId,
    contract,
    "claimAffiliateRewards",
    [rewardsParams.marketAddresses, rewardsParams.tokenAddresses, account],
    {
      sentMsg: t`Claim request sent`,
      successMsg: t`Success claimings`,
      failMsg: t`Claiming failed`,
      hideSuccessMsg: true,
      setPendingTxns,
    }
  );
}
