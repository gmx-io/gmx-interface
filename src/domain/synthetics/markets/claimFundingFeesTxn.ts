import { t } from "@lingui/macro";
import { getContract } from "config/contracts";
import ExchangeRouter from "abis/ExchangeRouter.json";
import { Signer, ethers } from "ethers";
import { callContract } from "lib/contracts";

type Params = {
  account: string;
  fundingFees: {
    marketAddresses: string[];
    tokenAddresses: string[];
  };
  setPendingTxns: (txns: any) => void;
};

export function claimFundingFeesTxn(chainId: number, signer: Signer, p: Params) {
  const { setPendingTxns, fundingFees, account } = p;

  const contract = new ethers.Contract(getContract(chainId, "ExchangeRouter"), ExchangeRouter.abi, signer);

  return callContract(
    chainId,
    contract,
    "claimFundingFees",
    [fundingFees.marketAddresses, fundingFees.tokenAddresses, account],
    {
      sentMsg: t`Funding Claimed`,
      successMsg: t`Success claimings`,
      failMsg: t`Claiming failed`,
      hideSuccessMsg: true,
      setPendingTxns,
    }
  );
}
