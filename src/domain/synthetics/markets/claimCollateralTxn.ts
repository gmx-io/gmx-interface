import { t } from "@lingui/macro";
import { getContract } from "config/contracts";
import ExchangeRouter from "abis/ExchangeRouter.json";
import { ethers } from "ethers";
import { callContract } from "lib/contracts";
import { Web3Provider } from "@ethersproject/providers";

type Params = {
  account: string;
  fundingFees: {
    marketAddresses: string[];
    tokenAddresses: string[];
  };
  setPendingTxns: (txns: any) => void;
};

export function claimCollateralTxn(chainId: number, library: Web3Provider, p: Params) {
  const { setPendingTxns, fundingFees, account } = p;

  const contract = new ethers.Contract(getContract(chainId, "ExchangeRouter"), ExchangeRouter.abi, library.getSigner());

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
