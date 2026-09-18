import { Trans } from "@lingui/macro";
import { QRCodeSVG } from "qrcode.react";
import { forwardRef, type ReactNode } from "react";

import type { IncentivesConfig } from "domain/synthetics/incentives/v2/types";
import {
  formatFactorPercentage,
  formatMultiplierAdjustment,
  getMaxRewardRateFactor,
} from "domain/synthetics/incentives/v2/utils";

import gmxLogo from "img/rewards-landing/share-logo.svg";

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
      <div className="rewards-share-preview">
        {preview ?? <RewardsReferralCard config={config} loading={loading} />}
      </div>
      <div className="rewards-referral-actions">{children}</div>
    </div>
  );
}

type ShareCardProps = {
  code?: string;
  url?: string;
  loadingCode?: boolean;
  config?: IncentivesConfig | null;
  loading?: boolean;
  hasBonus?: boolean;
};

export const RewardsReferralCard = forwardRef<HTMLDivElement, ShareCardProps>(
  ({ code, url, loadingCode = false, config, loading = false, hasBonus = false }, ref) => {
    const bonus = config?.boosts.find(({ boost }) => boost === "ManualAllocation")?.multiplier;
    const multiplier = (
      <RewardsValue loading={loading}>
        {config && bonus !== undefined ? formatMultiplierAdjustment(bonus, config.multiplierDecimals) : undefined}
      </RewardsValue>
    );
    const maximumRate = (
      <RewardsValue loading={loading}>
        {config ? formatFactorPercentage(getMaxRewardRateFactor(config)) : undefined}
      </RewardsValue>
    );
    return (
      <div ref={ref} className={`rewards-share-image ${hasBonus ? "is-comeback" : ""}`}>
        <div className="rewards-share-art" aria-hidden="true">
          <div className="rewards-share-coins" />
          <div className="rewards-share-glow rewards-share-glow-bottom">
            <div />
          </div>
          <div className="rewards-share-glow rewards-share-glow-top">
            <div />
          </div>
        </div>
        <div className="rewards-share-image-header">
          <img src={gmxLogo} alt="GMX" width={53} height={15} />
          {url && <QRCodeSVG value={url} size={48} includeMargin />}
          {!url && loadingCode && <RewardsValue loading width={48} height={48} />}
        </div>
        <div className="rewards-share-image-copy">
          {hasBonus ? (
            <>
              <strong>
                <Trans>I'm getting {multiplier} rewards</Trans>
              </strong>
              <span>
                <Trans>Traded on GMX before? Check your wallet</Trans>
              </span>
            </>
          ) : (
            <>
              <span>
                <Trans>Your trading fees come back to you</Trans>
              </span>
              <strong>
                <Trans>Up to {maximumRate}</Trans>
              </strong>
            </>
          )}
        </div>
        <div className="rewards-share-image-footer">
          <span className="rewards-share-code">
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
    );
  }
);
