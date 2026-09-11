import { Trans } from "@lingui/macro";
import { QRCodeSVG } from "qrcode.react";
import { forwardRef, type ReactNode } from "react";

import type { IncentivesConfig } from "domain/synthetics/incentives/v2/types";
import { formatFactorPercentage } from "domain/synthetics/incentives/v2/utils";

import gmxLogo from "img/ic_gmx_header.svg";

import { RewardsValue } from "./RewardsValue";

export function ReferralCardFrame({
  config,
  loading = false,
  children,
  preview,
}: {
  config: IncentivesConfig | null | undefined;
  loading?: boolean;
  children: ReactNode;
  preview?: ReactNode;
}) {
  return (
    <div className="rewards-referral-card" id="invite">
      <h3>
        <Trans>Invite other traders</Trans>
      </h3>
      <p>
        <Trans>
          and earn{" "}
          {config ? formatFactorPercentage(config.referralRewardShareFactor) : <RewardsValue loading={loading} />} of
          the rewards they generate in esGMX and GT.
        </Trans>
      </p>
      <div className="rewards-share-preview">{preview ?? <RewardsReferralCard />}</div>
      <div className="rewards-referral-actions">{children}</div>
    </div>
  );
}

export const RewardsReferralCard = forwardRef<HTMLDivElement, { code?: string; url?: string; loadingCode?: boolean }>(
  ({ code, url, loadingCode = false }, ref) => (
    <div ref={ref} className="rewards-share-image">
      <div className="rewards-share-image-header">
        <img src={gmxLogo} alt="GMX" width={56} height={20} />
        {url && <QRCodeSVG value={url} size={48} includeMargin />}
        {!url && loadingCode && <RewardsValue loading width={48} height={48} />}
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
        <span>
          <RewardsValue loading={loadingCode} width="6ch">
            {code ?? (loadingCode ? undefined : "GMX")}
          </RewardsValue>
        </span>
        <span>
          <RewardsValue loading={loadingCode} width="20ch">
            {url ? url.replace(/^https?:\/\//, "") : loadingCode ? undefined : "gmx.io/rewards"}
          </RewardsValue>
        </span>
      </div>
    </div>
  )
);
