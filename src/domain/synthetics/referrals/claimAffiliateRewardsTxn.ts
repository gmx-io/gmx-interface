import { encodeFunctionData, type Address } from "viem";

import { applyGasLimitBuffer } from "lib/gas/estimateGasLimit";
import { ISigner } from "lib/transactions/iSigner";
import { sendWalletTransaction } from "lib/transactions/sendWalletTransaction";
import { WalletSigner } from "lib/wallets";
import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";
import { abis } from "sdk/abis";
import type { ContractsChainId } from "sdk/configs/chains";
import { getContract } from "sdk/configs/contracts";
import { encodeExchangeRouterMulticall, type ExternalCallsPayload } from "sdk/utils/orderTransactions";

type Params = {
  account: string;
  rewardsParams: {
    marketAddresses: string[];
    tokenAddresses: string[];
  };
};

type SwapExternalCalls = Pick<
  ExternalCallsPayload,
  "externalCallTargets" | "externalCallDataList" | "refundTokens" | "refundReceivers"
>;

function getClaimAffiliateRewardsAndSwapCallData({
  chainId,
  rewardsParams,
  externalCalls,
}: {
  chainId: ContractsChainId;
  rewardsParams: Params["rewardsParams"];
  externalCalls: SwapExternalCalls;
}) {
  const externalHandlerAddress = getContract(chainId, "ExternalHandler");

  return encodeExchangeRouterMulticall([
    {
      method: "claimAffiliateRewards",
      params: [rewardsParams.marketAddresses, rewardsParams.tokenAddresses, externalHandlerAddress],
    },
    {
      method: "makeExternalCalls",
      params: [
        externalCalls.externalCallTargets,
        externalCalls.externalCallDataList,
        externalCalls.refundTokens,
        externalCalls.refundReceivers,
      ],
    },
  ]);
}

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

export async function claimAffiliateRewardsAndSwapTxn(
  chainId: ContractsChainId,
  signer: WalletSigner | ISigner,
  p: Params & {
    externalCalls: SwapExternalCalls;
    gasLimit?: bigint;
  }
) {
  const { rewardsParams, externalCalls, gasLimit } = p;

  const exchangeRouterAddress = getContract(chainId, "ExchangeRouter") as Address;
  const { callData } = getClaimAffiliateRewardsAndSwapCallData({
    chainId,
    rewardsParams,
    externalCalls,
  });

  return await sendWalletTransaction({
    chainId,
    signer,
    to: exchangeRouterAddress,
    callData,
    gasLimit,
  });
}

export async function simulateAndClaimAffiliateRewardsAndSwapTxn(
  chainId: ContractsChainId,
  signer: WalletSigner | ISigner,
  p: Params & {
    externalCalls: SwapExternalCalls;
  }
) {
  const { account, rewardsParams, externalCalls } = p;

  const client = getPublicClientWithRpc(chainId);
  const exchangeRouterAddress = getContract(chainId, "ExchangeRouter");
  const { callData } = getClaimAffiliateRewardsAndSwapCallData({
    chainId,
    rewardsParams,
    externalCalls,
  });

  const gasLimit = await client
    .estimateGas({
      account,
      to: exchangeRouterAddress,
      data: callData,
    })
    .then(applyGasLimitBuffer);

  await client.call({
    account,
    to: exchangeRouterAddress,
    data: callData,
    gas: gasLimit,
  });

  return await claimAffiliateRewardsAndSwapTxn(chainId, signer, {
    account,
    rewardsParams,
    externalCalls,
    gasLimit,
  });
}
