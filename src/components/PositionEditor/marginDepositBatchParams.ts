import type { ContractsChainId } from "config/chains";
import { UI_FEE_RECEIVER_ACCOUNT } from "config/ui";
import { OrderType } from "domain/synthetics/orders";
import { BatchOrderTxnParams, buildIncreaseOrderPayload } from "sdk/utils/orderTransactions";

export type MarginDepositBatchParams = {
  chainId: ContractsChainId;
  receiver: string;
  executionFeeAmount: bigint;
  executionGasLimit: bigint;
  referralCode: string | undefined;
  /** Pay and collateral token at once: margin deposits never swap. */
  collateralTokenAddress: string;
  collateralDeltaAmount: bigint;
  triggerPrice: bigint;
  isLong: boolean;
  marketAddress: string;
  indexTokenAddress: string;
  allowedSlippage: number;
  /** Cancelled in the same batch when replacing an existing deposit. */
  replacingOrderKey: string | undefined;
};

/** A Limit Increase with zero size and mandatory auto-cancel; a replaced order is cancelled in the same batch. */
export function buildMarginDepositBatchParams(p: MarginDepositBatchParams): BatchOrderTxnParams {
  const createOrderParams = buildIncreaseOrderPayload({
    chainId: p.chainId,
    receiver: p.receiver,
    executionFeeAmount: p.executionFeeAmount,
    executionGasLimit: p.executionGasLimit,
    referralCode: p.referralCode,
    swapPath: [],
    externalSwapQuote: undefined,
    payTokenAddress: p.collateralTokenAddress,
    payTokenAmount: p.collateralDeltaAmount,
    collateralTokenAddress: p.collateralTokenAddress,
    collateralDeltaAmount: p.collateralDeltaAmount,
    sizeDeltaUsd: 0n,
    sizeDeltaInTokens: 0n,
    acceptablePrice: p.triggerPrice,
    triggerPrice: p.triggerPrice,
    orderType: OrderType.LimitIncrease,
    isLong: p.isLong,
    marketAddress: p.marketAddress,
    indexTokenAddress: p.indexTokenAddress,
    uiFeeReceiver: UI_FEE_RECEIVER_ACCOUNT,
    allowedSlippage: p.allowedSlippage,
    autoCancel: true,
    validFromTime: 0n,
  });

  return {
    createOrderParams: [createOrderParams],
    updateOrderParams: [],
    cancelOrderParams: p.replacingOrderKey !== undefined ? [{ orderKey: p.replacingOrderKey }] : [],
  };
}
