import { t, Trans } from "@lingui/macro";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useMemo, useRef } from "react";
import { useCopyToClipboard } from "react-use";

import { helperToast } from "lib/helperToast";
import { getHomeUrl, getTwitterIntentURL } from "lib/legacy";
import { formatUsd } from "lib/numbers";

import Button from "components/Button/Button";
import ModalWithPortal from "components/Modal/ModalWithPortal";

import logoIcon from "img/gmx_logo.svg";
import CopyStrokeIcon from "img/ic_copy_stroke.svg?react";
import DownloadIcon from "img/ic_download2.svg?react";
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

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return;

    try {
      const { toBlob } = await import("html-to-image");
      const blob = await toBlob(cardRef.current, { quality: 1, pixelRatio: 2 });

      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `gmx-referral-${referralCode}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch {
      helperToast.error(t`Failed to download image`);
    }
  }, [referralCode]);

  return (
    <ModalWithPortal
      isVisible={isVisible}
      setIsVisible={setIsVisible}
      label={<Trans>Share your referral card</Trans>}
      contentClassName="w-[500px]"
    >
      <div className="flex flex-col gap-12">
        <div ref={cardRef} className="relative aspect-[460/240] w-full overflow-hidden rounded-8">
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

            <div className="">
              <div className="mb-8 inline-block rounded-full bg-blue-300/20 px-6 py-2 text-16 font-medium text-blue-300">
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
          <Button variant="secondary" onClick={handleDownload} size="medium" className="grow !text-14">
            <Trans>Download</Trans>
            <DownloadIcon className="size-20" />
          </Button>
          <Button variant="secondary" onClick={handleCopyLink} size="medium" className="grow !text-14">
            <Trans>Copy link</Trans>
            <CopyStrokeIcon className="size-20" />
          </Button>
        </div>
      </div>
    </ModalWithPortal>
  );
}
