import type { MessageDescriptor } from "@lingui/core";
import { msg, t } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { useMemo } from "react";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { ClaimType } from "domain/synthetics/claimHistory/types";

import { TableOptionsFilter } from "components/TableOptionsFilter/TableOptionsFilter";

type Item = {
  data: string;
  text: MessageDescriptor;
  debug?: boolean;
};

type Group = {
  groupName: MessageDescriptor;
  items: Item[];
};

type Groups = Group[];

const GROUPS: Groups = [
  {
    groupName: msg`Funding fees`,
    items: [
      {
        data: ClaimType.SettleFundingFeeExecuted,
        text: msg`Settled funding fees`,
      },
      {
        data: ClaimType.ClaimFunding,
        text: msg`Claim funding fees`,
      },
      {
        data: ClaimType.SettleFundingFeeCancelled,
        text: msg`Failed settlement of funding fees`,
      },
      {
        data: ClaimType.SettleFundingFeeCreated,
        text: msg`Request settlement of funding fees`,
        debug: true,
      },
    ],
  },

  {
    groupName: msg`Price impact`,
    items: [
      {
        data: ClaimType.ClaimPriceImpact,
        text: msg`Claim price impact rebates`,
      },
    ],
  },
];

type Props = {
  value: string[];
  onChange: (value: string[]) => void;
};

export function ActionFilter({ value, onChange }: Props) {
  const { i18n } = useLingui();
  const { showDebugValues } = useSettings();

  const localizedGroups = useMemo(() => {
    return GROUPS.map((group) => {
      return {
        groupName: i18n._(group.groupName),
        items: group.items
          .filter((item) => !item.debug || showDebugValues)
          .map((item) => {
            return {
              data: item.data,
              text: i18n._(item.text),
            };
          }),
      };
    });
  }, [i18n, showDebugValues]);

  return (
    <TableOptionsFilter<string>
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
