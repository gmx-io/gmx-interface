import { ethers, Signer } from "ethers";
import { encodeFunctionData } from "viem";

import { BOTANIX } from "config/chains";
import { getContract } from "config/contracts";
import { helperToast } from "lib/helperToast";
import { sleep } from "lib/sleep";
import { sendWalletTransaction, TxnEventName } from "lib/transactions";
import StBTCABI from "sdk/abis/StBTC.json";
import ERC20ABI from "sdk/abis/Token.json";
import { encodeExchangeRouterMulticall, ExchangeRouterCall, ExternalCallsPayload } from "sdk/utils/orderTransactions";

type StakeOrUnstakeParams = {
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
        abi: ERC20ABI.abi,
        functionName: "approve",
        args: [getContract(chainId, "StBTC"), p.amount],
      }),
      encodeFunctionData({
        abi: StBTCABI.abi,
        functionName: "deposit",
        args: [p.amount, address],
      })
    );
  } else {
    // unwrapping
    if (p.isUnwrapAfterStake) {
      throw new Error("Unwrapping not implemented");
    }

    const stBTC = new ethers.Contract(getContract(chainId, "StBTC"), StBTCABI.abi, signer);
    const tx = await stBTC.withdraw(p.amount, address, address);
    await signer.provider?.waitForTransaction(tx.hash, 0);

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
            break;

          case TxnEventName.Sent: {
            if (event.data.type === "wallet") {
              await signer.provider?.waitForTransaction(event.data.transactionHash, 0);
              resolve(undefined);

              helperToast.success("Done");
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
