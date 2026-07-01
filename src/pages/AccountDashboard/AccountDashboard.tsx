import { Trans, t } from "@lingui/macro";
import { useCallback, useState } from "react";
import { useMedia } from "react-use";
import { isAddress } from "viem";

import { SyntheticsStateContextProvider } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import type { PnlSummaryBucketLabel } from "domain/synthetics/accountStats/usePnlSummaryData";
import { useChainId } from "lib/chains";

import AddressView from "components/AddressView/AddressView";
import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import { ChainContentHeader } from "components/ChainContentHeader/ChainContentHeader";
import PageTitle from "components/PageTitle/PageTitle";

import { DailyAndCumulativePnL } from "./DailyAndCumulativePnL";
import { GeneralPerformanceDetails } from "./GeneralPerformanceDetails";
import { HistoricalLists } from "./HistoricalLists";
import { usePageParams } from "./usePageParams";
import { VersionNetworkSwitcherRow } from "./VersionNetworkSwitcherRow";

type DashboardDateRange = [Date | undefined, Date | undefined];

function getBucketDateRange(bucketLabel: PnlSummaryBucketLabel): DashboardDateRange {
  const now = new Date();
  const today = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  const getPastDate = (days: number) => {
    const date = new Date(today);
    date.setDate(date.getDate() - days);
    return date;
  };

  switch (bucketLabel) {
    case "today":
      return [today, today];
    case "yesterday": {
      const yesterday = getPastDate(1);
      return [yesterday, yesterday];
    }
    case "week":
      return [getPastDate(7), today];
    case "month":
      return [getPastDate(30), today];
    case "year":
      return [new Date(now.getUTCFullYear(), 0, 1), today];
    case "all":
    default:
      return [undefined, undefined];
  }
}

export function AccountDashboard() {
  const { chainId: initialChainId } = useChainId();
  const isMobile = useMedia("(max-width: 600px)");
  const [dashboardDateRange, setDashboardDateRange] = useState<DashboardDateRange>([undefined, undefined]);

  const handleSummaryBucketClick = useCallback((bucketLabel: PnlSummaryBucketLabel) => {
    setDashboardDateRange(getBucketDateRange(bucketLabel));
  }, []);

  const { chainId, version, account } = usePageParams(initialChainId);

  const header = <ChainContentHeader chainId={chainId} />;

  if (!isAddress(account!)) {
    return (
      <AppPageLayout title={t`GMX Account`} header={header}>
        <div className="default-container page-layout">
          <PageTitle title={t`GMX Account`} className="p-12" />
          <div className="text-center text-red-500">
            <Trans>Invalid Ethereum address</Trans>
          </div>
        </div>
      </AppPageLayout>
    );
  }

  return (
    <AppPageLayout title={t`GMX Account`} header={header}>
      <div className="default-container page-layout flex flex-col gap-8">
        <PageTitle
          title={t`GMX Account`}
          subtitle={
            <>
              <div className="text-body-medium mb-20 flex flex-wrap items-center gap-4 font-medium">
                <Trans>Account</Trans>
                <AddressView noLink address={account} size={20} breakpoint={isMobile ? "XL" : undefined} />
              </div>
              <VersionNetworkSwitcherRow account={account} chainId={chainId} version={version} />
            </>
          }
        />

        {version === 2 && (
          <SyntheticsStateContextProvider overrideChainId={chainId} pageType="accounts" skipLocalReferralCode={false}>
            <div className="flex flex-col gap-8">
              <div className="flex flex-row flex-wrap gap-8">
                <div className="max-w-full grow *:size-full">
                  <GeneralPerformanceDetails
                    chainId={chainId}
                    account={account}
                    onBucketClick={handleSummaryBucketClick}
                  />
                </div>
                <div className="grow *:size-full">
                  <DailyAndCumulativePnL
                    chainId={chainId}
                    account={account}
                    startDate={dashboardDateRange[0]}
                    endDate={dashboardDateRange[1]}
                    onDateRangeChange={setDashboardDateRange}
                  />
                </div>
              </div>
              <HistoricalLists
                chainId={chainId}
                account={account}
                dateRange={dashboardDateRange}
                onDateRangeChange={setDashboardDateRange}
              />
            </div>
          </SyntheticsStateContextProvider>
        )}
      </div>
    </AppPageLayout>
  );
}
