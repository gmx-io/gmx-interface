import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";

import { USD_DECIMALS } from "config/factors";
import { UI_FEE_RECEIVER_ACCOUNT } from "config/ui";
import {
  usePositionsConstants,
  useUiFeeFactor,
  useUserReferralInfo,
} from "context/SyntheticsStateContext/hooks/globalsHooks";
import { selectExpressGlobalParams } from "context/SyntheticsStateContext/selectors/expressSelectors";
import {
  selectAccount,
  selectChainId,
  selectSrcChainId,
  selectSubaccountForChainAction,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { estimateBatchExpressParams } from "domain/synthetics/express/expressOrderUtils";
import { useExpressOrdersParams } from "domain/synthetics/express/useRelayerFeeHandler";
import { OrderType } from "domain/synthetics/orders";
import { sendBatchOrderTxn } from "domain/synthetics/orders/sendBatchOrderTxn";
import { useOrderTxnCallbacks } from "domain/synthetics/orders/useOrderTxnCallbacks";
import { PositionInfo } from "domain/synthetics/positions";
import { getDecreasePositionAmounts, DecreasePositionAmounts } from "domain/synthetics/trade";
import { useMaxAutoCancelOrdersState } from "domain/synthetics/trade/useMaxAutoCancelOrdersState";
import { calculateDisplayDecimals, formatAmount, formatUsd, parseValue, removeTrailingZeros } from "lib/numbers";
import { useJsonRpcProvider } from "lib/rpc";
import { useEthersSigner } from "lib/wallets/useEthersSigner";
import { DecreasePositionSwapType } from "sdk/types/orders";
import { bigMath } from "sdk/utils/bigmath";
import {
  buildDecreaseOrderPayload,
  CreateOrderTxnParams,
  DecreasePositionOrderParams,
} from "sdk/utils/orderTransactions";

import Button from "components/Button/Button";
import Modal from "components/Modal/Modal";
import NumberInput from "components/NumberInput/NumberInput";
import Tabs from "components/Tabs/Tabs";

type OrderTypeOption = "takeProfit" | "stopLoss";

const ORDER_TYPE_OPTIONS: { value: OrderTypeOption; label: string }[] = [
  { value: "takeProfit", label: t`Take Profit` },
  { value: "stopLoss", label: t`Stop Loss` },
];

type Props = {
  isVisible: boolean;
  setIsVisible: (visible: boolean) => void;
  position: PositionInfo;
  onSuccess?: () => void;
};

export function AddTPSLForm({ isVisible, setIsVisible, position, onSuccess }: Props) {
  const [orderType, setOrderType] = useState<OrderTypeOption>("takeProfit");
  const [priceInput, setPriceInput] = useState("");
  const [sizePercentage, setSizePercentage] = useState(100);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const chainId = useSelector(selectChainId);
  const srcChainId = useSelector(selectSrcChainId);
  const account = useSelector(selectAccount);
  const signer = useEthersSigner();
  const { provider } = useJsonRpcProvider(chainId);
  const { makeOrderTxnCallback } = useOrderTxnCallbacks();
  const globalExpressParams = useSelector(selectExpressGlobalParams);
  const subaccount = useSelector(selectSubaccountForChainAction);
  const userReferralInfo = useUserReferralInfo();
  const { minCollateralUsd, minPositionSizeUsd } = usePositionsConstants();
  const uiFeeFactor = useUiFeeFactor();
  const { autoCancelOrdersLimit } = useMaxAutoCancelOrdersState({ positionKey: position.key });

  const marketInfo = position.marketInfo;
  const collateralToken = position.collateralToken;
  const indexToken = position.indexToken;
  const isLong = position.isLong;

  const visualMultiplier = indexToken?.visualMultiplier ?? 1;
  const priceDecimals = calculateDisplayDecimals(position.markPrice, USD_DECIMALS, visualMultiplier);

  const triggerPrice = useMemo(() => {
    if (!priceInput) return undefined;
    return parseValue(priceInput, USD_DECIMALS);
  }, [priceInput]);

  const sizeDeltaUsd = useMemo(() => {
    return bigMath.mulDiv(position.sizeInUsd, BigInt(sizePercentage * 100), 10000n);
  }, [position.sizeInUsd, sizePercentage]);

  const orderTypeValue = useMemo(() => {
    return orderType === "takeProfit" ? OrderType.LimitDecrease : OrderType.StopLossDecrease;
  }, [orderType]);

  const decreaseAmounts: DecreasePositionAmounts | undefined = useMemo(() => {
    if (
      triggerPrice === undefined ||
      !marketInfo ||
      minCollateralUsd === undefined ||
      minPositionSizeUsd === undefined
    ) {
      return undefined;
    }

    return getDecreasePositionAmounts({
      marketInfo,
      collateralToken,
      isLong,
      position: marketInfo ? { ...position, marketInfo } : undefined,
      closeSizeUsd: sizeDeltaUsd,
      keepLeverage: true,
      triggerPrice,
      userReferralInfo,
      minCollateralUsd,
      minPositionSizeUsd,
      uiFeeFactor,
      isLimit: false,
      limitPrice: undefined,
      triggerOrderType: orderTypeValue,
      isSetAcceptablePriceImpactEnabled: false,
    });
  }, [
    triggerPrice,
    marketInfo,
    collateralToken,
    isLong,
    position,
    sizeDeltaUsd,
    userReferralInfo,
    minCollateralUsd,
    minPositionSizeUsd,
    uiFeeFactor,
    orderTypeValue,
  ]);

  const estimatedPnl = useMemo(() => {
    if (!decreaseAmounts) return undefined;
    return {
      pnlUsd: decreaseAmounts.realizedPnl,
      pnlPercentage: decreaseAmounts.realizedPnlPercentage,
    };
  }, [decreaseAmounts]);

  const orderPayload = useMemo((): CreateOrderTxnParams<DecreasePositionOrderParams> | undefined => {
    if (!decreaseAmounts || !account || !marketInfo) return undefined;

    return buildDecreaseOrderPayload({
      chainId,
      receiver: account,
      collateralDeltaAmount: decreaseAmounts.collateralDeltaAmount ?? 0n,
      collateralTokenAddress: collateralToken.address,
      sizeDeltaUsd: decreaseAmounts.sizeDeltaUsd,
      sizeDeltaInTokens: decreaseAmounts.sizeDeltaInTokens,
      referralCode: userReferralInfo?.referralCodeForTxn,
      uiFeeReceiver: UI_FEE_RECEIVER_ACCOUNT,
      allowedSlippage: 0,
      orderType: orderTypeValue,
      autoCancel: autoCancelOrdersLimit > 0,
      swapPath: [],
      externalSwapQuote: undefined,
      marketAddress: marketInfo.marketTokenAddress,
      indexTokenAddress: marketInfo.indexTokenAddress,
      isLong,
      acceptablePrice: decreaseAmounts.acceptablePrice,
      triggerPrice: decreaseAmounts.triggerPrice,
      receiveTokenAddress: collateralToken.address,
      minOutputUsd: 0n,
      decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
      executionFeeAmount: 0n,
      executionGasLimit: 0n,
      validFromTime: 0n,
    });
  }, [
    decreaseAmounts,
    account,
    marketInfo,
    chainId,
    collateralToken.address,
    userReferralInfo?.referralCodeForTxn,
    orderTypeValue,
    autoCancelOrdersLimit,
    isLong,
  ]);

  const batchParams = useMemo(() => {
    if (!orderPayload) return undefined;
    return {
      createOrderParams: [orderPayload],
      updateOrderParams: [],
      cancelOrderParams: [],
    };
  }, [orderPayload]);

  useExpressOrdersParams({
    orderParams: batchParams,
    label: "Add TP/SL",
    isGmxAccount: srcChainId !== undefined,
  });

  const priceError = useMemo(() => {
    if (triggerPrice === undefined || triggerPrice === 0n) return undefined;

    if (orderType === "takeProfit") {
      if (isLong && triggerPrice <= position.markPrice) {
        return t`Take Profit price must be above Mark Price for Long positions`;
      }
      if (!isLong && triggerPrice >= position.markPrice) {
        return t`Take Profit price must be below Mark Price for Short positions`;
      }
    } else {
      if (isLong && triggerPrice >= position.markPrice) {
        return t`Stop Loss price must be below Mark Price for Long positions`;
      }
      if (!isLong && triggerPrice <= position.markPrice) {
        return t`Stop Loss price must be above Mark Price for Short positions`;
      }
    }
    return undefined;
  }, [triggerPrice, orderType, isLong, position.markPrice]);

  const submitError = useMemo(() => {
    if (!priceInput || triggerPrice === undefined || triggerPrice === 0n) {
      return t`Enter a trigger price`;
    }
    if (priceError) {
      return priceError;
    }
    if (!decreaseAmounts) {
      return t`Unable to calculate order`;
    }
    return undefined;
  }, [priceInput, triggerPrice, priceError, decreaseAmounts]);

  const handleSubmit = useCallback(async () => {
    if (!signer || !provider || !batchParams) return;

    setIsSubmitting(true);

    try {
      const finalExpressParams = globalExpressParams
        ? await estimateBatchExpressParams({
            signer,
            chainId,
            batchParams,
            globalExpressParams,
            requireValidations: true,
            estimationMethod: "approximate",
            provider,
            isGmxAccount: srcChainId !== undefined,
            subaccount,
          })
        : undefined;

      await sendBatchOrderTxn({
        chainId,
        signer,
        batchParams,
        expressParams: finalExpressParams,
        simulationParams: undefined,
        callback: makeOrderTxnCallback({}),
        provider,
        isGmxAccount: srcChainId !== undefined,
      });

      setIsVisible(false);
      onSuccess?.();
    } finally {
      setIsSubmitting(false);
    }
  }, [
    signer,
    provider,
    batchParams,
    chainId,
    srcChainId,
    globalExpressParams,
    subaccount,
    makeOrderTxnCallback,
    setIsVisible,
    onSuccess,
  ]);

  const handlePriceChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setPriceInput(e.target.value);
  }, []);

  const handleSizeChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value)) {
      setSizePercentage(Math.min(100, Math.max(1, value)));
    }
  }, []);

  const orderTypeLabel = orderType === "takeProfit" ? t`Take Profit` : t`Stop Loss`;

  useEffect(() => {
    if (!isVisible) {
      setPriceInput("");
      setSizePercentage(100);
    }
  }, [isVisible]);

  return (
    <Modal
      isVisible={isVisible}
      setIsVisible={setIsVisible}
      label={<Trans>Add {orderTypeLabel}</Trans>}
      className="AddTPSLForm"
    >
      <div className="flex flex-col gap-16">
        <Tabs options={ORDER_TYPE_OPTIONS} selectedValue={orderType} onChange={setOrderType} type="inline" />

        <div className="flex flex-col gap-8">
          <div className="text-body-small text-typography-secondary">
            <Trans>Trigger Price</Trans>
          </div>
          <div
            className={cx(
              "flex items-center justify-between rounded-4 border bg-slate-800 px-12 py-8",
              priceError ? "border-red-500" : "border-slate-800"
            )}
          >
            <NumberInput
              value={priceInput}
              className="bg-transparent w-full text-16 outline-none"
              onValueChange={handlePriceChange}
              placeholder={formatUsd(position.markPrice, {
                displayDecimals: priceDecimals,
                visualMultiplier,
              })}
            />
            <span className="text-typography-secondary">USD</span>
          </div>
          {priceError && <div className="text-body-small text-red-500">{priceError}</div>}
        </div>

        <div className="flex flex-col gap-8">
          <div className="flex items-center justify-between">
            <span className="text-body-small text-typography-secondary">
              <Trans>Close Size</Trans>
            </span>
            <span className="text-body-small text-typography-secondary">
              {sizePercentage}% ({formatUsd(sizeDeltaUsd)})
            </span>
          </div>
          <input type="range" min="1" max="100" value={sizePercentage} onChange={handleSizeChange} className="w-full" />
          <div className="text-body-small flex justify-between text-typography-secondary">
            <span>1%</span>
            <button className="cursor-pointer text-blue-300 hover:text-blue-400" onClick={() => setSizePercentage(100)}>
              MAX
            </button>
          </div>
        </div>

        {estimatedPnl && triggerPrice !== undefined && (
          <div className="flex items-center justify-between rounded-4 bg-slate-800 px-12 py-8">
            <span className="text-typography-secondary">
              <Trans>Est. PnL</Trans>
            </span>
            <span
              className={cx("numbers", {
                "text-green-500": estimatedPnl.pnlUsd > 0n,
                "text-red-500": estimatedPnl.pnlUsd < 0n,
              })}
            >
              {formatUsd(estimatedPnl.pnlUsd)} (
              {removeTrailingZeros(formatAmount(bigMath.abs(estimatedPnl.pnlPercentage), 2, 2))}%)
            </span>
          </div>
        )}

        <Button
          variant="primary-action"
          className="w-full"
          onClick={handleSubmit}
          disabled={!!submitError || isSubmitting}
        >
          {submitError || (isSubmitting ? t`Creating...` : t`Create ${orderTypeLabel}`)}
        </Button>
      </div>
    </Modal>
  );
}
