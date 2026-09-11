import { Trans } from "@lingui/macro";
import { QRCodeSVG } from "qrcode.react";
import { forwardRef, type ReactNode } from "react";

import type { IncentivesConfig } from "domain/synthetics/incentives/v2/types";
import { formatFactorPercentage } from "domain/synthetics/incentives/v2/utils";

import gmxLogo from "img/ic_gmx_header.svg";

export function ReferralCardFrame({
  config,
  children,
  preview,
}: {
  config: IncentivesConfig | null | undefined;
  children: ReactNode;
  preview?: ReactNode;
}) {
  return (
    <div className="rewards-referral-card" id="invite">
      <h3>
        <Trans>Invite other traders</Trans>
      </h3>
      <p>
        {config ? (
          <Trans>
            and earn {formatFactorPercentage(config.referralRewardShareFactor)} of the rewards they generate in esGMX
            and GT.
          </Trans>
        ) : (
          <Trans>Earn esGMX and GT when your referrals trade.</Trans>
        )}
      </p>
      <div className="rewards-share-preview">{preview ?? <RewardsReferralCard />}</div>
      <div className="rewards-referral-actions">{children}</div>
    </div>
  );
}

export const RewardsReferralCard = forwardRef<HTMLDivElement, { code?: string; url?: string }>(({ code, url }, ref) => (
  <div ref={ref} className="rewards-share-image">
    <div className="rewards-share-image-header">
      <img src={gmxLogo} alt="GMX" width={56} height={20} />
      {url && <QRCodeSVG value={url} size={48} includeMargin />}
    </div>
    <div className="rewards-share-image-copy">
      <strong>
        <Trans>
          Your trading fees
          <br />
          come back to you.
        </Trans>
      </strong>
      <span>
        <Trans>Go check your rewards</Trans>
      </span>
    </div>
    <div className="rewards-share-image-footer">
      <span>{code ?? "GMX"}</span>
      <span>{url ? url.replace(/^https?:\/\//, "") : "gmx.io/rewards"}</span>
    </div>
  </div>
));
