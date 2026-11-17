import { t } from "@lingui/macro";
import { Signer, ethers } from "ethers";
import { zeroAddress } from "viem";

import { getContract } from "config/contracts";
import { Token } from "domain/tokens";
import { callContract } from "lib/contracts";
import { getAbi } from "sdk/abis/getAbi";
import { ContractsChainId } from "sdk/configs/chains";
import { DecreasePositionSwapType, OrderType } from "sdk/utils/orders/types";
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
  decreasePositionSwapType: DecreasePositionSwapType;
  executionFee?: bigint;
};

type SetAutoCancelOrdersMeta = {
  updateOrdersCount: number;
  totalUpdatableOrdersCount: number;
};

export function setAutoCancelOrdersTxn(
  chainId: ContractsChainId,
  signer: Signer,
  setPendingTxns: (txns: any) => void,
  ps: SetAutoCancelOrdersParams[],
  { updateOrdersCount, totalUpdatableOrdersCount }: SetAutoCancelOrdersMeta
): Promise<void> {
  const router = new ethers.Contract(getContract(chainId, "ExchangeRouter"), getAbi(chainId, "ExchangeRouter"), signer);

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
        decreasePositionSwapType,
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
          decreasePositionSwapType,
          executionFeeTopUp: executionFee ?? 0n,
          autoCancel: true,
        })
      );

      const { encodedMulticall } = encodeExchangeRouterMulticall(chainId, multicall);

      return encodedMulticall;
    })
    .flat();

  return callContract(chainId, router, "multicall", [encodedPayload], {
    value: ps.reduce((acc, p) => acc + (p.executionFee ?? 0n), 0n),
    sentMsg: t`Updating ${updateOrdersCount} TP/SL orders...`,
    successMsg:
      updateOrdersCount < totalUpdatableOrdersCount
        ? t`${totalUpdatableOrdersCount - updateOrdersCount} orders not updated, limit reached`
        : t`${updateOrdersCount} TP/SL orders updated`,
    failMsg: t`Failed to update orders`,
    setPendingTxns,
  });
}
