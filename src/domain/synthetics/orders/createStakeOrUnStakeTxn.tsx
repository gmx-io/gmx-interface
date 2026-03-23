import { t } from "@lingui/macro";
import { ethers, Signer } from "ethers";
import { encodeFunctionData } from "viem";

import { BOTANIX } from "config/chains";
import { getContract } from "config/contracts";
import { estimateGasLimit } from "lib/gas/estimateGasLimit";
import { helperToast } from "lib/helperToast";
import { getProvider } from "lib/rpc";
import { sleep } from "lib/sleep";
import { sendWalletTransaction, TxnEventName } from "lib/transactions";
import StBTCABI from "sdk/abis/StBTC";
import ERC20ABI from "sdk/abis/Token";
import { encodeExchangeRouterMulticall, ExchangeRouterCall, ExternalCallsPayload } from "sdk/utils/orderTransactions";

import { StakeNotification } from "components/StatusNotification/StakeNotification";

export type StakeOrUnstakeParams = {
  amount: bigint;
  isStake: boolean;
  isWrapBeforeStake: boolean;
  isUnwrapAfterStake: boolean;
  setPendingTxns: (txns: any) => void;
};

export async function createStakeOrUnstakeTxn(chainId: number, signer: Signer, p: StakeOrUnstakeParams) {
  if (chainId !== BOTANIX) {
    throw new Error("Stake and unstake is only supported on Botanix chain");
  }

  const externalCalls: ExternalCallsPayload = {
    externalCallTargets: [],
    externalCallDataList: [],
    sendTokens: [],
    sendAmounts: [],
    refundTokens: [],
    refundReceivers: [],
  };

  const multicall: ExchangeRouterCall[] = [];

  const address = await signer.getAddress();

  if (p.isStake) {
    // wrapping
    if (p.isWrapBeforeStake) {
      multicall.push({
        method: "sendWnt",
        params: [getContract(chainId, "ExternalHandler"), p.amount],
      });
    } else {
      multicall.push({
        method: "sendTokens",
        params: [getContract(chainId, "PBTC"), getContract(chainId, "ExternalHandler"), p.amount],
      });
    }

    // staking
    externalCalls.externalCallTargets.push(getContract(chainId, "PBTC"), getContract(chainId, "StBTC"));
    externalCalls.externalCallDataList.push(
      encodeFunctionData({
        abi: ERC20ABI,
        functionName: "approve",
        args: [getContract(chainId, "StBTC"), p.amount],
      }),
      encodeFunctionData({
        abi: StBTCABI,
        functionName: "deposit",
        args: [p.amount, address],
      })
    );
  } else {
    // unwrapping
    if (p.isUnwrapAfterStake) {
      throw new Error("Unwrapping not implemented");
    }

    const stBTC = new ethers.Contract(getContract(chainId, "StBTC"), StBTCABI, signer);
    const gasLimit = await estimateGasLimit(getProvider(undefined, chainId), {
      to: getContract(chainId, "StBTC"),
      data: stBTC.interface.encodeFunctionData("withdraw", [p.amount, address, address]),
      from: address,
      value: undefined,
    });
    const tx = await stBTC.withdraw(p.amount, address, address, { gasLimit });
    await signer.provider?.waitForTransaction(tx.hash, 0);

    helperToast.success(<StakeNotification txnHash={tx.hash} {...p} />);

    return;
  }

  multicall.push({
    method: "makeExternalCalls",
    params: [
      externalCalls.externalCallTargets,
      externalCalls.externalCallDataList,
      externalCalls.refundTokens,
      externalCalls.refundReceivers,
    ],
  });

  const { callData } = encodeExchangeRouterMulticall(multicall);

  return new Promise((resolve, reject) => {
    sendWalletTransaction({
      chainId,
      signer: signer as any,
      to: getContract(chainId, "ExchangeRouter"),
      callData,
      value: p.isWrapBeforeStake ? p.amount : 0n,
      callback: async (event) => {
        switch (event.event) {
          case TxnEventName.Error:
            reject(event.data.error);

            helperToast.error(p.isStake ? t`Failed to stake` : t`Failed to unstake`, {
              tradingErrorInfo: {
                actionName: p.isStake ? "Stake" : "Unstake",
                errorData: event.data.error,
              },
            });
            break;

          case TxnEventName.Sent: {
            if (event.data.type === "wallet") {
              await signer.provider?.waitForTransaction(event.data.transactionHash, 0);
              resolve(undefined);

              helperToast.success(<StakeNotification txnHash={event.data.transactionHash} {...p} />);
            } else {
              // FIXME?
              await sleep(1000);
              resolve(undefined);
            }
            break;
          }
        }
      },
    });
  });
}
