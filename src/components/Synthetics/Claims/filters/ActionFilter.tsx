import { t } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { useMemo } from "react";

import { ClaimType } from "domain/synthetics/claimHistory/types";

import { TableOptionsFilter } from "components/Synthetics/TableOptionsFilter/TableOptionsFilter";

type Item = {
  data: string;
  text: string;
};

type Group = {
  groupName: string;
  items: Item[];
};

type Groups = Group[];

const GROUPS: Groups = [
  {
    groupName: /*i18n*/ "Funding Fees",
    items: [
      {
        data: ClaimType.SettleFundingFeeExecuted,
        text: /*i18n*/ "Settled Funding Fees",
      },
      {
        data: ClaimType.ClaimFunding,
        text: /*i18n*/ "Claim Funding Fees",
      },
      {
        data: ClaimType.SettleFundingFeeCancelled,
        text: /*i18n*/ "Failed Settlement of Funding Fees",
      },
      {
        data: ClaimType.SettleFundingFeeCreated,
        text: /*i18n*/ "Request Settlement of Funding Fees",
      },
    ],
  },

  {
    groupName: /*i18n*/ "Price Impact",
    items: [
      {
        data: ClaimType.ClaimPriceImpact,
        text: /*i18n*/ "Claim Price Impact Rebates",
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
