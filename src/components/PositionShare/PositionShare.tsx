import { Trans, t } from "@lingui/macro";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePrevious } from "react-use";

import { Token } from "domain/tokens";
import useLoadImage from "lib/useLoadImage";
import { userAnalytics } from "lib/userAnalytics";
import { SharePositionActionEvent, SharePositionActionSource } from "lib/userAnalytics/types";
import type { ContractsChainId } from "sdk/configs/chains";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import Checkbox from "components/Checkbox/Checkbox";
import ModalWithPortal from "components/Modal/ModalWithPortal";
import CreateReferralCode from "components/ShareModal/CreateReferralCode";
import { ShareCardActionButtons } from "components/ShareModal/ShareCardActionButtons";
import { SkipReferralCodeBanner } from "components/ShareModal/SkipReferralCodeBanner";
import { useShareCardActions } from "components/ShareModal/useShareCardActions";
import { useShareReferralCodeState } from "components/ShareModal/useShareReferralCodeState";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";

import shareBgImg from "img/position-share-bg.jpg";

import { PositionShareCard } from "./PositionShareCard";

type Props = {
  entryPrice: bigint | undefined;
  indexToken: Token;
  isLong: boolean;
  leverageWithPnl: bigint | undefined;
  leverageWithoutPnl: bigint | undefined;
  markPrice: bigint;
  pnlAfterFeesPercentage: bigint;
  pnlAfterFeesUsd: bigint;
  setIsPositionShareModalOpen: (isOpen: boolean) => void;
  isPositionShareModalOpen: boolean;
  account: string | undefined;
  chainId: ContractsChainId;
  doNotShowAgain?: boolean;
  onDoNotShowAgainChange?: (value: boolean) => void;
  onShareAction?: () => void;
  shareSource: SharePositionActionSource;
  isRpnl?: boolean;
};

