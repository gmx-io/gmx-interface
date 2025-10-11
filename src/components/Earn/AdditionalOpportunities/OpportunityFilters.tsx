import { t, Trans } from "@lingui/macro";
import { useCallback, useMemo } from "react";
import { useHistory } from "react-router-dom";

import {
  sendEarnOpportunitiesFilterAppliedEvent,
  EarnPageOpportunitiesAnalyticsFilter,
} from "lib/userAnalytics/earnEvents";

import SearchInput from "components/SearchInput/SearchInput";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import Tabs from "components/Tabs/Tabs";

import StarGradientIcon from "img/ic_star_gradient.svg?react";

import { OpportunityTag, useOpportunityTagLabels } from "./useOpportunities";

export type OpportunityFilterValue = "for-me" | "all" | OpportunityTag;

export const TAG_FILTER_ORDER: OpportunityTag[] = [
  "lending-and-borrowing",
  "looping",
  "delta-neutral-vaults",
  "autocompound",
  "yield-trading",
];

export const AVAILABLE_FILTERS: OpportunityFilterValue[] = ["for-me", "all", ...TAG_FILTER_ORDER];

const FILTER_ANALYTICS_EVENT_LABELS: Record<OpportunityFilterValue, EarnPageOpportunitiesAnalyticsFilter> = {
  "for-me": "ForMe",
  all: "All",
  "lending-and-borrowing": "LendingAndBorrowing",
  looping: "Looping",
  "delta-neutral-vaults": "DeltaNeutralVaults",
  autocompound: "Autocompound",
  "yield-trading": "YieldTrading",
};

export function OpportunityFilters({
  activeFilter,
  search,
  onSearchChange,
}: {
  activeFilter: OpportunityFilterValue;
  search: string;
  onSearchChange: (value: string) => void;
}) {
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
      },
      { value: "all" as const, label: <Trans>All</Trans> },
      ...TAG_FILTER_ORDER.map((tag) => ({ value: tag, label: opportunityTagLabels[tag] })),
    ],
    [opportunityTagLabels]
  );

  const history = useHistory();

  const handleFilterChange = useCallback(
    (value: OpportunityFilterValue) => {
      const filterLabel = FILTER_ANALYTICS_EVENT_LABELS[value] ?? value;
      sendEarnOpportunitiesFilterAppliedEvent(filterLabel);

      history.push(`/earn/additional-opportunities/${value}`);
    },
    [history]
  );

  return (
    <div className="flex gap-12 overflow-hidden rounded-8 bg-slate-900 p-12 max-md:flex-col">
      <div className="flex grow overflow-hidden">
        <TableScrollFadeContainer className="w-full grow">
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
