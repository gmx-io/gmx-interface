import { encodeFunctionData, zeroAddress } from "viem";

import type { SourceChainId } from "config/chains";
import { SendParam } from "domain/multichain/types";
import { TxnCallback, WalletTxnCtx, sendWalletTransaction } from "lib/transactions";
import type { WalletSigner } from "lib/wallets";
import { abis } from "sdk/abis";

import type { MessagingFee } from "./types";

export async function sendCrossChainDepositTxn({
  chainId,
  signer,
  sendParams,
  account,
  tokenAddress,
  stargateAddress,
  quoteSend,
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
  quoteSend: MessagingFee;
  callback?: TxnCallback<WalletTxnCtx>;
}) {
  const isNative = tokenAddress === zeroAddress;
  const value = isNative ? amount : 0n;

  await sendWalletTransaction({
    chainId: chainId,
    to: stargateAddress,
    signer: signer,
    callData: encodeFunctionData({
      abi: abis.IStargate,
      functionName: "sendToken",
      args: [sendParams, quoteSend, account],
    }),
    value: (quoteSend.nativeFee as bigint) + value,
    callback,
  });
}
