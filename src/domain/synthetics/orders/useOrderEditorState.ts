import { useEffect, useMemo, useState } from "react";
import { OrderInfo, OrderType, OrdersInfoData, PositionOrderInfo } from "./types";
import { isIncreaseOrderType, isSwapOrderType } from "./utils";
import { BN_ZERO, getBasisPoints, parseValue } from "lib/numbers";
import { applySlippageToPrice } from "../trade";
import { USD_DECIMALS } from "lib/legacy";
import { getByKey } from "lib/objects";
import { bigMath } from "lib/bigmath";

export type OrderEditorState = ReturnType<typeof useOrderEditorState>;

export function useOrderEditorState(ordersInfoData: OrdersInfoData | undefined) {
  const [cancellingOrdersKeys, setCancellingOrdersKeys] = useState<string[]>([]);
  const [editingOrderKey, setEditingOrderKey] = useState<string>();
  const [sizeInputValue, setSizeInputValue] = useState("");
  const [triggerPriceInputValue, setTriggerPriceInputValue] = useState("");
  const [triggerRatioInputValue, setTriggerRatioInputValue] = useState<string>("");

  useEffect(
    function resetOrderEditorState() {
      const reset = () => {
        setSizeInputValue("");
        setTriggerPriceInputValue("");
        setTriggerRatioInputValue("");
      };

      if (!editingOrderKey) {
        setTimeout(reset, 100);
      }
    },
    [editingOrderKey]
  );

  const triggerPrice = useMemo(() => parseValue(triggerPriceInputValue || "0", USD_DECIMALS), [triggerPriceInputValue]);
  const order = getByKey(ordersInfoData, editingOrderKey);
  const { acceptablePrice, acceptablePriceImpactBps, initialAcceptablePriceImpactBps, setAcceptablePriceImpactBps } =
    useAcceptablePrice(order, triggerPrice);

  return useMemo(
    () => ({
      cancellingOrdersKeys,
      setCancellingOrdersKeys,
      editingOrderKey,
      setEditingOrderKey,
      sizeInputValue,
      setSizeInputValue,
      triggerPriceInputValue,
      setTriggerPriceInputValue,
      triggerRatioInputValue,
      setTriggerRatioInputValue,

      acceptablePrice,
      acceptablePriceImpactBps,
      initialAcceptablePriceImpactBps,
      setAcceptablePriceImpactBps,
    }),
    [
      acceptablePrice,
      acceptablePriceImpactBps,
      cancellingOrdersKeys,
      editingOrderKey,
      initialAcceptablePriceImpactBps,
      setAcceptablePriceImpactBps,
      sizeInputValue,
      triggerPriceInputValue,
      triggerRatioInputValue,
    ]
  );
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
    } else if (order.orderType === OrderType.StopLossDecrease) {
      // For SL orders Acceptable Price is not applicable and set to 0 or MaxUnit256
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
