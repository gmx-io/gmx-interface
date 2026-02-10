import { encodeFunctionData } from "viem";

import { ISigner } from "lib/transactions/iSigner";
import { sendWalletTransaction } from "lib/transactions/sendWalletTransaction";
import { WalletSigner } from "lib/wallets";
import { abis } from "sdk/abis";
import type { ContractsChainId } from "sdk/configs/chains";
import { getContract } from "sdk/configs/contracts";

type Params = {
  account: string;
  rewardsParams: {
    marketAddresses: string[];
    tokenAddresses: string[];
  };
};

export async function claimAffiliateRewardsTxn(chainId: ContractsChainId, signer: WalletSigner | ISigner, p: Params) {
  const { rewardsParams, account } = p;

  return await sendWalletTransaction({
    chainId,
    signer,
    to: getContract(chainId, "ExchangeRouter"),
    callData: encodeFunctionData({
      abi: abis.ExchangeRouter,
      functionName: "claimAffiliateRewards",
      args: [rewardsParams.marketAddresses, rewardsParams.tokenAddresses, account],
    }),
  });
}
