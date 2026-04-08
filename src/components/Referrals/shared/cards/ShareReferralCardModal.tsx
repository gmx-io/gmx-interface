import { t, Trans } from "@lingui/macro";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCopyToClipboard } from "react-use";

import { shareOrCopyElementAsImage } from "lib/copyElementAsImage";
import { helperToast } from "lib/helperToast";
import { getHomeUrl, getTwitterIntentURL } from "lib/legacy";
import { formatUsd } from "lib/numbers";
import { useBreakpoints } from "lib/useBreakpoints";

import Button from "components/Button/Button";
import { SlideModal } from "components/Modal/SlideModal";

import logoIcon from "img/gmx_logo.svg";
import CopyStrokeIcon from "img/ic_copy_stroke.svg?react";
import ShareArrowOutlineIcon from "img/ic_share_arrow_outline.svg?react";
import XIcon from "img/ic_x.svg?react";
import LogoText from "img/logo-text.svg?react";
import shareReferralCodeBg from "img/share_refferral_code_bg.png";

type ShareReferralCardModalProps = {
  isVisible: boolean;
  setIsVisible: (visible: boolean) => void;
  referralCode: string;
  traderDiscountPercentage?: string | number;
  totalDiscountsUsd?: bigint;
  hasReferredUsers?: boolean;
};

export function ShareReferralCardModal({
  isVisible,
  setIsVisible,
  referralCode,
  traderDiscountPercentage,
  totalDiscountsUsd,
  hasReferredUsers = true,
}: ShareReferralCardModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [, copyToClipboard] = useCopyToClipboard();
  const { isMobile } = useBreakpoints();
  const homeURL = getHomeUrl();
  const referralLink = `${homeURL}/#/trade/?ref=${referralCode}`;
  const totalDiscountsFormatted = useMemo(
    () => formatUsd(totalDiscountsUsd, { fallbackToZero: true }),
    [totalDiscountsUsd]
  );
  const traderDiscountPercentageLabel = useMemo(
    () => (traderDiscountPercentage !== undefined ? `${String(traderDiscountPercentage)}%` : "10%"),
    [traderDiscountPercentage]
  );
  const tweetLink = useMemo(() => {
    const discountsText = hasReferredUsers
      ? `\n\nSo far, my referrals have saved ${totalDiscountsFormatted} total in discounts with my code: ${referralCode}`
      : "";
    const text = `Save up to ${traderDiscountPercentageLabel} on every trade on GMX.${discountsText}`;
    return getTwitterIntentURL(text, referralLink);
  }, [traderDiscountPercentageLabel, hasReferredUsers, totalDiscountsFormatted, referralCode, referralLink]);

  const handleCopyLink = useCallback(() => {
    copyToClipboard(referralLink);
    helperToast.success(t`Referral link copied to clipboard`);
  }, [copyToClipboard, referralLink]);

  const [isCapturing, setIsCapturing] = useState(false);

  const handleCopyImage = useCallback(async () => {
    if (!cardRef.current) return;

    setIsCapturing(true);
    cardRef.current.classList.add("image-capture-in-progress");
    const captureOptions = { style: { transform: "none", borderRadius: "0" } };

    try {
      await shareOrCopyElementAsImage({
        element: cardRef.current,
        isMobile,
        fileName: "GMX Referral.png",
        extraOptions: captureOptions,
      });
    } finally {
      cardRef.current?.classList.remove("image-capture-in-progress");
      setIsCapturing(false);
    }
  }, [isMobile]);

  return (
    <SlideModal
      isVisible={isVisible}
      setIsVisible={setIsVisible}
      label={<Trans>Share your referral card</Trans>}
      desktopContentClassName="w-[500px]"
      fitContent
    >
      <div className="flex flex-col gap-12">
        <ScaledReferralCard
          cardRef={cardRef}
          referralLink={referralLink}
          referralCode={referralCode}
          traderDiscountPercentageLabel={traderDiscountPercentageLabel}
          totalDiscountsFormatted={totalDiscountsFormatted}
          hasReferredUsers={hasReferredUsers}
        />

        <div className="flex gap-12">
          <Button
            newTab
            variant="secondary"
            to={tweetLink}
            size="medium"
            className="grow !text-14"
            showExternalLinkArrow={false}
          >
            <Trans>Share on</Trans>
            <XIcon className="size-20" />
          </Button>
          <Button
            variant="secondary"
            onClick={handleCopyImage}
            size="medium"
            className="grow !text-14"
            disabled={isCapturing}
          >
            {isCapturing ? (
              <Trans>Generating...</Trans>
            ) : isMobile ? (
              <>
                <Trans>Share</Trans>
                <ShareArrowOutlineIcon className="size-20" />
              </>
            ) : (
              <>
                <Trans>Copy image</Trans>
                <CopyStrokeIcon className="size-20" />
              </>
            )}
          </Button>
          <Button variant="secondary" onClick={handleCopyLink} size="medium" className="grow !text-14">
            <Trans>Copy link</Trans>
            <CopyStrokeIcon className="size-20" />
          </Button>
        </div>
      </div>
    </SlideModal>
  );
}

const CARD_WIDTH = 460;
const CARD_HEIGHT = 240;

function ScaledReferralCard({
  cardRef,
  referralLink,
  referralCode,
  traderDiscountPercentageLabel,
  totalDiscountsFormatted,
  hasReferredUsers,
}: {
  cardRef: React.Ref<HTMLDivElement>;
  referralLink: string;
  referralCode: string;
  traderDiscountPercentageLabel: string;
  totalDiscountsFormatted: string | undefined;
  hasReferredUsers: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver(([entry]) => {
      const containerWidth = entry.contentRect.width;
      setScale(Math.min(containerWidth / CARD_WIDTH, 1));
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const styles = useMemo(
    () => ({
      containerStyle: { height: CARD_HEIGHT * scale },
      cardStyle: { width: CARD_WIDTH, height: CARD_HEIGHT, transform: `scale(${scale})`, transformOrigin: "top left" },
    }),
    [scale]
  );

  return (
    <div ref={containerRef} style={styles.containerStyle}>
      <div ref={cardRef} className="relative overflow-hidden rounded-8" style={styles.cardStyle}>
        <img src={shareReferralCodeBg} className="absolute inset-0 size-full object-cover" aria-hidden />
        <div className="absolute right-16 top-16 rounded-4 bg-white p-4">
          <QRCodeSVG value={referralLink} size={44} level="M" bgColor="white" fgColor="black" />
        </div>
        <div className="relative z-10 flex h-full flex-col justify-between p-20">
          <div className="flex items-start justify-between">
            <div className="flex items-center text-typography-primary">
              <img src={logoIcon} alt="GMX Logo" className="w-22" />
              <LogoText className="h-14" />
            </div>
          </div>

          <div>
            <div className="mb-8 inline-block rounded-full bg-blue-300/20 px-6 py-2 text-16 font-medium leading-[20px] text-blue-300">
              <div className="support-chat-new-badge">{referralCode}</div>
            </div>
            <h3 className="text-32 font-medium leading-1 text-white">
              <Trans>
                <span className="support-chat-new-badge">Save up to {traderDiscountPercentageLabel}</span> on every
                <br /> trade on GMX.
              </Trans>
            </h3>
            {hasReferredUsers && (
              <p className="text-body-medium mt-12 font-medium text-typography-secondary">
                <Trans>
                  So far, my referrals have saved {totalDiscountsFormatted} total in discounts with my code:{" "}
                  {referralCode}
                </Trans>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
