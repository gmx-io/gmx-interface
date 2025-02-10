import type { MessageDescriptor } from "@lingui/core";
import { msg, t } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { useMemo } from "react";

import { OrderType } from "domain/synthetics/orders/types";

import { TableOptionsFilter } from "components/Synthetics/TableOptionsFilter/TableOptionsFilter";

type Item = {
  data: number;
  text: MessageDescriptor;
};

type Group = {
  groupName: MessageDescriptor;
  items: Item[];
};

type Groups = Group[];

const GROUPS: Groups = [
  {
    groupName: msg`Trigger Orders`,
    items: [
      {
        data: OrderType.LimitIncrease,
        text: msg`Limit`,
      },
      {
        data: OrderType.LimitDecrease,
        text: msg`Take Profit`,
      },
      {
        data: OrderType.StopLossDecrease,
        text: msg`Stop Loss`,
      },
    ],
  },
  {
    groupName: msg`Swaps`,
    items: [
      {
        data: OrderType.LimitSwap,
        text: msg`Swap`,
      },
    ],
  },
];

type Props = {
  value: OrderType[];
  onChange: (value: OrderType[]) => void;
  asButton?: boolean;
};

export function OrderTypeFilter({ value, onChange, asButton }: Props) {
  const { i18n } = useLingui();
  const localizedGroups = useMemo(() => {
    return GROUPS.map((group) => {
      return {
        groupName: i18n._(group.groupName),
        items: group.items.map((item) => {
          return {
            data: item.data,
            text: i18n._(item.text),
          };
        }),
      };
    });
  }, [i18n]);

  return (
    <TableOptionsFilter<OrderType>
      multiple
      label={t`Type`}
      placeholder={t`Search Type`}
      value={value}
      options={localizedGroups}
      onChange={onChange}
      popupPlacement="bottom-start"
      asButton={asButton}
    />
  );
}
