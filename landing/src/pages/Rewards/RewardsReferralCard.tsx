import { Trans } from "@lingui/macro";
import cx from "classnames";
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
    <div
      className={cx(
        "rewards-referral-card relative flex min-h-[477px] flex-col items-center overflow-hidden rounded-20 p-32 text-center text-white",
        "[--rewards-skeleton-base:#b4bbff1a] [--rewards-skeleton-highlight:#b4bbff33]",
        "[background:url('../../src/img/rewards-landing/lines.svg')_center_140px_/_100%_auto_no-repeat,_radial-gradient(ellipse_at_0%_70%,_#13216b,_transparent_55%),_#171827]",
        "[&_h3]:text-50 [&_h3]:mb-8 [&_h3]:leading-[0.98] [&_h3]:tracking-[-0.04em]",
        "[&>p]:text-18 [&>p]:font-medium [&>p]:leading-[1.36] [&>p]:text-slate-500",
        "max-mobile:[&_h3]:text-34",
        "max-tablet:px-24 max-tablet:py-28",
        "max-mobile:min-h-[430px] max-mobile:px-20 max-mobile:py-28",
        "[&::before]:pointer-events-none [&::before]:absolute [&::before]:left-[-394px] [&::before]:top-[-90px] [&::before]:h-[472px]",
        "[&::before]:w-[931px] [&::before]:opacity-[0.6]",
        "[&::before]:[background:linear-gradient(214deg,_#090a1400_1%,_#090a14_83%),_url('../../src/img/rewards-landing/glow.png')_center_bottom_/_cover]",
        "[&::before]:[content:''] [&::before]:[filter:blur(46px)] [&::before]:[transform:rotate(90deg)_scaleY(-1)]",
        "[&>*]:relative",
        "max-mobile:[&>p]:text-15",
        "max-tablet:[&_h3]:text-[36px]"
      )}
      id="invite"
    >
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
      <div
        className={cx(
          "rewards-share-preview mx-0 my-24 grid min-h-[244px] w-full flex-1 grid-cols-[minmax(0,_1fr)] place-items-center px-20 py-[19.5px]",
          "max-tablet:pl-12 max-tablet:pr-12",
          "max-mobile:mx-0 max-mobile:my-16 max-mobile:min-h-[225px] max-mobile:px-12 max-mobile:py-16"
        )}
      >
        {preview ?? <RewardsReferralCard config={config} loading={loading} />}
      </div>
      <div
        className={cx(
          "rewards-referral-actions flex w-full flex-col gap-12 text-14",
          "[&>.rewards-button_svg]:h-20 [&>.rewards-button_svg]:w-20",
          "[&_.rewards-button]:min-h-40 [&_.rewards-button]:w-full [&_.rewards-button]:pb-8 [&_.rewards-button]:pt-8"
        )}
      >
        {children}
      </div>
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
      <div
        ref={ref}
        className={cx(
          "rewards-share-image relative flex min-h-[210px] w-[400px] min-w-0 max-w-full flex-col justify-between gap-16 rounded-12 p-16 text-left",
          "[background:#000001] [transform:rotate(-5.6deg)]",
          "max-mobile:h-auto max-mobile:min-h-[194px] max-mobile:p-16",
          hasBonus ? "is-comeback" : ""
        )}
      >
        <div
          className="rewards-share-art pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
          aria-hidden="true"
        >
          <div className="rewards-share-coins absolute left-[-39.25%] top-[-80.476%] h-[337.14%] w-[270.25%] opacity-[0.9] [background:url('../../src/img/rewards-landing/share-coins.png')_center_/_cover]" />
          <div
            className={cx(
              "rewards-share-glow rewards-share-glow-bottom absolute bottom-[-147.505%] right-[-89.965%] flex h-[314.649%] w-[168.216%] items-center",
              "justify-center",
              "[&>div]:h-[63.304%] [&>div]:w-[78.417%]",
              "[&>div]:[background:linear-gradient(227deg,_#090a1400_1%,_#090a14_83%),_url('../../src/img/rewards-landing/share-glow.png')_51.4%_41.2%_/_423.76%_461.84%]",
              "[&>div]:[filter:blur(30px)] [&>div]:[transform:rotate(139.49deg)]"
            )}
          >
            <div />
          </div>
          <div
            className={cx(
              "rewards-share-glow rewards-share-glow-top absolute bottom-[32.905%] right-[61.338%] flex h-[162.655%] w-[74.602%] items-center justify-center",
              "[&>div]:h-[85.838%] [&>div]:w-[112.952%]",
              "[&>div]:[background:linear-gradient(227deg,_#090a1400_1%,_#090a14_83%),_url('../../src/img/rewards-landing/share-glow.png')_51.4%_41.2%_/_423.76%_461.84%]",
              "[&>div]:[filter:blur(28px)] [&>div]:[transform:rotate(89.11deg)]"
            )}
          >
            <div />
          </div>
        </div>
        <div
          className={cx(
            "rewards-share-image-header flex min-h-55 items-start justify-between [z-index:1]",
            "[&>.rewards-skeleton]:absolute [&>.rewards-skeleton]:right-12 [&>.rewards-skeleton]:top-12 [&>.rewards-skeleton]:rounded-2",
            "[&>img]:mb-0 [&>img]:ml-3 [&>img]:mr-0 [&>img]:mt-2",
            "[&>svg]:absolute [&>svg]:right-12 [&>svg]:top-12 [&>svg]:rounded-2"
          )}
        >
          <img src={gmxLogo} alt="GMX" width={53} height={15} />
          {url && <QRCodeSVG value={url} size={48} includeMargin />}
          {!url && loadingCode && <RewardsValue loading width={48} height={48} />}
        </div>
        <div
          className={cx(
            "rewards-share-image-copy relative flex flex-col gap-8 leading-[1.2] tracking-[-0.04em]",
            "[&_strong]:text-transparent [&_strong]:text-[36px] [&_strong]:font-medium [&_strong]:[background-clip:text]",
            "[&_strong]:[background-image:linear-gradient(168deg,_#a4c3f9_15%,_#2d42fc_205%)]",
            "[&>span]:text-[20px] [&>span]:leading-[1.36]",
            "max-mobile:[&>span]:text-[20px]",
            "max-tablet:[&_strong]:text-[28px]",
            "max-mobile:[&_strong]:text-[28px]"
          )}
        >
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
        <div className="rewards-share-image-footer relative flex items-center justify-between gap-16 text-12 text-slate-500 [&>span]:[overflow-wrap:anywhere]">
          <span className="rewards-share-code rounded-7 px-7 py-4 text-blue-300 [background:#ffffff0a]">
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
