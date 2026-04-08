import { AnimatePresence, motion } from "framer-motion";

import { MarketsInfoData } from "domain/synthetics/markets";

import { Table } from "components/Table/Table";

import { ClaimRewardRow } from "./ClaimRewardRow";
import { type RewardWithUsd } from "./useClaimAffiliatesModalState";

export const COLLAPSE_ANIMATION = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: "auto" },
  exit: { opacity: 0, height: 0 },
  transition: { duration: 0.2 },
} as const;

export function AnimatedRewardsTable({
  isVisible,
  rewards,
  marketsInfoData,
  selectedMarketAddressesSet,
  onToggleSelect,
}: {
  isVisible: boolean;
  rewards: RewardWithUsd[];
  marketsInfoData: MarketsInfoData | undefined;
  selectedMarketAddressesSet: Set<string>;
  onToggleSelect: (marketAddress: string) => void;
}) {
  return (
    <AnimatePresence initial={false}>
      {isVisible && (
        <motion.div className="overflow-hidden" {...COLLAPSE_ANIMATION}>
          <Table className="!bg-transparent">
            <tbody>
              {rewards.map(({ reward, usd }) => (
                <ClaimRewardRow
                  key={reward.marketAddress}
                  reward={reward}
                  rewardUsd={usd}
                  marketsInfoData={marketsInfoData}
                  isSelected={selectedMarketAddressesSet.has(reward.marketAddress)}
                  onToggleSelect={onToggleSelect}
                />
              ))}
            </tbody>
          </Table>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
