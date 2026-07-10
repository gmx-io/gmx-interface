import { Trans } from "@lingui/macro";

import { useBreakpoints } from "lib/useBreakpoints";

import Button from "components/Button/Button";

import CopyStrokeIcon from "img/ic_copy_stroke.svg?react";
import ShareArrowOutlineIcon from "img/ic_share_arrow_outline.svg?react";
import TwitterIcon from "img/ic_x.svg?react";

type Props = {
  isUploading: boolean;
  disabled?: boolean;
  interceptOnClick?: (e: React.MouseEvent<unknown>) => void;
  onCopyLink: () => void;
  onCopyImage: () => void;
  onShareTwitter: () => void;
};

export function ShareCardActionButtons({
  isUploading,
  disabled = false,
  interceptOnClick,
  onCopyLink,
  onCopyImage,
  onShareTwitter,
}: Props) {
  const { isMobile } = useBreakpoints();

  return (
    <div className="flex gap-12">
      <Button
        variant="secondary"
        disabled={disabled || isUploading}
        onClick={interceptOnClick ?? onCopyLink}
        size="medium"
        className="grow !text-14"
      >
        <Trans>Copy link</Trans>
        <CopyStrokeIcon className="size-16" />
      </Button>
      <Button
        variant="secondary"
        disabled={disabled || isUploading}
        onClick={interceptOnClick ?? onCopyImage}
        size="medium"
        className="grow !text-14"
      >
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
        disabled={disabled || isUploading}
        onClick={interceptOnClick ?? onShareTwitter}
        size="medium"
        className="grow !text-14"
      >
        <Trans>Share on</Trans>
        <TwitterIcon className="size-16" />
      </Button>
    </div>
  );
}
