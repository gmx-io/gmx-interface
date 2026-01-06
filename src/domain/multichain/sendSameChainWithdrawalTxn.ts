import { encodeFunctionData, PublicClient } from "viem";

import type { SettlementChainId } from "config/chains";
import { getContract } from "config/contracts";
import { applyGasLimitBuffer } from "lib/gas/estimateGasLimit";
import { sendWalletTransaction, TxnCallback, WalletTxnCtx } from "lib/transactions";
import type { WalletSigner } from "lib/wallets";
import { abis } from "sdk/abis";

import type { BridgeOutParams } from "./types";

export async function sendSameChainWithdrawalTxn({
  chainId,
  signer,
  bridgeOutParams,
  callback,
}: {
  chainId: SettlementChainId;
  signer: WalletSigner;
  bridgeOutParams: BridgeOutParams;
  callback?: TxnCallback<WalletTxnCtx>;
}) {
  const multichainTransferRouterAddress = getContract(chainId, "MultichainTransferRouter");

  await sendWalletTransaction({
    chainId: chainId,
    signer: signer,
    to: multichainTransferRouterAddress,
    callData: encodeFunctionData({
      abi: abis.MultichainTransferRouter,
      functionName: "transferOut",
      args: [
        {
          token: bridgeOutParams.token,
          amount: bridgeOutParams.amount,
          minAmountOut: bridgeOutParams.minAmountOut,
          provider: bridgeOutParams.provider,
          data: bridgeOutParams.data,
        },
      ],
    }),
    callback,
  });
}

export async function estimateSameChainWithdrawalGas({
  chainId,
  client,
  bridgeOutParams,
  account,
}: {
  chainId: SettlementChainId;
  client: PublicClient;
  bridgeOutParams: BridgeOutParams;
  account: string;
}): Promise<bigint> {
  const multichainTransferRouterAddress = getContract(chainId, "MultichainTransferRouter");

  const callData = encodeFunctionData({
    abi: abis.MultichainTransferRouter,
    functionName: "transferOut",
    args: [
      {
        token: bridgeOutParams.token,
        amount: bridgeOutParams.amount,
        minAmountOut: bridgeOutParams.minAmountOut,
        provider: bridgeOutParams.provider,
        data: bridgeOutParams.data,
      },
    ],
  });

  const gas = await client.estimateGas({
    account: account,
    to: multichainTransferRouterAddress,
    data: callData,
  });

  return applyGasLimitBuffer(gas);
}
