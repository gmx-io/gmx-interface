import { FloatingPortal, flip, offset, shift, useFloating } from "@floating-ui/react";
import { Popover } from "@headlessui/react";
import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import React, { useMemo, useState } from "react";

import { OrderType } from "domain/synthetics/orders/types";
import { TradeActionType } from "domain/synthetics/tradeHistory/types";

import { actionTextMap, getActionTitle } from "../keys";

import Checkbox from "components/Checkbox/Checkbox";
import SearchInput from "components/SearchInput/SearchInput";

import { ReactComponent as FilterIcon } from "img/ic_filter.svg";
import { ReactComponent as PartialCheckedIcon } from "img/ic_partial_checked.svg";

import "./ActionFilter.scss";

type Item = {
  orderType: OrderType;
  isDepositOrWithdraw?: boolean;
  text?: string;
  eventName: TradeActionType;
};

type Group = {
  groupName: string;
  items: Item[];
};

type Groups = Group[];

const GROUPS: Groups = [
  {
    groupName: /*i18n*/ "Market Orders",
    items: [
      {
        orderType: OrderType.MarketIncrease,
        eventName: TradeActionType.OrderCreated,
      },
      {
        orderType: OrderType.MarketIncrease,
        eventName: TradeActionType.OrderExecuted,
      },
      {
        orderType: OrderType.MarketIncrease,
        eventName: TradeActionType.OrderCancelled,
      },
      {
        orderType: OrderType.MarketDecrease,
        eventName: TradeActionType.OrderCreated,
      },
      {
        orderType: OrderType.MarketDecrease,
        eventName: TradeActionType.OrderExecuted,
      },
      {
        orderType: OrderType.MarketDecrease,
        eventName: TradeActionType.OrderCancelled,
      },
      {
        orderType: OrderType.MarketIncrease,
        eventName: TradeActionType.OrderCreated,
        isDepositOrWithdraw: true,
        text: actionTextMap["Deposit-OrderCreated"],
      },
      {
        orderType: OrderType.MarketIncrease,
        eventName: TradeActionType.OrderExecuted,
        isDepositOrWithdraw: true,
        text: actionTextMap["Deposit-OrderExecuted"],
      },
      {
        orderType: OrderType.MarketIncrease,
        eventName: TradeActionType.OrderCancelled,
        isDepositOrWithdraw: true,
        text: actionTextMap["Deposit-OrderCancelled"],
      },
      {
        orderType: OrderType.MarketDecrease,
        eventName: TradeActionType.OrderCreated,
        isDepositOrWithdraw: true,
        text: actionTextMap["Withdraw-OrderCreated"],
      },
      {
        orderType: OrderType.MarketDecrease,
        eventName: TradeActionType.OrderExecuted,
        isDepositOrWithdraw: true,
        text: actionTextMap["Withdraw-OrderExecuted"],
      },
      {
        orderType: OrderType.MarketDecrease,
        eventName: TradeActionType.OrderCancelled,
        isDepositOrWithdraw: true,
        text: actionTextMap["Withdraw-OrderCancelled"],
      },
    ],
  },
  {
    groupName: /*i18n*/ "Trigger Orders",
    items: [
      TradeActionType.OrderCreated,
      TradeActionType.OrderUpdated,
      TradeActionType.OrderCancelled,
      TradeActionType.OrderExecuted,
      TradeActionType.OrderFrozen,
    ].flatMap((eventName) =>
      [OrderType.LimitIncrease, OrderType.LimitDecrease, OrderType.StopLossDecrease].map((orderType) => ({
        orderType,
        eventName,
      }))
    ),
  },
  {
    groupName: /*i18n*/ "Swaps",
    items: [
      {
        orderType: OrderType.MarketSwap,
        eventName: TradeActionType.OrderCreated,
      },
      {
        orderType: OrderType.MarketSwap,
        eventName: TradeActionType.OrderExecuted,
      },
      {
        orderType: OrderType.MarketSwap,
        eventName: TradeActionType.OrderCancelled,
      },
      {
        orderType: OrderType.LimitSwap,
        eventName: TradeActionType.OrderCreated,
      },
      {
        orderType: OrderType.LimitSwap,
        eventName: TradeActionType.OrderExecuted,
      },
      {
        orderType: OrderType.LimitSwap,
        eventName: TradeActionType.OrderCancelled,
      },
      {
        orderType: OrderType.LimitSwap,
        eventName: TradeActionType.OrderFrozen,
      },
    ],
  },

  {
    groupName: /*i18n*/ "Liquidation",
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
    isDepositOrWithdraw?: boolean;
  }[];
  onChange: (value: { orderType: OrderType; eventName: TradeActionType; isDepositOrWithdraw?: boolean }[]) => void;
};

