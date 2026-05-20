import { Trans, t } from "@lingui/macro";
import { useEffect } from "react";
import { Link } from "react-router-dom";

import { getIncentivesV2Url } from "config/links";
import { useChainId } from "lib/chains";
import { formatAmount, formatUsd } from "lib/numbers";
import {
  sendManualDistributionDialogLearnMoreClickEvent,
  sendManualDistributionDialogShareClickEvent,
  sendManualDistributionDialogShownEvent,
  sendManualDistributionDialogTradeClickEvent,
} from "lib/userAnalytics/pointsEvents";

import Button from "components/Button/Button";
import ExternalLink from "components/ExternalLink/ExternalLink";
import ModalWithPortal from "components/Modal/ModalWithPortal";
import { usePointsBannerStyles } from "components/PointsPromoBanner/usePointsBannerStyles";

import MultiplierSolidIcon from "img/ic_multiplier_solid.svg?react";
import ShareIcon from "img/ic_share_arrow_filled.svg?react";
import pointsBannerCoinGmx from "img/points_banner_coin_gmx.png";

type Props = {
  isVisible: boolean;
  setIsVisible: (isVisible: boolean) => void;
  manualAllocatedPoints: bigint | undefined;
  manualBonusUsd: bigint | undefined;
};

export function HistoricalPointsAllocationModal({
  isVisible,
  setIsVisible,
  manualAllocatedPoints,
  manualBonusUsd,
}: Props) {
  const { chainId } = useChainId();
  const bannerStyles = usePointsBannerStyles();

  const pointsDisplay = manualAllocatedPoints !== undefined ? formatAmount(manualAllocatedPoints, 18, 0, true) : "";
  const usdDisplay = manualBonusUsd !== undefined ? formatUsd(manualBonusUsd) : undefined;

  useEffect(() => {
    if (isVisible) {
      sendManualDistributionDialogShownEvent({ manualAllocatedPoints, manualBonusUsd });
    }
  }, [isVisible, manualAllocatedPoints, manualBonusUsd]);

  const handleClose = () => {
    setIsVisible(false);
  };

  const handleStartTradingClick = () => {
    sendManualDistributionDialogTradeClickEvent();
    setIsVisible(false);
  };

  const handleReferralClick = () => {
    sendManualDistributionDialogShareClickEvent();
    setIsVisible(false);
  };

  return (
    <ModalWithPortal
      isVisible={isVisible}
      setIsVisible={(nextIsVisible) => {
        if (!nextIsVisible) {
          handleClose();
        }
      }}
      label={t`You've received points!`}
      contentClassName="w-[420px]"
      contentPadding={false}
      headerWrapperClassName="border-none !pb-0"
      withMobileBottomPosition
    >
      <div className="flex flex-col gap-20 pt-12">
        <div className="flex flex-col gap-12 px-adaptive">
          <div className="flex flex-col gap-4">
            <p className="text-12 font-medium text-typography-secondary">
              <Trans>Points allocated</Trans>
            </p>
            <div className="flex items-center gap-8">
              <div className="flex items-center justify-center rounded-full bg-blue-900 p-6 text-blue-100">
                <MultiplierSolidIcon className="size-24" />
              </div>
              <span className="text-[40px] font-medium leading-[1.1] tracking-[-0.016em] text-typography-primary">
                {pointsDisplay}
              </span>
              {usdDisplay !== undefined && (
                <span className="self-end pb-4 text-16 font-medium text-typography-secondary">{usdDisplay}</span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-14 font-medium text-blue-100">
              <Trans>
                As a thank-you for your previous trading on GMX, we've allocated points to your account. Start trading
                to unlock trading fee discounts and other rewards.
              </Trans>
            </p>
            <ExternalLink
              href={getIncentivesV2Url(chainId)}
              variant="icon-arrow"
              className="text-14 font-medium text-blue-300"
              onClick={sendManualDistributionDialogLearnMoreClickEvent}
            >
              <Trans>Learn more about the incentive program</Trans>
            </ExternalLink>
          </div>

          <Button variant="primary" className="mt-8 w-full" to="/trade" size="medium" onClick={handleStartTradingClick}>
            <Trans>Start trading</Trans>
          </Button>
        </div>

        <div className="border-t-1/2 border-stroke-primary" />

        <div className="px-adaptive pb-adaptive">
          <Link
            to="/referrals"
            onClick={handleReferralClick}
            className="relative grid grid-cols-[minmax(0,1fr)_72px] overflow-hidden rounded-8 border-1/2 border-stroke-primary bg-slate-900/50 p-12"
            style={bannerStyles}
          >
            <div className="relative z-10 flex min-w-0 flex-col gap-2">
              <h6 className="text-14 font-medium text-typography-primary">
                <Trans>Know someone who traded on GMX?</Trans>
              </h6>
              <p className="text-14 text-typography-secondary">
                <Trans>Share the rewards program and let them check their allocation.</Trans>
              </p>
              <span className="mt-2 flex items-center gap-4 text-14 font-medium text-blue-300">
                <Trans>Share your rewards</Trans>
                <ShareIcon className="size-12" />
              </span>
            </div>
            <img
              src={pointsBannerCoinGmx}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute bottom-[-24px] right-[-10px] size-[122px] select-none"
            />
          </Link>
        </div>
      </div>
    </ModalWithPortal>
  );
}
