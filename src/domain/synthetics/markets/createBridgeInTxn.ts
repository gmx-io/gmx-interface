import { t } from "@lingui/macro";
import { encodeFunctionData, zeroAddress } from "viem";

import { SettlementChainId, SourceChainId } from "config/chains";
import { getMappedTokenId, MultichainTokenId } from "config/multichain";
import { estimateMultichainDepositNetworkComposeGas } from "domain/multichain/estimateMultichainDepositNetworkComposeGas";
import { getMultichainTransferSendParams } from "domain/multichain/getSendParams";
import { sendQuoteFromNative } from "domain/multichain/sendQuoteFromNative";
import { toastCustomOrStargateError } from "domain/multichain/toastCustomOrStargateError";
import { SendParam } from "domain/multichain/types";
import { sendWalletTransaction } from "lib/transactions";
import { WalletSigner } from "lib/wallets";
import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";
import { abis } from "sdk/abis";

import { fetchLayerZeroNativeFee } from "./feeEstimation/stargateTransferFees";

export async function getBridgeInTxnParams({
  chainId,
  srcChainId,
  account,
  tokenAddress,
  tokenAmount,
}: {
  chainId: SettlementChainId;
  srcChainId: SourceChainId;
  account: string;
  tokenAddress: string;
  tokenAmount: bigint;
}): Promise<{
  sendParams: SendParam;
  sourceChainTokenId: MultichainTokenId;
  nativeFee: bigint;
  value: bigint;
}> {
  const composeGas = await estimateMultichainDepositNetworkComposeGas({
    chainId,
    account,
    srcChainId,
    tokenAddress,
    settlementChainPublicClient: getPublicClientWithRpc(chainId),
  });

  const sendParams: SendParam = getMultichainTransferSendParams({
    dstChainId: chainId,
    account,
    srcChainId,
    amountLD: tokenAmount,
    composeGas,
    isToGmx: true,
    isManualGas: true,
  });

  const sourceChainTokenId = getMappedTokenId(chainId, tokenAddress, srcChainId);

  if (!sourceChainTokenId) {
    throw new Error("Token ID not found");
  }

  const nativeFee = await fetchLayerZeroNativeFee({
    // We fetch the native fee from the source chain because we are sending from the source chain to the settlement chain
    chainId: srcChainId,
    stargateAddress: sourceChainTokenId.stargate,
    sendParams,
  });
  const value = nativeFee + (tokenAddress === zeroAddress ? tokenAmount : 0n);

  return {
    sendParams,
    sourceChainTokenId,
    nativeFee,
    value,
  };
}

export async function createBridgeInTxn({
  chainId,
  srcChainId,
  signer,
  account,
  tokenAddress,
  tokenAmount,
}: {
  chainId: SettlementChainId;
  srcChainId: SourceChainId;
  signer: WalletSigner;
  account: string;
  tokenAddress: string;
  tokenAmount: bigint;
}) {
  const { sendParams, sourceChainTokenId, nativeFee, value } = await getBridgeInTxnParams({
    chainId,
    srcChainId,
    account,
    tokenAddress,
    tokenAmount,
  });

  try {
    const txnResult = await sendWalletTransaction({
      chainId: srcChainId!,
      to: sourceChainTokenId.stargate,
      signer,
      callData: encodeFunctionData({
        abi: abis.IStargate,
        functionName: "send",
        args: [sendParams, sendQuoteFromNative(nativeFee), account],
      }),
      value,
      msg: t`Sent transfer in transaction`,
    });

    await txnResult.wait();
  } catch (error) {
    toastCustomOrStargateError(chainId, error);
  }
}