function PositionShare({
  entryPrice,
  indexToken,
  isLong,
  leverageWithoutPnl,
  leverageWithPnl,
  markPrice,
  pnlAfterFeesPercentage,
  pnlAfterFeesUsd,
  setIsPositionShareModalOpen,
  isPositionShareModalOpen,
  account,
  chainId,
  doNotShowAgain,
  onDoNotShowAgainChange,
  onShareAction,
  shareSource,
  isRpnl = false,
}: Props) {
  const [showPnlAmounts, setShowPnlAmounts] = useState(false);
  const [isPnlInLeverage, setIsPnlInLeverage] = useState(false);
  const sharePositionBgImg = useLoadImage(shareBgImg);
  const cardRef = useRef<HTMLDivElement>(null);

  const {
    shareAffiliateCode,
    hasReferralCode,
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
    isOpen: isPositionShareModalOpen,
    source: shareSource,
  });

  const { isUploading, uploadError, handleCopy, handleCopyImage, handleShareTwitter } = useShareCardActions({
    cardRef,
    shareAffiliateCode,
    hasReferralCode,
    source: shareSource,
    fileName: "GMX Position.png",
    tweetText: `Latest $\u200a${indexToken?.symbol} trade on @GMX_IO`,
    onShareAction,
  });

  const prevIsOpen = usePrevious(isPositionShareModalOpen);

  // cache position on open to not upload new image on every position change
  const [cachedPositionData, setCachedPositionData] = useState<{
    entryPrice: bigint | undefined;
    indexToken: Token;
    isLong: boolean;
    leverageWithPnl: bigint | undefined;
    leverageWithoutPnl: bigint | undefined;
    markPrice: bigint;
    pnlAfterFeesPercentage: bigint;
    pnlAfterFeesUsd: bigint;
  } | null>(null);

  useEffect(() => {
    if (!prevIsOpen && isPositionShareModalOpen) {
      setCachedPositionData({
        entryPrice,
        indexToken,
        isLong,
        leverageWithPnl,
        leverageWithoutPnl,
        markPrice,
        pnlAfterFeesPercentage,
        pnlAfterFeesUsd,
      });
    }
  }, [
    isPositionShareModalOpen,
    entryPrice,
    indexToken,
    isLong,
    leverageWithPnl,
    leverageWithoutPnl,
    markPrice,
    pnlAfterFeesPercentage,
    pnlAfterFeesUsd,
    prevIsOpen,
  ]);

  useEffect(() => {
    if (!prevIsOpen && isPositionShareModalOpen && shareSource === "auto-prompt") {
      userAnalytics.pushEvent<SharePositionActionEvent>({
        event: "SharePositionAction",
        data: {
          action: "PromptShown",
          source: "auto-prompt",
          hasReferralCode: hasReferralCode,
        },
      });
    }
  }, [hasReferralCode, isPositionShareModalOpen, prevIsOpen, shareSource]);

  useEffect(() => {
    if (prevIsOpen && !isPositionShareModalOpen && shareSource === "auto-prompt") {
      userAnalytics.pushEvent<SharePositionActionEvent>({
        event: "SharePositionAction",
        data: {
          action: "PromptClose",
          source: shareSource,
          hasReferralCode: hasReferralCode,
          doNotShowAgain,
        },
      });
    }
  }, [prevIsOpen, isPositionShareModalOpen, hasReferralCode, shareSource, doNotShowAgain]);

  const handleDoNotShowAgainToggle = useCallback(
    (value: boolean) => {
      onDoNotShowAgainChange?.(value);
    },
    [onDoNotShowAgainChange]
  );

  return (
    <ModalWithPortal
      contentClassName="md:!max-w-[500px]"
      isVisible={isPositionShareModalOpen}
      setIsVisible={setIsPositionShareModalOpen}
      label={t`Share your GMX trade on X`}
      contentPadding={false}
      withMobileBottomPosition
    >
      <div className="flex flex-col gap-20 border-b-1/2 border-slate-600 p-20">
        <div className="flex justify-center">
          {cachedPositionData && (
            <PositionShareCard
              entryPrice={cachedPositionData.entryPrice}
              indexToken={cachedPositionData.indexToken}
              isLong={cachedPositionData.isLong}
              leverage={isPnlInLeverage ? cachedPositionData.leverageWithPnl : cachedPositionData.leverageWithoutPnl}
              markPrice={cachedPositionData.markPrice}
              pnlAfterFeesPercentage={cachedPositionData.pnlAfterFeesPercentage}
              pnlAfterFeesUsd={cachedPositionData.pnlAfterFeesUsd}
              referralCodeOwnerKind={referralCodeOwnerKind}
              code={code}
              ref={cardRef}
              loading={isUploading}
              sharePositionBgImg={sharePositionBgImg}
              showPnlAmounts={showPnlAmounts}
            />
          )}
        </div>
        {shouldShowCreateReferralCard && <CreateReferralCode onSuccess={handleReferralCodeSuccess} />}
      </div>
      <div className="flex flex-col gap-12 p-20 pb-0">
        <ToggleSwitch isChecked={showPnlAmounts} setIsChecked={setShowPnlAmounts}>
          <span className="text-14 font-medium text-typography-secondary">
            {isRpnl ? <Trans>Show rPnL after fees</Trans> : <Trans>Show PnL after fees</Trans>}
          </span>
        </ToggleSwitch>

        <ToggleSwitch isChecked={isPnlInLeverage} setIsChecked={setIsPnlInLeverage}>
          <span className="text-14 font-medium text-typography-secondary">
            {isRpnl ? <Trans>Include rPnL in leverage display</Trans> : <Trans>Include PnL in leverage display</Trans>}
          </span>
        </ToggleSwitch>

        {shouldShowSkipReferralCodeBanner && <SkipReferralCodeBanner onClose={closeCreateReferralCodeInfoMessage} />}
      </div>
      <div className="flex flex-col gap-16 p-20 pt-12">
        {uploadError && (
          <AlertInfoCard type="error" hideClose>
            {uploadError}
          </AlertInfoCard>
        )}
        <ShareCardActionButtons
          isUploading={isUploading}
          interceptOnClick={shouldPromptToCreateReferralCode ? handlePromptToCreateReferralCode : undefined}
          onCopyLink={handleCopy}
          onCopyImage={handleCopyImage}
          onShareTwitter={handleShareTwitter}
        />
        {Boolean(onDoNotShowAgainChange) && (
          <div className="flex justify-center">
            <Checkbox isChecked={doNotShowAgain} setIsChecked={handleDoNotShowAgainToggle}>
              <span className="text-14 font-medium text-typography-secondary">
                <Trans>Don't show this again</Trans>
              </span>
            </Checkbox>
          </div>
        )}
      </div>
    </ModalWithPortal>
  );
}

export default PositionShare;
