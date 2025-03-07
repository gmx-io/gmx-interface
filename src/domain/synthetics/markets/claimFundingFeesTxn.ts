import { t } from "@lingui/macro";
import { getContract } from "config/contracts";
import { Signer, ethers } from "ethers";
import { callContract } from "lib/contracts";
import { validateSignerAddress } from "lib/contracts/transactionErrors";
import { abis } from "sdk/abis";

type Params = {
  account: string;
  fundingFees: {
    marketAddresses: string[];
    tokenAddresses: string[];
  };
  setPendingTxns: (txns: any) => void;
};

export async function claimFundingFeesTxn(chainId: number, signer: Signer, p: Params) {
  const { setPendingTxns, fundingFees, account } = p;

  await validateSignerAddress(signer, account);

  const contract = new ethers.Contract(getContract(chainId, "ExchangeRouter"), abis.ExchangeRouter, signer);

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
