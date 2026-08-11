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
  /** Position collateral token: margin deposits never swap, so it is both the pay and the collateral token. */
  collateralTokenAddress: string;
  collateralDeltaAmount: bigint;
  triggerPrice: bigint;
  isLong: boolean;
  marketAddress: string;
  indexTokenAddress: string;
  allowedSlippage: number;
  /** Order to cancel in the same batch when the user edits an existing margin deposit. */
  replacingOrderKey: string | undefined;
};

/**
 * Conditional margin deposit: a Limit Increase with no size delta and mandatory auto-cancel.
 * Replacing an existing deposit cancels it in the same batch, so one signature covers both.
 */
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
