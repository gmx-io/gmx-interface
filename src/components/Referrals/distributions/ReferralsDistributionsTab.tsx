import { t } from "@lingui/macro";
import { useCallback, useState } from "react";

import { ContractsChainId } from "config/chains";
import { TotalReferralsStats } from "domain/referrals";
import { useChainId } from "lib/chains";

import Loader from "components/Loader/Loader";
import usePagination from "components/Pagination/usePagination";
import { ClaimableRebatesCard } from "components/Referrals/shared/cards/ClaimableRebatesCard";
import { EmptyMessage } from "components/Referrals/shared/cards/EmptyMessage";
import { ReferralsDocsCard } from "components/Referrals/shared/cards/ReferralsDocsCard";

import { RebatesDistributionTable } from "./table/RebatesDistributionTable";

type ReferralsDistributionsTabProps = {
  isLoading: boolean;
  account: string | undefined;
  referralsData: TotalReferralsStats | undefined;
};

const REFERRALS_DISTRIBUTIONS_PAGE_SIZE = 15;

export function ReferralsDistributionsTab({ isLoading, account, referralsData }: ReferralsDistributionsTabProps) {
  const { chainId } = useChainId();
  const chains = referralsData?.chains || {};
  const currentReferralsData = chains[chainId as ContractsChainId];
  const affiliateDistributions = currentReferralsData?.affiliateDistributions;

  const {
    currentPage: currentRebatePage,
    getCurrentData: getCurrentRebateData,
    setCurrentPage: setCurrentRebatePage,
    pageCount: rebatePageCount,
  } = usePagination("Rebates", affiliateDistributions, REFERRALS_DISTRIBUTIONS_PAGE_SIZE);
  const [selectedRebateId, setSelectedRebateId] = useState<string | undefined>(undefined);

  const toggleSelectedRebateId = useCallback((rebateId: string) => {
    setSelectedRebateId((prev) => (prev === rebateId ? undefined : rebateId));
  }, []);

  const currentRebateData = getCurrentRebateData();

  if (isLoading) return <Loader />;

  if (!account) {
    return (
      <EmptyMessage
        tooltipText={t`Connect your wallet to view your rebates distribution history.`}
        message={t`Connect wallet to view distributions`}
      />
    );
  }

  return (
    <div className="flex grow gap-8 max-md:flex-col max-md:pb-[100px]">
      <div className="flex grow flex-col gap-8">
        {currentRebateData.length > 0 ? (
          <RebatesDistributionTable
            currentRebateData={currentRebateData}
            chainId={chainId}
            currentRebatePage={currentRebatePage}
            rebatePageCount={rebatePageCount}
            setCurrentRebatePage={setCurrentRebatePage}
            selectedRebateId={selectedRebateId}
            toggleSelectedRebateId={toggleSelectedRebateId}
          />
        ) : (
          <EmptyMessage
            tooltipText={t`Distribution history for claimed rebates and airdrops`}
            message={t`No rebates distribution history yet`}
          />
        )}
      </div>
      <div className="flex w-[400px] shrink-0 flex-col gap-8 max-md:contents max-md:w-full">
        <ClaimableRebatesCard />
        <ReferralsDocsCard />
      </div>
    </div>
  );
}
