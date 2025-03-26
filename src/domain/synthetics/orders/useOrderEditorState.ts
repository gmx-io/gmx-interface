import { useCallback, useEffect, useMemo, useState } from "react";

import { USD_DECIMALS } from "config/factors";
import { BN_ZERO, getBasisPoints, parseValue } from "lib/numbers";
import { getByKey } from "lib/objects";
import { bigMath } from "sdk/utils/bigmath";
import { isIncreaseOrderType, isStopIncreaseOrderType, isStopLossOrderType, isSwapOrderType } from "sdk/utils/orders";
import { applySlippageToPrice } from "sdk/utils/trade";

import { EditingOrderState, OrderInfo, OrdersInfoData, PositionOrderInfo } from "./types";

export type OrderEditorState = ReturnType<typeof useOrderEditorState>;

export function useOrderEditorState(ordersInfoData: OrdersInfoData | undefined) {
  const [cancellingOrdersKeys, setCancellingOrdersKeys] = useState<string[]>([]);
  const [editingOrderState, setEditingOrderState] = useState<EditingOrderState>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sizeInputValue, setSizeInputValue] = useState("");
  const [triggerPriceInputValue, setTriggerPriceInputValue] = useState("");

  /* eslint-disable react/hook-use-state */
  const [triggerRatioInputValue, _setTriggerRatioInputValue] = useState<string>("");
  const [selectedAllowedSwapSlippageBps, _setSelectedAllowedSwapSlippageBps] = useState<bigint>();
  /* eslint-enable react/hook-use-state */

  const [defaultAllowedSwapSlippageBps, setDefaultAllowedSwapSlippageBps] = useState<bigint>();
  const [shouldCalculateMinOutputAmount, setShouldCalculateMinOutputAmount] = useState(false);

  const setTriggerRatioInputValue = useCallback(
    (value: string) => {
      _setTriggerRatioInputValue(value);
      setShouldCalculateMinOutputAmount(true);
    },
    [_setTriggerRatioInputValue]
  );

  const setSelectedAllowedSwapSlippageBps = useCallback(
    (value: bigint, shouldCalculateMinOutputAmount = true) => {
      _setSelectedAllowedSwapSlippageBps(value);
      setShouldCalculateMinOutputAmount(shouldCalculateMinOutputAmount);
    },
    [_setSelectedAllowedSwapSlippageBps]
  );

  useEffect(
    function resetOrderEditorState() {
      const reset = () => {
        setSizeInputValue("");
        setTriggerPriceInputValue("");
        setTriggerRatioInputValue("");
        setShouldCalculateMinOutputAmount(false);
      };

      if (!editingOrderState?.orderKey) {
        setTimeout(reset, 100);
      }
    },
    [editingOrderState?.orderKey, setShouldCalculateMinOutputAmount, setTriggerRatioInputValue]
  );

  const order = getByKey(ordersInfoData, editingOrderState?.orderKey);

  const triggerPrice = useMemo(() => {
    const order = getByKey(ordersInfoData, editingOrderState?.orderKey);

    let triggerPrice = parseValue(triggerPriceInputValue || "0", USD_DECIMALS);

    if (triggerPrice === 0n) {
      triggerPrice = undefined;
    }

    if (order && !isSwapOrderType(order.orderType)) {
      const positionOrder = order as PositionOrderInfo;
      const toToken = positionOrder?.indexToken;

      if (triggerPrice !== undefined && toToken?.visualMultiplier) {
        triggerPrice = triggerPrice / BigInt(toToken?.visualMultiplier ?? 1);
      }
    }

    return triggerPrice;
  }, [editingOrderState?.orderKey, ordersInfoData, triggerPriceInputValue]);

  const { acceptablePrice, acceptablePriceImpactBps, initialAcceptablePriceImpactBps, setAcceptablePriceImpactBps } =
    useAcceptablePrice(order, triggerPrice);

  return useMemo(() => {
    return {
      cancellingOrdersKeys,
      setCancellingOrdersKeys,
      editingOrderState,
      setEditingOrderState,
      isSubmitting,
      setIsSubmitting,
      sizeInputValue,
      setSizeInputValue,
      triggerPriceInputValue,
      setTriggerPriceInputValue,
      triggerRatioInputValue,
      setTriggerRatioInputValue,

      defaultAllowedSwapSlippageBps,
      setDefaultAllowedSwapSlippageBps,
      selectedAllowedSwapSlippageBps,
      setSelectedAllowedSwapSlippageBps,

      acceptablePrice,
      acceptablePriceImpactBps,
      initialAcceptablePriceImpactBps,
      setAcceptablePriceImpactBps,

      shouldCalculateMinOutputAmount,
      setShouldCalculateMinOutputAmount,
    };
  }, [
    acceptablePrice,
    acceptablePriceImpactBps,
    cancellingOrdersKeys,
    editingOrderState,
    initialAcceptablePriceImpactBps,
    isSubmitting,
    setAcceptablePriceImpactBps,
    sizeInputValue,
    triggerPriceInputValue,
    triggerRatioInputValue,

    defaultAllowedSwapSlippageBps,
    setDefaultAllowedSwapSlippageBps,
    selectedAllowedSwapSlippageBps,
    setSelectedAllowedSwapSlippageBps,

    shouldCalculateMinOutputAmount,
    setShouldCalculateMinOutputAmount,

    setTriggerRatioInputValue,
  ]);
}

