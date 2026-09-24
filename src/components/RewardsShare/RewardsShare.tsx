import { t } from "@lingui/macro";
import { useCallback, useRef } from "react";

import type { ContractsChainId } from "config/chains";
import type { LeaderboardEntry } from "domain/synthetics/incentives/v2/types";
import useLoadImage from "lib/useLoadImage";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import ModalWithPortal from "components/Modal/ModalWithPortal";
import CreateReferralCode from "components/ShareModal/CreateReferralCode";
import { ShareCardActionButtons } from "components/ShareModal/ShareCardActionButtons";
import { SkipReferralCodeBanner } from "components/ShareModal/SkipReferralCodeBanner";
import { useShareCardActions } from "components/ShareModal/useShareCardActions";
import { useShareReferralCodeState } from "components/ShareModal/useShareReferralCodeState";

import shareBgImg from "img/performance-share-bg.png";

import { RewardsShareCard } from "./RewardsShareCard";

type Props = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  account: string;
  chainId: ContractsChainId;
  entry: LeaderboardEntry;
};

export function RewardsShare({ isOpen, setIsOpen, account, chainId, entry }: Props) {
  const rewardsShareBgImg = useLoadImage(shareBgImg);
  const cardRef = useRef<HTMLDivElement>(null);

  const {
    shareAffiliateCode,
    referralCodeOwnerKind,
    code,
    shouldShowCreateReferralCard,
    shouldPromptToCreateReferralCode,
    shouldShowSkipReferralCodeBanner,
    closeCreateReferralCodeInfoMessage,
    handleReferralCodeSuccess,
    handlePromptToCreateReferralCode,
  } = useShareReferralCodeState({
    chainId,
    account,
    isOpen,
    source: "rewards-leaderboard",
  });

  const { isUploading, uploadError, handleCopy, handleCopyImage, handleShareTwitter } = useShareCardActions({
    cardRef,
    shareAffiliateCode,
    source: "rewards-leaderboard",
    fileName: "GMX Rewards.png",
    tweetText: `I'm ranked #${entry.rank} on the @GMX_IO rewards leaderboard`,
  });

  const handleVisibilityChange = useCallback(
    (nextIsOpen: boolean) => {
      if (!nextIsOpen && isUploading) {
        return;
      }

      setIsOpen(nextIsOpen);
    },
    [isUploading, setIsOpen]
  );

  return (
    <ModalWithPortal
      contentClassName="md:!max-w-[500px]"
      isVisible={isOpen}
      setIsVisible={handleVisibilityChange}
      label={t`Share your rewards`}
      contentPadding={false}
      withMobileBottomPosition
    >
      <div className="flex flex-col gap-20 border-b-1/2 border-slate-600 p-20">
        <div className="flex justify-center">
          <RewardsShareCard
            rank={entry.rank}
            esGmxRewards={entry.esGmxRewards}
            gtRewards={entry.gtRewards}
            referralCodeOwnerKind={referralCodeOwnerKind}
            code={code}
            ref={cardRef}
            loading={isUploading}
            shareBgImg={rewardsShareBgImg}
          />
        </div>
        {shouldShowCreateReferralCard ? <CreateReferralCode onSuccess={handleReferralCodeSuccess} /> : null}
      </div>

      {shouldShowSkipReferralCodeBanner ? (
        <div className="flex flex-col gap-12 p-20 pb-0">
          <SkipReferralCodeBanner onClose={closeCreateReferralCodeInfoMessage} />
        </div>
      ) : null}

      <div className="flex flex-col gap-16 p-20">
        {uploadError ? (
          <AlertInfoCard type="error" hideClose>
            {uploadError}
          </AlertInfoCard>
        ) : null}
        <ShareCardActionButtons
          isUploading={isUploading}
          interceptOnClick={shouldPromptToCreateReferralCode ? handlePromptToCreateReferralCode : undefined}
          onCopyLink={handleCopy}
          onCopyImage={handleCopyImage}
          onShareTwitter={handleShareTwitter}
        />
      </div>
    </ModalWithPortal>
  );
}
