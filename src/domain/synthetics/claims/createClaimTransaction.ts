import { encodeFunctionData } from "viem";

import { getContract } from "config/contracts";
import { sendWalletTransaction, TxnCallback, WalletTxnCtx } from "lib/transactions";
import type { WalletSigner } from "lib/wallets";
import ClaimHandlerAbi from "sdk/abis/ClaimHandler";
import type { ContractsChainId } from "sdk/configs/chains";

export function getClaimTransactionCallData(
  tokens: string[],
  account: string,
  signature = "0x",
  distributionId: bigint
) {
  const params = tokens.map((token) => ({
    token,
    distributionId,
    termsSignature: signature as `0x${string}`,
  }));

  return encodeFunctionData({
    abi: ClaimHandlerAbi,
    functionName: "claimFunds",
    args: [params, account],
  });
}

export function createClaimAmountsTransaction(data: {
  tokens: string[];
  chainId: ContractsChainId;
  signer: WalletSigner;
  account: string;
  signature: string | undefined;
  distributionId: bigint;
  claimableTokenTitles: Record<string, string>;
  callback: TxnCallback<WalletTxnCtx>;
}) {
  const { tokens, chainId, signer, account, signature, distributionId, callback } = data;
  const callData = getClaimTransactionCallData(tokens, account, signature, distributionId);

  return sendWalletTransaction({
    chainId,
    signer,
    to: getContract(chainId, "ClaimHandler"),
    callData,
    value: 0n,
    callback,
  });
}
