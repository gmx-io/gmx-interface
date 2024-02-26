import { t } from "@lingui/macro";
import ExchangeRouter from "abis/ExchangeRouter.json";
import { getContract } from "config/contracts";
import { Signer, ethers } from "ethers";
import { callContract } from "lib/contracts";
import { RebateInfoItem } from "../fees/useRebatesInfo";

export type ClaimPriceImpactRebateParams = {
  account: string;
  claimablePositionPriceImpactFees: RebateInfoItem[];
};

export async function createClaimCollateralTxn(
  chainId: number,
  signer: Signer,
  { account, claimablePositionPriceImpactFees }: ClaimPriceImpactRebateParams
) {
  const exchangeRouter = new ethers.Contract(getContract(chainId, "ExchangeRouter"), ExchangeRouter.abi, signer);

  const args: [markets: string[], tokens: string[], timeKeys: number[], account: string] = [[], [], [], account];

  claimablePositionPriceImpactFees.forEach((p) => {
    args[0].push(p.marketAddress);
    args[1].push(p.tokenAddress);
    args[2].push(Number(p.timeKey));
  });

  const txn = await callContract(chainId, exchangeRouter, "claimCollateral", args, {
    sentMsg: t`Claiming Price Impact Rebate...`,
    successMsg: t`Price Impact Rebate Claimed`,
    failMsg: t`Failed to Claim Price Impact Rebate`,
  });

  return txn;
}
