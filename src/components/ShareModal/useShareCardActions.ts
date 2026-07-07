import { t } from "@lingui/macro";
import { useCallback, useState } from "react";
import { useCopyToClipboard } from "react-use";

import type { AffiliateCodesState } from "domain/referrals";
import { shareOrCopyElementAsImage } from "lib/copyElementAsImage";
import { helperToast } from "lib/helperToast";
import { getTwitterIntentURL } from "lib/legacy";
import { getShareURL, uploadElementAsShareImage } from "lib/shareImage";
import { useBreakpoints } from "lib/useBreakpoints";
import { userAnalytics } from "lib/userAnalytics";
import { SharePositionActionEvent, SharePositionActionSource } from "lib/userAnalytics/types";

type Params = {
  cardRef: React.RefObject<HTMLDivElement>;
  shareAffiliateCode: AffiliateCodesState;
  source: SharePositionActionSource;
  fileName: string;
  tweetText: string;
  onShareAction?: () => void;
};

export function useShareCardActions({
  cardRef,
  shareAffiliateCode,
  source,
  fileName,
  tweetText,
  onShareAction,
}: Params) {
  const hasReferralCode = Boolean(shareAffiliateCode.code);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [, copyToClipboard] = useCopyToClipboard();
  const { isMobile } = useBreakpoints();

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
  }, [cardRef, shareAffiliateCode]);

  const handleCopyImage = useCallback(async () => {
    const element = cardRef.current;
    onShareAction?.();
    if (!element) return;
    userAnalytics.pushEvent<SharePositionActionEvent>({
      event: "SharePositionAction",
      data: {
        action: isMobile ? "ShareImage" : "CopyImage",
        source,
        hasReferralCode,
      },
    });

    await shareOrCopyElementAsImage({ element, isMobile, fileName });
  }, [cardRef, fileName, hasReferralCode, isMobile, onShareAction, source]);

  const handleCopy = useCallback(async () => {
    onShareAction?.();

    userAnalytics.pushEvent<SharePositionActionEvent>({
      event: "SharePositionAction",
      data: {
        action: "Copy",
        source,
        hasReferralCode,
      },
    });

    const url = await uploadAndGetShareUrl();
    if (url) {
      copyToClipboard(url);
      helperToast.success(t`Link copied to clipboard`);
    }
  }, [copyToClipboard, hasReferralCode, onShareAction, source, uploadAndGetShareUrl]);

  const handleShareTwitter = useCallback(async () => {
    onShareAction?.();
    userAnalytics.pushEvent<SharePositionActionEvent>(
      {
        event: "SharePositionAction",
        data: {
          action: "ShareTwitter",
          source,
          hasReferralCode,
        },
      },
      { instantSend: true }
    );

    const url = await uploadAndGetShareUrl();
    if (!url) {
      return;
    }

    const tweetLink = getTwitterIntentURL(tweetText, url);
    window.open(tweetLink, "_blank", "noopener,noreferrer");
  }, [hasReferralCode, onShareAction, source, tweetText, uploadAndGetShareUrl]);

  return { isUploading, uploadError, handleCopy, handleCopyImage, handleShareTwitter };
}
