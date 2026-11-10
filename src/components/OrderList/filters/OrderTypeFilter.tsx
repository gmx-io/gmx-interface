import type { MessageDescriptor } from "@lingui/core";
import { msg, t } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { useMemo } from "react";

import { getNetworkFeatures, type NetworkFeature } from "config/features";
import { OrderTypeFilterValue } from "domain/synthetics/orders/ordersFilters";
import { useChainId } from "lib/chains";

import { TableOptionsFilter } from "components/TableOptionsFilter/TableOptionsFilter";

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

// Options for order types the selected network has no orders of; on EVM every feature is on and nothing is removed.
// Swap limit orders exist on Solana although the trade box cannot create swaps yet, so they do not need `swap`.
const REQUIRED_FEATURES: Partial<Record<OrderTypeFilterValue, NetworkFeature[]>> = {
  "trigger-stop-market": ["stopMarket"],
  twap: ["twap"],
  "twap-increase": ["twap"],
  "swaps-twap": ["twap"],
};

const GROUPS: Groups = [
  {
    groupName: msg`Trigger orders`,
    items: [
      {
        data: "trigger-limit",
        text: msg`Limit`,
      },
      {
        data: "trigger-stop-market",
        text: msg`Stop Market`,
      },
      {
        data: "trigger-take-profit",
        text: msg`Take-Profit`,
      },
      {
        data: "trigger-stop-loss",
        text: msg`Stop-Loss`,
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
      {
        data: "twap-increase",
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
  const { networkId } = useChainId();
  const localizedGroups = useMemo(() => {
    const features = getNetworkFeatures(networkId);
    const isSupported = (item: Item) => (REQUIRED_FEATURES[item.data] ?? []).every((feature) => features[feature]);

    return GROUPS.filter((group) => group.items.some(isSupported)).map((group) => {
      return {
        groupName: i18n._(group.groupName),
        items: group.items.filter(isSupported).map((item) => {
          return {
            data: item.data,
            text: i18n._(item.text),
            hidden: item.hidden,
          };
        }),
      };
    });
  }, [i18n, networkId]);

  return (
    <TableOptionsFilter<OrderTypeFilterValue>
      multiple
      label={t`Type`}
      placeholder={t`Search type`}
      value={value}
      options={localizedGroups}
      onChange={onChange}
      popupPlacement="bottom-start"
      asButton={asButton}
    />
  );
}
