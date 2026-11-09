import { t } from "@lingui/macro";
import { useState } from "react";

import { EMPTY_ARRAY } from "lib/objects";

import { GtPointsColumns, GtPointsSubpageLayout } from "components/GtPoints/GtPointsPageLayout";
import { StakeFaq } from "components/GtPoints/Stake/StakeFaq";
import { StakeModal } from "components/GtPoints/Stake/StakeModal";
import { StakePositionsCard, type StakeAction } from "components/GtPoints/Stake/StakePositionsCard";
import { StakeReviewModal } from "components/GtPoints/Stake/StakeReviewModal";
import { StakeSummaryCard } from "components/GtPoints/Stake/StakeSummaryCard";
import { useGtPointsData } from "components/GtPoints/useGtPointsData";

export default function GtPointsStakePage() {
  const data = useGtPointsData();
  const [isStakeOpen, setIsStakeOpen] = useState(false);
  const [action, setAction] = useState<StakeAction | undefined>(undefined);

  const isConnected = Boolean(data.account) && !data.isWalletInitializing;
  const isLoading = data.isWalletInitializing || data.isLoading;

  return (
    <GtPointsSubpageLayout title={t`Stake`} subtitle={t`Stake your GLV / GM tokens to earn GT rewards`}>
      <GtPointsColumns
        main={
          <>
            <StakeSummaryCard
              stake={data.stake}
              isConnected={isConnected}
              isLoading={isLoading}
              onStake={() => setIsStakeOpen(true)}
            />
            <StakePositionsCard
              key={data.account ?? "none"}
              stake={data.stake}
              isConnected={isConnected}
              isLoading={isLoading}
              onAction={setAction}
            />
          </>
        }
        side={<StakeFaq />}
      />

      <StakeModal isVisible={isStakeOpen} setIsVisible={setIsStakeOpen} wallet={data.stake?.wallet ?? EMPTY_ARRAY} />
      <StakeReviewModal action={action} onClose={() => setAction(undefined)} />
    </GtPointsSubpageLayout>
  );
}
