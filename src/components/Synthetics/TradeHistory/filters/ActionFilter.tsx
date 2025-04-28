import type { MessageDescriptor } from "@lingui/core";
import { msg, t } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { useMemo } from "react";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { OrderType } from "domain/synthetics/orders/types";
import { TradeActionType } from "sdk/types/tradeHistory";

import { TableOptionsFilter } from "components/Synthetics/TableOptionsFilter/TableOptionsFilter";

import { actionTextMap, getActionTitle } from "../keys";

type Item = {
  orderType: OrderType[];
  isTwap?: boolean;
  isDepositOrWithdraw?: boolean;
  text?: MessageDescriptor;
  eventName: TradeActionType;
  debug?: boolean;
};

type Group = {
  groupName: MessageDescriptor;
  items: Item[];
};

type Groups = Group[];

const GROUPS: Groups = [
  {
    groupName: msg`Market Orders`,
    items: [
      {
        orderType: [OrderType.MarketIncrease],
        eventName: TradeActionType.OrderExecuted,
      },
      {
        orderType: [OrderType.MarketDecrease],
        eventName: TradeActionType.OrderExecuted,
      },
      {
        orderType: [OrderType.MarketIncrease],
        eventName: TradeActionType.OrderExecuted,
        isDepositOrWithdraw: true,
        text: actionTextMap["Deposit-OrderExecuted"],
      },
      {
        orderType: [OrderType.MarketDecrease],
        eventName: TradeActionType.OrderExecuted,
        isDepositOrWithdraw: true,
        text: actionTextMap["Withdraw-OrderExecuted"],
      },
      {
        orderType: [OrderType.MarketIncrease],
        eventName: TradeActionType.OrderCancelled,
      },
      {
        orderType: [OrderType.MarketDecrease],
        eventName: TradeActionType.OrderCancelled,
      },
      {
        orderType: [OrderType.MarketIncrease],
        eventName: TradeActionType.OrderCancelled,
        isDepositOrWithdraw: true,
        text: actionTextMap["Deposit-OrderCancelled"],
      },
      {
        orderType: [OrderType.MarketDecrease],
        eventName: TradeActionType.OrderCancelled,
        isDepositOrWithdraw: true,
        text: actionTextMap["Withdraw-OrderCancelled"],
      },
      {
        orderType: [OrderType.MarketIncrease],
        eventName: TradeActionType.OrderCreated,
        debug: true,
      },
      {
        orderType: [OrderType.MarketDecrease],
        eventName: TradeActionType.OrderCreated,
        debug: true,
      },
      {
        orderType: [OrderType.MarketIncrease],
        eventName: TradeActionType.OrderCreated,
        isDepositOrWithdraw: true,
        text: actionTextMap["Deposit-OrderCreated"],
        debug: true,
      },
      {
        orderType: [OrderType.MarketDecrease],
        eventName: TradeActionType.OrderCreated,
        isDepositOrWithdraw: true,
        text: actionTextMap["Withdraw-OrderCreated"],
        debug: true,
      },
    ],
  },
  {
    groupName: msg`Trigger Orders`,
    items: [
      TradeActionType.OrderExecuted,
      TradeActionType.OrderCreated,
      TradeActionType.OrderUpdated,
      TradeActionType.OrderCancelled,
      TradeActionType.OrderFrozen,
    ].flatMap((eventName) =>
      [OrderType.LimitIncrease, OrderType.StopIncrease, OrderType.LimitDecrease, OrderType.StopLossDecrease].map(
        (orderType) => ({
          orderType: [orderType],
          eventName,
        })
      )
    ),
  },
  {
    groupName: msg`TWAP Orders`,
    items: [
      {
        eventName: TradeActionType.OrderCreated,
        isTwap: true,
        orderType: [OrderType.LimitIncrease, OrderType.LimitDecrease],
      },
      {
        eventName: TradeActionType.OrderCancelled,
        isTwap: true,
        orderType: [OrderType.LimitIncrease, OrderType.LimitDecrease],
      },
      {
        eventName: TradeActionType.OrderExecuted,
        isTwap: true,
        orderType: [OrderType.LimitIncrease, OrderType.LimitDecrease],
      },
      {
        eventName: TradeActionType.OrderFrozen,
        isTwap: true,
        orderType: [OrderType.LimitIncrease, OrderType.LimitDecrease],
      },
    ],
  },
  {
    groupName: msg`Swaps`,
    items: [
      {
        orderType: [OrderType.MarketSwap],
        eventName: TradeActionType.OrderExecuted,
      },
      {
        orderType: [OrderType.LimitSwap],
        eventName: TradeActionType.OrderExecuted,
      },
      {
        orderType: [OrderType.LimitSwap],
        eventName: TradeActionType.OrderCreated,
      },
      {
        orderType: [OrderType.LimitSwap],
        eventName: TradeActionType.OrderUpdated,
      },
      {
        orderType: [OrderType.LimitSwap],
        eventName: TradeActionType.OrderCancelled,
      },
      {
        orderType: [OrderType.MarketSwap],
        eventName: TradeActionType.OrderCancelled,
      },
      {
        orderType: [OrderType.LimitSwap],
        eventName: TradeActionType.OrderFrozen,
      },
      {
        orderType: [OrderType.MarketSwap],
        eventName: TradeActionType.OrderCreated,
        debug: true,
      },
    ],
  },
  {
    groupName: msg`TWAP Swaps`,
    items: [
      {
        eventName: TradeActionType.OrderCreated,
        isTwap: true,
        orderType: [OrderType.LimitSwap],
      },
      {
        eventName: TradeActionType.OrderCancelled,
        isTwap: true,
        orderType: [OrderType.LimitSwap],
      },
      {
        eventName: TradeActionType.OrderExecuted,
        isTwap: true,
        orderType: [OrderType.LimitSwap],
      },
      {
        eventName: TradeActionType.OrderFrozen,
        isTwap: true,
        orderType: [OrderType.LimitSwap],
      },
    ],
  },
  {
    groupName: msg`Liquidation`,
    items: [
      {
        eventName: TradeActionType.OrderExecuted,
        orderType: [OrderType.Liquidation],
      },
    ],
  },
];

type Props = {
  value: {
    orderType: OrderType[];
    eventName: TradeActionType;
    isDepositOrWithdraw: boolean;
    isTwap: boolean;
  }[];
  onChange: (
    value: {
      orderType: OrderType[];
      eventName: TradeActionType;
      isDepositOrWithdraw: boolean;
      isTwap: boolean;
    }[]
  ) => void;
};

export function ActionFilter({ value, onChange }: Props) {
  const { _ } = useLingui();
  const { showDebugValues } = useSettings();

  const localizedGroups = useMemo(() => {
    return GROUPS.map((group) => {
      return {
        groupName: _(group.groupName),
        items: group.items
          .filter((item) => !item.debug || showDebugValues)
          .map((item) => {
            return {
              data: {
                orderType: item.orderType,
                eventName: item.eventName,
                isDepositOrWithdraw: Boolean(item.isDepositOrWithdraw),
                isTwap: Boolean(item.isTwap),
              },
              text: item.text
                ? _(item.text)
                : getActionTitle(
                    Array.isArray(item.orderType) ? item.orderType[0] : item.orderType,
                    item.eventName,
                    Boolean(item.isTwap)
                  ),
            };
          }),
      };
    });
  }, [_, showDebugValues]);

  return (
    <TableOptionsFilter<Props["value"][number]>
      multiple
      label={t`Action`}
      placeholder={t`Search Action`}
      value={value}
      options={localizedGroups}
      onChange={onChange}
      popupPlacement="bottom-start"
    />
  );
}
