import type { MessageDescriptor } from "@lingui/core";
import { msg, t } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { useMemo } from "react";

import { OrderType } from "domain/synthetics/orders/types";
import { TradeActionType } from "domain/synthetics/tradeHistory/types";

import { TableOptionsFilter } from "components/Synthetics/TableOptionsFilter/TableOptionsFilter";

import { actionTextMap, getActionTitle } from "../keys";

type Item = {
  orderType: OrderType;
  isDepositOrWithdraw?: boolean;
  text?: MessageDescriptor;
  eventName: TradeActionType;
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
        orderType: OrderType.MarketIncrease,
        eventName: TradeActionType.OrderExecuted,
      },
      {
        orderType: OrderType.MarketDecrease,
        eventName: TradeActionType.OrderExecuted,
      },
      {
        orderType: OrderType.MarketIncrease,
        eventName: TradeActionType.OrderExecuted,
        isDepositOrWithdraw: true,
        text: actionTextMap["Deposit-OrderExecuted"],
      },
      {
        orderType: OrderType.MarketDecrease,
        eventName: TradeActionType.OrderExecuted,
        isDepositOrWithdraw: true,
        text: actionTextMap["Withdraw-OrderExecuted"],
      },
      {
        orderType: OrderType.MarketIncrease,
        eventName: TradeActionType.OrderCancelled,
      },
      {
        orderType: OrderType.MarketDecrease,
        eventName: TradeActionType.OrderCancelled,
      },
      {
        orderType: OrderType.MarketIncrease,
        eventName: TradeActionType.OrderCancelled,
        isDepositOrWithdraw: true,
        text: actionTextMap["Deposit-OrderCancelled"],
      },
      {
        orderType: OrderType.MarketDecrease,
        eventName: TradeActionType.OrderCancelled,
        isDepositOrWithdraw: true,
        text: actionTextMap["Withdraw-OrderCancelled"],
      },
      {
        orderType: OrderType.MarketIncrease,
        eventName: TradeActionType.OrderCreated,
      },
      {
        orderType: OrderType.MarketDecrease,
        eventName: TradeActionType.OrderCreated,
      },
      {
        orderType: OrderType.MarketIncrease,
        eventName: TradeActionType.OrderCreated,
        isDepositOrWithdraw: true,
        text: actionTextMap["Deposit-OrderCreated"],
      },
      {
        orderType: OrderType.MarketDecrease,
        eventName: TradeActionType.OrderCreated,
        isDepositOrWithdraw: true,
        text: actionTextMap["Withdraw-OrderCreated"],
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
      [OrderType.LimitIncrease, OrderType.LimitDecrease, OrderType.StopLossDecrease].map((orderType) => ({
        orderType,
        eventName,
      }))
    ),
  },
  {
    groupName: msg`Swaps`,
    items: [
      {
        orderType: OrderType.MarketSwap,
        eventName: TradeActionType.OrderExecuted,
      },
      {
        orderType: OrderType.LimitSwap,
        eventName: TradeActionType.OrderExecuted,
      },
      {
        orderType: OrderType.LimitSwap,
        eventName: TradeActionType.OrderCreated,
      },
      {
        orderType: OrderType.LimitSwap,
        eventName: TradeActionType.OrderUpdated,
      },
      {
        orderType: OrderType.LimitSwap,
        eventName: TradeActionType.OrderCancelled,
      },
      {
        orderType: OrderType.MarketSwap,
        eventName: TradeActionType.OrderCancelled,
      },
      {
        orderType: OrderType.LimitSwap,
        eventName: TradeActionType.OrderFrozen,
      },
      {
        orderType: OrderType.MarketSwap,
        eventName: TradeActionType.OrderCreated,
      },
    ],
  },
  {
    groupName: msg`Liquidation`,
    items: [
      {
        eventName: TradeActionType.OrderExecuted,
        orderType: OrderType.Liquidation,
      },
    ],
  },
];

type Props = {
  value: {
    orderType: OrderType;
    eventName: TradeActionType;
    isDepositOrWithdraw: boolean;
  }[];
  onChange: (value: { orderType: OrderType; eventName: TradeActionType; isDepositOrWithdraw: boolean }[]) => void;
};

export function ActionFilter({ value, onChange }: Props) {
  const { _ } = useLingui();
  const localizedGroups = useMemo(() => {
    return GROUPS.map((group) => {
      return {
        groupName: _(group.groupName),
        items: group.items.map((item) => {
          return {
            data: {
              orderType: item.orderType,
              eventName: item.eventName,
              isDepositOrWithdraw: Boolean(item.isDepositOrWithdraw),
            },
            text: item.text ? _(item.text) : getActionTitle(item.orderType, item.eventName),
          };
        }),
      };
    });
  }, [_]);

  return (
    <TableOptionsFilter<Props["value"][number]>
      multiple
      label={t`Action`}
      placeholder={t`Search action`}
      value={value}
      options={localizedGroups}
      onChange={onChange}
      popupPlacement="bottom-start"
    />
  );
}
