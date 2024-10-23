import { t } from "@lingui/macro";
import { Signer, ethers } from "ethers";

import ExchangeRouter from "abis/ExchangeRouter.json";
import { getContract } from "config/contracts";
import { Token } from "domain/tokens";
import { callContract } from "lib/contracts";
import { createUpdateEncodedPayload } from "./updateOrderTxn";
import flatten from "lodash/flatten";

export type SetAutoCancelOrdersParams = {
  orderKey: string;
  indexToken?: Token;
  sizeDeltaUsd: bigint;
  triggerPrice: bigint;
  acceptablePrice: bigint;
  minOutputAmount: bigint;
  executionFee?: bigint;
};

type SetAutoCancelOrdersMeta = {
  updateOrdersCount: number;
  totalUpdatableOrdersCount: number;
};

export function setAutoCancelOrdersTxn(
  chainId: number,
  signer: Signer,
  setPendingTxns: (txns: any) => void,
  ps: SetAutoCancelOrdersParams[],
  { updateOrdersCount, totalUpdatableOrdersCount }: SetAutoCancelOrdersMeta
): Promise<void> {
  const router = new ethers.Contract(getContract(chainId, "ExchangeRouter"), ExchangeRouter.abi, signer);

  const encodedPayload = ps.map((p) => {
    const { orderKey, sizeDeltaUsd, triggerPrice, acceptablePrice, minOutputAmount, executionFee, indexToken } = p;

    return createUpdateEncodedPayload({
      chainId,
      router,
      orderKey,
      sizeDeltaUsd,
      executionFee,
      indexToken,
      acceptablePrice,
      triggerPrice,
      minOutputAmount,
      autoCancel: true,
    });
  });

  return callContract(chainId, router, "multicall", [flatten(encodedPayload)], {
    value: ps.reduce((acc, p) => acc + (p.executionFee ?? 0n), 0n),
    sentMsg: t`Updating ${updateOrdersCount} TP/SL order(s)`,
    successMsg:
      updateOrdersCount < totalUpdatableOrdersCount
        ? t`${totalUpdatableOrdersCount - updateOrdersCount} orders were not updated as max order limit reached`
        : t`${updateOrdersCount} TP/SL order(s) updated`,
    failMsg: t`Failed to update order(s)`,
    setPendingTxns,
  });
}
