import { Trans, t } from "@lingui/macro";
import { useCallback, useMemo, useRef, useState } from "react";
import { useCopyToClipboard } from "react-use";

import { useAffiliateCodes, useUserReferralCode } from "domain/referrals";
import { shareOrCopyElementAsImage } from "lib/copyElementAsImage";
import { helperToast } from "lib/helperToast";
import { getTwitterIntentURL } from "lib/legacy";
import { getShareURL, uploadElementAsShareImage } from "lib/shareImage";
import { useBreakpoints } from "lib/useBreakpoints";
import useLoadImage from "lib/useLoadImage";
import type { ContractsChainId } from "sdk/configs/chains";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import Button from "components/Button/Button";
import ExternalLink from "components/ExternalLink/ExternalLink";
import ModalWithPortal from "components/Modal/ModalWithPortal";

import CopyStrokeIcon from "img/ic_copy_stroke.svg?react";
import ShareArrowOutlineIcon from "img/ic_share_arrow_outline.svg?react";
import TwitterIcon from "img/ic_x.svg?react";
import pointsShareBgImg from "img/points-share-bg.png";

import { PointsShareCard } from "./PointsShareCard";
import CreateReferralCode, { REFERRAL_DOCS_LINK } from "../PositionShare/CreateReferralCode";

type Props = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  account: string | undefined;
  chainId: ContractsChainId;
  rank: number;
  pointsEarned: bigint;
  rewardsEarned: bigint;
};

export function PointsShare({ isOpen, setIsOpen, account, chainId, rank, pointsEarned, rewardsEarned }: Props) {
  const userAffiliateCode = useAffiliateCodes(chainId, account);
  const { userReferralCodeString: usedReferralCode } = useUserReferralCode(chainId, account);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [, copyToClipboard] = useCopyToClipboard();
  const { isMobile } = useBreakpoints();
  const shareBgImg = useLoadImage(pointsShareBgImg);
  const cardRef = useRef<HTMLDivElement>(null);
  const [createdReferralCode, setCreatedReferralCode] = useState<string | null>(null);

  const shareAffiliateCode = useMemo(() => {
    if (createdReferralCode) {
      return { code: createdReferralCode, success: true };
    }
    return userAffiliateCode;
  }, [createdReferralCode, userAffiliateCode]);
  const hasReferralCode = Boolean(shareAffiliateCode?.code);

  const { referralCodeOwnerKind, code } = useMemo(() => {
    if (hasReferralCode && shareAffiliateCode?.code) {
      return { referralCodeOwnerKind: "created" as const, code: shareAffiliateCode.code };
    }
    if (usedReferralCode) {
      return { referralCodeOwnerKind: "used" as const, code: usedReferralCode };
    }
    return { referralCodeOwnerKind: undefined, code: undefined };
  }, [hasReferralCode, shareAffiliateCode?.code, usedReferralCode]);

  const shouldShowCreateReferralCard = userAffiliateCode.success && !userAffiliateCode.code && !createdReferralCode;

  const handleReferralCodeSuccess = useCallback((code: string) => {
    setCreatedReferralCode(code);
  }, []);

  const uploadAndGetShareUrl = useCallback(async (): Promise<string | undefined> => {
    const element = cardRef.current;
    if (!element) return undefined;

    setIsUploading(true);
    setUploadError(null);
    element.classList.add("image-capture-in-progress");
    try {
      const imageInfo = await uploadElementAsShareImage(element);
      const ref = shareAffiliateCode.success && shareAffiliateCode.code ? shareAffiliateCode.code : undefined;
      return getShareURL(imageInfo.id, ref);
    } catch {
      setUploadError(t`Image generation failed. Refresh and try again.`);
      return undefined;
    } finally {
      element.classList.remove("image-capture-in-progress");
      setIsUploading(false);
    }
  }, [shareAffiliateCode]);

  async function handleCopyImage() {
    const element = cardRef.current;
    if (!element) return;
    await shareOrCopyElementAsImage({ element, isMobile, fileName: "GMX Points.png" });
  }

  async function handleCopy() {
    const url = await uploadAndGetShareUrl();
    if (url) {
      copyToClipboard(url);
      helperToast.success(t`Link copied to clipboard`);
    }
  }

  const handleShareTwitter = useCallback(async () => {
    const url = await uploadAndGetShareUrl();
    const tweetLink = getTwitterIntentURL(`I'm ranked #${rank} on @GMX_IO`, url);
    window.open(tweetLink, "_blank", "noopener,noreferrer");
  }, [rank, uploadAndGetShareUrl]);

  const createReferralCodeDescription = (
    <Trans>
      Get up to 20% in rewards and give your community up to 10% off on every trade. Higher referrals tiers unlock
      higher benefits.{" "}
      <ExternalLink className="font-medium text-blue-300 !no-underline" href={REFERRAL_DOCS_LINK} newTab>
        <Trans>Read more</Trans>
      </ExternalLink>
      .
    </Trans>
  );

  return (
    <ModalWithPortal
      contentClassName="md:!max-w-[500px]"
      isVisible={isOpen}
      setIsVisible={setIsOpen}
      label={t`Share your rewards`}
      contentPadding={false}
      withMobileBottomPosition
    >
      <div className="flex flex-col gap-20 border-b-1/2 border-slate-600 p-20">
        <div className="flex justify-center">
          <PointsShareCard
            rank={rank}
            pointsEarned={pointsEarned}
            rewardsEarned={rewardsEarned}
            referralCodeOwnerKind={referralCodeOwnerKind}
            code={code}
            ref={cardRef}
            loading={isUploading}
            shareBgImg={shareBgImg}
          />
        </div>
        {shouldShowCreateReferralCard && (
          <CreateReferralCode onSuccess={handleReferralCodeSuccess} description={createReferralCodeDescription} />
        )}
        {uploadError && (
          <AlertInfoCard type="error" hideClose>
            {uploadError}
          </AlertInfoCard>
        )}
      </div>
      <div className="flex flex-col gap-16 p-20">
        <div className="flex gap-12">
          <Button
            variant="secondary"
            disabled={isUploading}
            onClick={handleCopy}
            size="medium"
            className="grow !text-14"
          >
            <Trans>Copy link</Trans>
            <CopyStrokeIcon className="size-16" />
          </Button>
          <Button variant="secondary" onClick={handleCopyImage} size="medium" className="grow !text-14">
            {isMobile ? (
              <>
                <Trans>Share</Trans>
                <ShareArrowOutlineIcon className="size-16" />
              </>
            ) : (
              <>
                <Trans>Copy image</Trans>
                <CopyStrokeIcon className="size-16" />
              </>
            )}
          </Button>
          <Button
            variant="secondary"
            disabled={isUploading}
            onClick={handleShareTwitter}
            size="medium"
            className="grow !text-14"
          >
            <Trans>Share on</Trans>
            <TwitterIcon className="size-16" />
          </Button>
        </div>
      </div>
    </ModalWithPortal>
  );
}

export default PointsShare;
