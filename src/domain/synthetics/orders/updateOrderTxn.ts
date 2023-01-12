import { Web3Provider } from "@ethersproject/providers";
import { t } from "@lingui/macro";
import ExchangeRouter from "abis/ExchangeRouter.json";
import { getContract } from "config/contracts";
import { BigNumber, ethers } from "ethers";
import { callContract } from "lib/contracts";
import { getAcceptablePriceForPositionOrder, isIncreaseOrder, isSwapOrder } from "./utils";
import { AggregatedOrderData } from "./types";
import { convertToContractPrice } from "../tokens";

export type UpdateOrderParams = {
  order: AggregatedOrderData;
  executionFee: BigNumber;
  // updates
  sizeDeltaUsd?: BigNumber;
  triggerPrice?: BigNumber;
  minOutputAmount?: BigNumber;
};

export function updateOrderTxn(chainId: number, library: Web3Provider, p: UpdateOrderParams) {
  const exchangeRouter = new ethers.Contract(
    getContract(chainId, "ExchangeRouter"),
    ExchangeRouter.abi,
    library.getSigner()
  );

  let params: any[] = [];

  if (isSwapOrder(p.order.orderType)) {
    if (!p.minOutputAmount) {
      throw new Error("No updates provided");
    }
    params = [p.order.key, BigNumber.from(0), BigNumber.from(0), BigNumber.from(0)];
  } else {
    if (!p.sizeDeltaUsd && !p.triggerPrice) {
      throw new Error("No updates provided");
    }

    const indexToken = p.order.indexToken;

    if (!indexToken) {
      throw new Error("Index token is not available");
    }

    let acceptablePrice = p.order.contractAcceptablePrice;

    const sizeDeltaUsd = p.sizeDeltaUsd || p.order.sizeDeltaUsd;

    if (p.sizeDeltaUsd || p.triggerPrice) {
      acceptablePrice = getAcceptablePriceForPositionOrder({
        isIncrease: isIncreaseOrder(p.order.orderType),
        isLong: p.order.isLong,
        sizeDeltaUsd: p.sizeDeltaUsd,
        triggerPrice: p.triggerPrice,
      });
      acceptablePrice = convertToContractPrice(acceptablePrice, indexToken.decimals);
    }

    const triggerPrice = p.triggerPrice
      ? convertToContractPrice(p.triggerPrice, indexToken.decimals)
      : p.order.contractTriggerPrice;

    params = [p.order.key, sizeDeltaUsd, acceptablePrice, triggerPrice];
  }

  return callContract(chainId, exchangeRouter, "updateOrder", params, {
    value: p.executionFee,
    sentMsg: t`Updating order`,
    successMsg: t`Update order canceled`,
    failMsg: t`Failed to update order`,
  });
}
