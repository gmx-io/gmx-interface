import { AnyChainId, getChainName } from "config/chains";
import { OrderType, isMarketOrderType } from "sdk/utils/orders";

import {
  DecreaseOrderMetricData,
  IncreaseOrderMetricData,
  OrderMetricData,
  OrderMetricId,
  SwapMetricData,
  metrics,
} from "./metrics";

declare global {
  interface Window {
    __adrsbl: {
      queue: any[];
      run: (eventName: string, isConversion: boolean, properties?: any[]) => void;
    };
  }
}

export enum AddressablePixelEventName {
  DepositSuccess = "DepositSuccess",
  PositionIncreaseSuccess = "PositionIncreaseSuccess",
  PositionDecreaseSuccess = "PositionDecreaseSuccess",
  SwapSuccess = "SwapSuccess",
}

type AddressablePixelDepositSuccessEvent = {
  eventName: AddressablePixelEventName.DepositSuccess;
  sizeInUsd: number;
  chainId: AnyChainId;
};

type AddressablePixelTradeEvent = {
  eventName:
    | AddressablePixelEventName.PositionIncreaseSuccess
    | AddressablePixelEventName.PositionDecreaseSuccess
    | AddressablePixelEventName.SwapSuccess;
  sizeInUsd: number;
  chainId: AnyChainId;
};

export function sendAddressablePixelEvent(event: AddressablePixelDepositSuccessEvent | AddressablePixelTradeEvent) {
  const isConversion =
    event.eventName === AddressablePixelEventName.PositionIncreaseSuccess ||
    event.eventName === AddressablePixelEventName.PositionDecreaseSuccess ||
    event.eventName === AddressablePixelEventName.SwapSuccess;

  const chainName = getChainName(event.chainId);
  const sizeInUsd = Math.round(Math.abs(event.sizeInUsd));

  const properties = [
    {
      name: "chain",
      value: chainName,
    },
    {
      name: "sizeInUsd",
      value: sizeInUsd,
    },
  ];

  try {
    window.__adrsbl.run(event.eventName, isConversion, properties);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error sending Addressable Pixel event", error);
  }
}

export function sendAddressablePixelEventForOrder({
  metricId,
  orderType,
  chainId,
  srcChainId,
}: {
  metricId: OrderMetricId;
  orderType: OrderType;
  chainId: AnyChainId;
  srcChainId?: AnyChainId;
}) {
  const metricData = metrics.getCachedMetricData(metricId) as OrderMetricData | undefined;

  if (!metricData || !isMarketOrderType(orderType)) {
    return;
  }

  let sizeInUsd: number | undefined;
  let eventName: AddressablePixelEventName | undefined;

  if (orderType === OrderType.MarketIncrease) {
    sizeInUsd = (metricData as IncreaseOrderMetricData).sizeDeltaUsd;
    eventName = AddressablePixelEventName.PositionIncreaseSuccess;
  } else if (orderType === OrderType.MarketDecrease) {
    sizeInUsd = (metricData as DecreaseOrderMetricData).sizeDeltaUsd;
    eventName = AddressablePixelEventName.PositionDecreaseSuccess;
  } else if (orderType === OrderType.MarketSwap) {
    sizeInUsd = (metricData as SwapMetricData).amountUsd;
    eventName = AddressablePixelEventName.SwapSuccess;
  }

  if (sizeInUsd === undefined || eventName === undefined) {
    return;
  }

  sendAddressablePixelEvent({
    eventName,
    sizeInUsd,
    chainId: srcChainId ?? chainId,
  });
}
