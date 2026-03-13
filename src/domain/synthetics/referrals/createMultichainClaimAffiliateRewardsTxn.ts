import { encodeFunctionData, encodePacked } from "viem";

import { ContractsChainId, SourceChainId } from "config/chains";
import { getContract } from "config/contracts";
import { GMX_SIMULATION_ORIGIN } from "config/dataStore";
import { ExpressTxnData, ExpressTxnResult, sendExpressTransaction } from "lib/transactions";
import { WalletSigner } from "lib/wallets";
import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";
import { abis } from "sdk/abis";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { nowInSeconds } from "sdk/utils/time";

import { ExpressTxnParams, RawRelayParamsPayload, RelayParamsPayload } from "../express";
import { signClaimAffiliateRewards } from "./signClaimAffiliateRewards";

type TxnParams = {
  chainId: ContractsChainId;
  srcChainId: SourceChainId | undefined;
  signer: WalletSigner | undefined;
  relayParams: RawRelayParamsPayload;
  emptySignature?: boolean;
  account: string;
  marketAddresses: string[];
  tokenAddresses: string[];
  relayerFeeTokenAddress: string;
  relayerFeeAmount: bigint;
};

export async function buildAndSignMultichainClaimAffiliateRewardsTxn({
  chainId,
  srcChainId,
  signer,
  relayParams,
  emptySignature,
  account,
  marketAddresses,
  tokenAddresses,
  relayerFeeTokenAddress,
  relayerFeeAmount,
}: TxnParams): Promise<ExpressTxnData> {
  let signature: string;

  const relayParamsWithDeadline: RelayParamsPayload = {
    ...relayParams,
    deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
  };

  if (emptySignature) {
    signature = "0x";
  } else {
    if (!signer) {
      throw new Error("Signer is required");
    }
    signature = await signClaimAffiliateRewards({
      signer,
      chainId,
      srcChainId,
      relayParams: relayParamsWithDeadline,
      account,
      marketAddresses,
      tokenAddresses,
    });
  }

  const claimAffiliateRewardsData = encodeFunctionData({
    abi: abis.MultichainClaimsRouter,
    functionName: "claimAffiliateRewards",
    args: [
      {
        ...relayParamsWithDeadline,
        signature,
      },
      account,
      BigInt(srcChainId ?? chainId),
      marketAddresses,
      tokenAddresses,
      account,
    ],
  });

  return {
    callData: claimAffiliateRewardsData,
    to: getContract(chainId, "MultichainClaimsRouter"),
    feeToken: relayerFeeTokenAddress,
    feeAmount: relayerFeeAmount,
  };
}

export async function simulateAndCreateMultichainClaimAffiliateRewardsTxn({
  chainId,
  srcChainId,
  signer,
  account,
  marketAddresses,
  tokenAddresses,
  expressTxnParams,
}: {
  chainId: ContractsChainId;
  srcChainId: SourceChainId | undefined;
  signer: WalletSigner;
  account: string;
  marketAddresses: string[];
  tokenAddresses: string[];
  expressTxnParams: ExpressTxnParams;
}): Promise<ExpressTxnResult> {
  const txnData = await buildAndSignMultichainClaimAffiliateRewardsTxn({
    chainId,
    srcChainId,
    signer,
    account,
    marketAddresses,
    tokenAddresses,
    relayerFeeAmount: expressTxnParams.gasPaymentParams.relayerFeeAmount,
    relayerFeeTokenAddress: expressTxnParams.gasPaymentParams.relayerFeeTokenAddress,
    relayParams: expressTxnParams.relayParamsPayload,
  });

  const client = getPublicClientWithRpc(chainId);
  const relayPayload = encodePacked(
    ["bytes", "address", "address", "uint256"],
    [txnData.callData, getContract(chainId, "GelatoRelayAddress"), txnData.feeToken, txnData.feeAmount]
  );

  try {
    await client.call({
      account: GMX_SIMULATION_ORIGIN,
      to: txnData.to,
      data: relayPayload,
    });
  } catch (error) {
    throw new Error(`Multichain claim simulation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }

  return await sendExpressTransaction({
    chainId,
    txnData,
  });
}
