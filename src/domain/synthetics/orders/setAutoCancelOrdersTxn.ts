import { t } from "@lingui/macro";
import { Signer, ethers } from "ethers";
import { zeroAddress } from "viem";

import { getContract } from "config/contracts";
import { Token } from "domain/tokens";
import { callContract } from "lib/contracts";
import { abis } from "sdk/abis";
import { UiContractsChain } from "sdk/configs/chains";
import { OrderType } from "sdk/types/orders";
import {
  buildUpdateOrderMulticall,
  buildUpdateOrderPayload,
  encodeExchangeRouterMulticall,
} from "sdk/utils/orderTransactions";

export type SetAutoCancelOrdersParams = {
  orderKey: string;
  indexToken?: Token;
  sizeDeltaUsd: bigint;
  triggerPrice: bigint;
  acceptablePrice: bigint;
  minOutputAmount: bigint;
  orderType: OrderType;
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
  const router = new ethers.Contract(getContract(chainId, "ExchangeRouter"), abis.ExchangeRouter, signer);

  const encodedPayload = ps
    .map((p) => {
      const {
        orderKey,
        sizeDeltaUsd,
        triggerPrice,
        acceptablePrice,
        minOutputAmount,
        executionFee,
        indexToken,
        orderType,
      } = p;

      const { multicall } = buildUpdateOrderMulticall(
        buildUpdateOrderPayload({
          chainId,
          orderKey,
          sizeDeltaUsd,
          acceptablePrice,
          triggerPrice,
          minOutputAmount,
          orderType,
          indexTokenAddress: indexToken?.address ?? zeroAddress,
          validFromTime: 0n,
          executionFeeTopUp: executionFee ?? 0n,
          autoCancel: true,
        })
      );

      const { encodedMulticall } = encodeExchangeRouterMulticall(chainId as UiContractsChain, multicall);

      return encodedMulticall;
    })
    .flat();

  return callContract(chainId, router, "multicall", [encodedPayload], {
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
