import { t } from "@lingui/macro";
import { Signer, ethers } from "ethers";

import { getContract } from "config/contracts";
import type { SetPendingOrderUpdate } from "context/SyntheticsEvents";
import { convertToContractPrice } from "domain/synthetics/tokens";
import { Token } from "domain/tokens";
import { callContract } from "lib/contracts";
import ExchangeRouter from "sdk/abis/ExchangeRouter.json";
import { Subaccount } from "../gassless/txns/subaccountUtils";
import { SetPendingTransactions } from "context/PendingTxnsContext/PendingTxnsContext";

export type UpdateOrderParams = {
  orderKey: string;
  indexToken?: Token;
  sizeDeltaUsd: bigint;
  triggerPrice: bigint;
  acceptablePrice: bigint;
  minOutputAmount: bigint;
  autoCancel: boolean;
  // used to top-up execution fee for frozen orders
  executionFee?: bigint;
};

export type UpdateOrderCallbacks = {
  setPendingTxns: SetPendingTransactions;
  setPendingOrderUpdate: SetPendingOrderUpdate;
};

export async function updateOrderTxn(
  chainId: number,
  signer: Signer,
  subaccount: Subaccount,
  p: UpdateOrderParams,
  callbacks: UpdateOrderCallbacks
): Promise<void> {
  const {
    orderKey,
    sizeDeltaUsd,
    triggerPrice,
    acceptablePrice,
    minOutputAmount,
    executionFee,
    indexToken,
    autoCancel,
  } = p;

  const router = new ethers.Contract(getContract(chainId, "ExchangeRouter"), ExchangeRouter.abi, signer);

  const encodedPayload = createUpdateEncodedPayload({
    chainId,
    router,
    orderKey,
    sizeDeltaUsd,
    executionFee,
    indexToken,
    acceptablePrice,
    triggerPrice,
    minOutputAmount,
    autoCancel,
  });

  callbacks.setPendingOrderUpdate(p);

  try {
    return await callContract(chainId, router, "multicall", [encodedPayload], {
      value: executionFee != undefined && executionFee > 0 ? executionFee : undefined,
      sentMsg: t`Updating order`,
      successMsg: t`Update order executed`,
      failMsg: t`Failed to update order`,
      setPendingTxns: callbacks.setPendingTxns,
      showPreliminaryMsg: Boolean(subaccount),
    });
  } catch (e) {
    callbacks.setPendingOrderUpdate(p, "remove");
    throw e;
  }
}

export function createUpdateEncodedPayload({
  chainId,
  router,
  orderKey,
  sizeDeltaUsd,
  executionFee,
  indexToken,
  acceptablePrice,
  triggerPrice,
  minOutputAmount,
  autoCancel,
}: {
  chainId: number;
  router: ethers.Contract;
  orderKey: string;
  sizeDeltaUsd: bigint;
  executionFee?: bigint;
  indexToken?: Token;
  acceptablePrice: bigint;
  triggerPrice: bigint;
  minOutputAmount: bigint;
  autoCancel: boolean;
}) {
  const orderVaultAddress = getContract(chainId, "OrderVault");

  const multicall: { method: string; params: any[] }[] = [];
  if (executionFee != undefined && executionFee > 0) {
    multicall.push({ method: "sendWnt", params: [orderVaultAddress, executionFee] });
  }

  multicall.push({
    method: "updateOrder",
    params: [
      orderKey,
      sizeDeltaUsd,
      acceptablePrice !== undefined ? convertToContractPrice(acceptablePrice, indexToken?.decimals || 0) : 0n,
      triggerPrice !== undefined ? convertToContractPrice(triggerPrice, indexToken?.decimals || 0) : 0n,
      minOutputAmount,
      0n,
      autoCancel,
    ],
  });

  return multicall.filter(Boolean).map((call) => router.interface.encodeFunctionData(call!.method, call!.params));
}
