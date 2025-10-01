import { t, Trans } from "@lingui/macro";
import { useCallback, useMemo } from "react";

import SearchInput from "components/SearchInput/SearchInput";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import Tabs from "components/Tabs/Tabs";

import StarGradientIcon from "img/ic_star_gradient.svg?react";

import { OpportunityTag, useOpportunityTagLabels } from "./useOpportunities";

export type OpportunityFilterValue = "for-me" | "all" | OpportunityTag;

type Props = {
  activeFilter: OpportunityFilterValue;
  onFilterChange: (value: OpportunityFilterValue) => void;
  search: string;
  onSearchChange: (value: string) => void;
  isForMeDisabled?: boolean;
};

const TAG_FILTER_ORDER: OpportunityTag[] = [
  "lending-and-borrowing",
  "looping",
  "delta-neutral-vaults",
  "autocompound",
  "yield-trading",
];

export function OpportunityFilters({ activeFilter, onFilterChange, search, onSearchChange, isForMeDisabled }: Props) {
  const forMeClasses =
    "cursor-not-allowed opacity-50 pointer-events-none hover:opacity-50 focus-visible:outline-none focus-visible:ring-0";

  const opportunityTagLabels = useOpportunityTagLabels();

  const filterOptions = useMemo(
    () => [
      {
        value: "for-me" as const,
        label: (
          <div className="flex items-center gap-4">
            <StarGradientIcon className="size-16" /> <Trans>For me</Trans>
          </div>
        ),
        className: isForMeDisabled ? { active: forMeClasses, regular: forMeClasses } : undefined,
      },
      { value: "all" as const, label: <Trans>All</Trans> },
      ...TAG_FILTER_ORDER.map((tag) => ({ value: tag, label: opportunityTagLabels[tag] })),
    ],
    [forMeClasses, isForMeDisabled, opportunityTagLabels]
  );

  const handleFilterChange = useCallback(
    (value: OpportunityFilterValue) => {
      if (value === "for-me" && isForMeDisabled) {
        return;
      }

      onFilterChange(value);
    },
    [isForMeDisabled, onFilterChange]
  );

  return (
    <div className="flex gap-12 overflow-hidden rounded-8 bg-slate-900 p-12">
      <div className="flex grow overflow-hidden">
        <TableScrollFadeContainer className="grow w-full">
          <Tabs
            options={filterOptions}
            selectedValue={activeFilter}
            onChange={handleFilterChange}
            type="inline"
            regularOptionClassname="whitespace-nowrap"
          />
        </TableScrollFadeContainer>
      </div>

      <SearchInput
        value={search}
        setValue={onSearchChange}
        placeholder={t`Search opportunities`}
        className="min-w-[170px] md:max-w-[320px]"
      />
    </div>
  );
}

export default OpportunityFilters;