function isIdentical(left: Item, right: Item): boolean {
  return (
    left.orderType === right.orderType &&
    left.eventName === right.eventName &&
    Boolean(left.isDepositOrWithdraw) === Boolean(right.isDepositOrWithdraw)
  );
}

export function ActionFilter({ value, onChange }: Props) {
  const { refs, floatingStyles } = useFloating({
    middleware: [offset(10), flip(), shift()],
    strategy: "fixed",
    placement: "bottom-end",
  });

  const isActive = value.length > 0;

  const [marketSearch, setMarketSearch] = useState("");

  const filteredGroups = useMemo(() => {
    return GROUPS.map((group) => {
      const items = group.items
        .map((pair) => {
          return {
            ...pair,
            text: pair.text || getActionTitle(pair.orderType, pair.eventName),
          };
        })
        .filter((pair) => {
          return pair.text!.toLowerCase().includes(marketSearch.toLowerCase());
        });
      const isEverythingSelected = group.items.every((item) =>
        value.some((selectedItem) => isIdentical(selectedItem, item))
      );
      const isEverythingFilteredSelected = items.every((item) =>
        value.some((selectedItem) => isIdentical(selectedItem, item))
      );
      const isSomethingSelected = group.items.some((item) =>
        value.some((selectedItem) => isIdentical(selectedItem, item))
      );

      return {
        groupName: group.groupName,
        isEverythingSelected,
        isEverythingFilteredSelected,
        isSomethingSelected,
        items,
      };
    }).filter((group) => group.items.length > 0);
  }, [marketSearch, value]);

  function togglePair(newItem: Item) {
    if (value.some((pair) => isIdentical(pair, newItem))) {
      onChange(value.filter((pair) => !isIdentical(pair, newItem)));
    } else {
      onChange([
        ...value,
        {
          orderType: newItem.orderType,
          eventName: newItem.eventName,
          isDepositOrWithdraw: newItem.isDepositOrWithdraw,
        },
      ]);
    }
  }

  function handleSearchEnterKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && filteredGroups.length > 0) {
      togglePair(filteredGroups[0].items[0]);
    }
  }

  function getIsSelected(item: Item) {
    return value.some((selectedPair) => isIdentical(selectedPair, item));
  }

  function handleGroupToggle(group: typeof filteredGroups[number]) {
    if (group.isEverythingFilteredSelected) {
      onChange(value.filter((pair) => !group.items.some((item) => isIdentical(pair, item))));
    } else {
      onChange(
        value.concat(
          group.items.map((item) => ({
            orderType: item.orderType,
            eventName: item.eventName,
            isDepositOrWithdraw: item.isDepositOrWithdraw,
          }))
        )
      );
    }
  }

  return (
    <>
      <Popover>
        <Popover.Button as="div" ref={refs.setReference} className="TradeHistorySynthetics-filter">
          <Trans>Action</Trans>
          <FilterIcon
            className={cx("TradeHistorySynthetics-filter-icon", {
              active: isActive,
            })}
          />
        </Popover.Button>
        <FloatingPortal>
          <Popover.Panel
            ref={refs.setFloating}
            style={floatingStyles}
            className={"TradeHistorySynthetics-filter-popover"}
          >
            <SearchInput
              className="ActionFilter-search"
              placeholder={t`Search action`}
              value={marketSearch}
              setValue={(event) => setMarketSearch(event.target.value)}
              onKeyDown={handleSearchEnterKey}
            />

            <div className="ActionFilter-options">
              {filteredGroups.map((group) => (
                <div key={group.groupName} className="ActionFilter-group">
                  <div
                    className="ActionFilter-group-name"
                    onClick={() => {
                      handleGroupToggle(group);
                    }}
                  >
                    {group.isSomethingSelected && !group.isEverythingSelected ? (
                      <div className="Checkbox">
                        <PartialCheckedIcon className="Checkbox-icon" />
                      </div>
                    ) : (
                      <Checkbox
                        className={cx({ muted: !group.isEverythingSelected })}
                        isChecked={group.isEverythingSelected}
                      />
                    )}
                    <span className="muted">
                      <Trans>{group.groupName}</Trans>
                    </span>
                  </div>
                  {group.items.map((pair) => (
                    <div
                      key={pair.text}
                      className="ActionFilter-option"
                      onClick={() => {
                        togglePair(pair);
                      }}
                    >
                      <Checkbox className={cx({ muted: !getIsSelected(pair) })} isChecked={getIsSelected(pair)}>
                        {pair.text}
                      </Checkbox>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </Popover.Panel>
        </FloatingPortal>
      </Popover>
    </>
  );
}
