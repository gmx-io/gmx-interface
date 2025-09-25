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
    groupName: msg`Funding Fees`,
    items: [
      {
        data: ClaimType.SettleFundingFeeExecuted,
        text: msg`Settled Funding Fees`,
      },
      {
        data: ClaimType.ClaimFunding,
        text: msg`Claim Funding Fees`,
      },
      {
        data: ClaimType.SettleFundingFeeCancelled,
        text: msg`Failed Settlement of Funding Fees`,
      },
      {
        data: ClaimType.SettleFundingFeeCreated,
        text: msg`Request Settlement of Funding Fees`,
        debug: true,
      },
    ],
  },

  {
    groupName: msg`Price Impact`,
    items: [
      {
        data: ClaimType.ClaimPriceImpact,
        text: msg`Claim Price Impact Rebates`,
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
      placeholder={t`Search Action`}
      value={value}
      options={localizedGroups}
      onChange={onChange}
      popupPlacement="bottom-start"
    />
  );
}
