import { encodeFunctionData, zeroAddress } from "viem";

import type { SourceChainId } from "config/chains";
import { SendParam } from "domain/multichain/types";
import { TxnCallback, WalletTxnCtx, sendWalletTransaction } from "lib/transactions";
import type { WalletSigner } from "lib/wallets";
import { abis } from "sdk/abis";
import { quoteFromNativeFee } from "sdk/utils/multichain/sendParams";

export async function sendCrossChainDepositTxn({
  chainId,
  signer,
  sendParams,
  account,
  tokenAddress,
  stargateAddress,
  quoteSendNativeFee,
  amount,
  callback,
}: {
  chainId: SourceChainId;
  signer: WalletSigner;
  tokenAddress: string;
  stargateAddress: string;
  amount: bigint;
  sendParams: SendParam;
  account: string;
  quoteSendNativeFee: bigint;
  callback?: TxnCallback<WalletTxnCtx>;
}) {
  const isNative = tokenAddress === zeroAddress;
  const value = quoteSendNativeFee + (isNative ? amount : 0n);

  return await sendWalletTransaction({
    chainId: chainId,
    to: stargateAddress,
    signer: signer,
    callData: encodeFunctionData({
      abi: abis.IStargate,
      functionName: "sendToken",
      args: [sendParams, quoteFromNativeFee(quoteSendNativeFee), account],
    }),
    value,
    callback,
  });
}
