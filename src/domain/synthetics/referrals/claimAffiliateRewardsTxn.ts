import { t } from "@lingui/macro";
import { getContract } from "config/contracts";
import ExchangeRouter from "sdk/abis/ExchangeRouter.json";
import { Signer, ethers } from "ethers";
import { callContract } from "lib/contracts";
import { validateSignerAddress } from "lib/contracts/transactionErrors";

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
