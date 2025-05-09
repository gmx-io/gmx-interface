import type { MessageDescriptor } from "@lingui/core";
import { msg, t } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { useMemo } from "react";

import { OrderTypeFilterValue } from "domain/synthetics/orders/ordersFilters";

import { TableOptionsFilter } from "components/Synthetics/TableOptionsFilter/TableOptionsFilter";

type Item = {
  data: OrderTypeFilterValue;
  hidden?: boolean;
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
        data: "trigger-limit",
        text: msg`Limit`,
      },
      {
        data: "trigger-take-profit",
        text: msg`Take Profit`,
      },
      {
        data: "trigger-stop-loss",
        text: msg`Stop Loss`,
      },
    ],
  },
  {
    groupName: msg`TWAP`,
    items: [
      {
        data: "twap",
        text: msg`TWAP`,
        hidden: true,
      },
    ],
  },
  {
    groupName: msg`Swaps`,
    items: [
      {
        data: "swaps-limit",
        text: msg`Limit`,
      },
      {
        data: "swaps-twap",
        text: msg`TWAP`,
      },
    ],
  },
];

type Props = {
  value: OrderTypeFilterValue[];
  onChange: (value: OrderTypeFilterValue[]) => void;
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
            hidden: item.hidden,
          };
        }),
      };
    });
  }, [i18n]);

  return (
    <TableOptionsFilter<OrderTypeFilterValue>
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
