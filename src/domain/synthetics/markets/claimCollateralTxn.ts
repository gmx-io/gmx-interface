import { t } from "@lingui/macro";
import { getContract } from "config/contracts";
import ExchangeRouter from "abis/ExchangeRouter.json";
import { ethers } from "ethers";
import { callContract } from "lib/contracts";
import { Web3Provider } from "@ethersproject/providers";
import { MarketInfo } from "./types";

type Params = {
  account: string;
  marketInfo: MarketInfo[];
  fundingFees: {
    marketAddresses: string[];
    tokenAddresses: string[];
  };
  setPendingTxns: (txns: any) => void;
};

export function claimCollateralTxn(chainId: number, library: Web3Provider, p: Params) {
  const { setPendingTxns, fundingFees, account } = p;

  const contract = new ethers.Contract(getContract(chainId, "ExchangeRouter"), ExchangeRouter.abi, library.getSigner());

  console.log("claim funding", {
    contract: getContract(chainId, "ExchangeRouter"),
    chainId,
    fundingFees,
    params: [fundingFees.marketAddresses, fundingFees.tokenAddresses, account],
    account,
    marketInfo: p.marketInfo,
    abi: ExchangeRouter.abi,
  });

  return callContract(
    chainId,
    contract,
    "claimFundingFees",
    [fundingFees.marketAddresses, fundingFees.tokenAddresses, account],
    {
      sentMsg: t`Claim request sent`,
      successMsg: t`Success claimings`,
      failMsg: t`Claiming failed`,
      hideSuccessMsg: true,
      setPendingTxns,
    }
  );
}