function useAcceptablePrice(
  order: OrderInfo | undefined,
  triggerPrice: bigint | undefined
): {
  acceptablePrice: bigint;
  initialAcceptablePriceImpactBps: bigint;
  acceptablePriceImpactBps: bigint;
  setAcceptablePriceImpactBps: (bps: bigint) => void;
} {
  const isSwapOrder = order ? isSwapOrderType(order.orderType) : false;

  let initialAcceptablePriceImpactBps = BN_ZERO;
  if (order && !isSwapOrder) {
    const positionOrder = order as PositionOrderInfo;
    const initialAcceptablePrice = positionOrder.acceptablePrice;
    const initialTriggerPrice = positionOrder.triggerPrice;
    const initialPriceDelta =
      initialAcceptablePrice === undefined ? 0n : bigMath.abs(initialAcceptablePrice - (initialTriggerPrice ?? 0n));
    initialAcceptablePriceImpactBps = getBasisPoints(initialPriceDelta, initialTriggerPrice);
  }

  const [acceptablePriceImpactBps, setAcceptablePriceImpactBps] = useState(initialAcceptablePriceImpactBps);

  useEffect(() => {
    if (!order) {
      setAcceptablePriceImpactBps(initialAcceptablePriceImpactBps);
    }

    if (initialAcceptablePriceImpactBps === acceptablePriceImpactBps) {
      return;
    }

    setAcceptablePriceImpactBps(initialAcceptablePriceImpactBps);
    // Safety: when user opens edit modal while the request is still in progress
    // we want to force set value when the request is finished
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(order as PositionOrderInfo | undefined)?.acceptablePrice?.toString()]);

  let acceptablePrice = BN_ZERO;
  if (order) {
    if (isSwapOrder) {
      acceptablePrice = BN_ZERO;
    } else if (isStopLossOrderType(order.orderType) || isStopIncreaseOrderType(order.orderType)) {
      // For Stop Loss and Stop Market orders Acceptable Price is not applicable and set to 0 or MaxUnit256
      acceptablePrice = (order as PositionOrderInfo).acceptablePrice;
    } else {
      const initialTriggerPrice = (order as PositionOrderInfo).triggerPrice;
      acceptablePrice = applySlippageToPrice(
        Number(acceptablePriceImpactBps),
        triggerPrice ?? initialTriggerPrice,
        order.isLong,
        isIncreaseOrderType(order.orderType)
      );
    }
  }

  return {
    acceptablePrice,
    acceptablePriceImpactBps,
    initialAcceptablePriceImpactBps,
    setAcceptablePriceImpactBps,
  };
}
