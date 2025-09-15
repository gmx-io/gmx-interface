import { encodeFunctionData, zeroAddress } from "viem";

import type { SourceChainId } from "config/chains";
import { IStargateAbi } from "config/multichain";
import type { QuoteSend } from "domain/multichain/types";
import { TxnCallback, WalletTxnCtx, sendWalletTransaction } from "lib/transactions";
import type { WalletSigner } from "lib/wallets";
import type { SendParamStruct } from "typechain-types-stargate/IStargate";

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
  sendParams: SendParamStruct;
  account: string;
  quoteSend: QuoteSend;
  callback?: TxnCallback<WalletTxnCtx>;
}) {
  const isNative = tokenAddress === zeroAddress;
  const value = isNative ? amount : 0n;

  await sendWalletTransaction({
    chainId: chainId,
    to: stargateAddress,
    signer: signer,
    callData: encodeFunctionData({
      abi: IStargateAbi,
      functionName: "sendToken",
      args: [sendParams, quoteSend, account],
    }),
    value: (quoteSend.nativeFee as bigint) + value,
    callback,
  });
}
