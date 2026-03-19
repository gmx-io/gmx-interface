import { encodeFunctionData } from "viem";

import { applyGasLimitBuffer } from "lib/gas/estimateGasLimit";
import { ISigner } from "lib/transactions/iSigner";
import { sendWalletTransaction } from "lib/transactions/sendWalletTransaction";
import { WalletSigner } from "lib/wallets";
import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";
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

function getClaimAffiliateRewardsCallData({
  rewardsParams,
  receiver,
}: {
  rewardsParams: Params["rewardsParams"];
  receiver: string;
}) {
  return encodeFunctionData({
    abi: abis.ExchangeRouter,
    functionName: "claimAffiliateRewards",
    args: [rewardsParams.marketAddresses, rewardsParams.tokenAddresses, receiver],
  });
}

export async function estimateClaimAffiliateRewardsGas(chainId: ContractsChainId, p: Params) {
  const { account, rewardsParams } = p;
  const client = getPublicClientWithRpc(chainId);
  const exchangeRouterAddress = getContract(chainId, "ExchangeRouter");

  const callData = getClaimAffiliateRewardsCallData({
    rewardsParams,
    receiver: account,
  });

  return client
    .estimateGas({
      account,
      to: exchangeRouterAddress,
      data: callData,
    })
    .then(applyGasLimitBuffer);
}

export async function claimAffiliateRewardsTxn(chainId: ContractsChainId, signer: WalletSigner | ISigner, p: Params) {
  const { rewardsParams, account } = p;

  return await sendWalletTransaction({
    chainId,
    signer,
    to: getContract(chainId, "ExchangeRouter"),
    callData: getClaimAffiliateRewardsCallData({
      rewardsParams,
      receiver: account,
    }),
  });
}
