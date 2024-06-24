import { t } from "@lingui/macro";
import { Signer, ethers } from "ethers";

import ExchangeRouter from "abis/ExchangeRouter.json";
import { getContract } from "config/contracts";
import { Subaccount } from "context/SubaccountContext/SubaccountContext";
import { getSubaccountRouterContract } from "domain/synthetics/subaccount/getSubaccountContract";
import { convertToContractPrice } from "domain/synthetics/tokens";
import { Token } from "domain/tokens";
import { callContract } from "lib/contracts";

export type UpdateOrderParams = {
  orderKey: string;
  indexToken?: Token;
  sizeDeltaUsd: bigint;
  triggerPrice: bigint;
  acceptablePrice: bigint;
  minOutputAmount: bigint;
  // used to top-up execution fee for frozen orders
  executionFee?: bigint;
  setPendingTxns: (txns: any) => void;
};

export function updateOrderTxn(
  chainId: number,
  signer: Signer,
  subaccount: Subaccount,
  p: UpdateOrderParams
): Promise<void> {
  const {
    orderKey,
    sizeDeltaUsd,
    triggerPrice,
    acceptablePrice,
    minOutputAmount,
    executionFee,
    setPendingTxns,
    indexToken,
  } = p;

  const router = subaccount
    ? getSubaccountRouterContract(chainId, subaccount.signer)
    : new ethers.Contract(getContract(chainId, "ExchangeRouter"), ExchangeRouter.abi, signer);

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
  });

  return callContract(chainId, router, "multicall", [encodedPayload], {
    value: executionFee != undefined && executionFee > 0 ? executionFee : undefined,
    sentMsg: t`Updating order`,
    successMsg: t`Update order executed`,
    failMsg: t`Failed to update order`,
    customSigners: subaccount?.customSigners,
    setPendingTxns,
    showPreliminaryMsg: Boolean(subaccount),
  });
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
      convertToContractPrice(acceptablePrice, indexToken?.decimals || 0),
      convertToContractPrice(triggerPrice, indexToken?.decimals || 0),
      minOutputAmount,
    ],
  });

  return multicall.filter(Boolean).map((call) => router.interface.encodeFunctionData(call!.method, call!.params));
}
