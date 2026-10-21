import { Trans } from "@lingui/macro";
import cx from "classnames";
import { Link } from "react-router-dom";

import { ARBITRUM } from "config/chains";
import { useIncentivesConfig } from "domain/synthetics/incentives/v2/useIncentivesConfig";
import { formatFactorPercentage, getMaxRewardRateFactor } from "domain/synthetics/incentives/v2/utils";
import type { LandingPageRewardsClickEvent } from "lib/userAnalytics/types";
import { userAnalytics } from "lib/userAnalytics/UserAnalytics";

import { RewardsOrbit } from "./RewardsOrbit";
import { RewardsHeaderBadge } from "../../Rewards/RewardsHeaderBadge";
import { RewardsValue } from "../../Rewards/RewardsValue";

export function RewardsSection() {
  const config = useIncentivesConfig(ARBITRUM);
  const loading = config.loading || config.isValidating;

  function openRewards() {
    userAnalytics.pushEvent<LandingPageRewardsClickEvent>(
      { event: "LandingPageAction", data: { action: "RewardsPageClick" } },
      { instantSend: true }
    );
  }

  return (
    <section
      className={cx(
        "overflow-hidden text-white [--rewards-skeleton-base:#1e2033] [--rewards-skeleton-highlight:#2c3050] [background:#090a14]",
        "max-small:[&_.rewards-live]:gap-8 max-small:[&_.rewards-live]:[border:1px_solid_#a4c3f9] max-small:[&_.rewards-live]:text-12",
        "max-small:[&_.rewards-live]:leading-[16px] max-small:[&_.rewards-live]:pt-4 max-small:[&_.rewards-live]:pr-12",
        "max-small:[&_.rewards-live]:pb-4 max-small:[&_.rewards-live]:pl-8",
        "max-small:[&_.rewards-live_i]:w-8 max-small:[&_.rewards-live_i]:h-8",
        "max-small:[&_.rewards-live-full]:inline",
        "max-small:[&_.rewards-live-compact]:hidden"
      )}
      aria-labelledby="home-rewards-title"
    >
      <div
        className={cx(
          "relative mx-auto my-0 flex min-h-[900px] w-[min(1200px,_calc(100%_-_80px))] items-center pb-30",
          "max-desktop:min-h-[760px]",
          "max-tablet:min-h-0 max-tablet:w-[calc(100%_-_32px)] max-tablet:flex-col max-tablet:items-stretch max-tablet:pb-[100px] max-tablet:pl-0",
          "max-tablet:pr-0 max-tablet:pt-80"
        )}
      >
        <div
          className={cx(
            "relative w-[720px] [z-index:1]",
            "max-desktop:w-[60%]",
            "max-tablet:w-full",
            "[&_h2]:mt-24 [&_h2]:text-[76px] [&_h2]:font-medium [&_h2]:leading-[74px] [&_h2]:tracking-[-0.04em]",
            "max-desktop:[&_h2]:text-[56px] max-desktop:[&_h2]:leading-[58px]",
            "max-tablet:[&_h2]:text-[clamp(32px,_8.5vw,_56px)] max-tablet:[&_h2]:leading-[1.03]"
          )}
        >
          <RewardsHeaderBadge />
          <h2 id="home-rewards-title">
            <Trans>
              Every Wednesday,
              <br />
              your fees come back.
            </Trans>
          </h2>
          <Link
            className="btn-landing mt-40 inline-flex min-h-60 items-center justify-center rounded-8 px-24 py-20 text-16 leading-[20px] tracking-[-0.032em]"
            to="/rewards"
            onClick={openRewards}
          >
            <Trans>Check my multiplier</Trans>
          </Link>
        </div>
        <div
          className={cx(
            "absolute left-[780px] top-[calc(50%_-_55px)] w-[326.5px] [transform:translateY(-50%)]",
            "max-lg-desktop:left-auto max-lg-desktop:right-80 max-lg-desktop:[transform:translateY(-50%)_scale(0.85)]",
            "max-lg-desktop:[transform-origin:right_center]",
            "max-tablet:relative max-tablet:right-auto max-tablet:top-auto max-tablet:mb-40 max-tablet:ml-auto max-tablet:mr-auto max-tablet:mt-[100px]",
            "max-tablet:w-[min(326.5px,_calc(100%_-_48px))] max-tablet:[transform:none]"
          )}
        >
          <RewardsOrbit />
          <div
            className={cx(
              "relative rounded-20 p-32 shadow-[0_24px_64px_-12px_#03053380,_inset_0_-16px_40px_12px_#2d42fc52]",
              "[backdrop-filter:blur(6px)] [background:#171827cc] [border:1px_solid_#2e3b47] [transform:rotate(2.12deg)] [z-index:1]",
              "[&_strong]:text-transparent [&_strong]:mt-8 [&_strong]:block [&_strong]:text-[96px] [&_strong]:font-medium [&_strong]:leading-[94px]",
              "[&_strong]:tracking-[-0.052em] [&_strong]:[background-clip:text] [&_strong]:[background-image:linear-gradient(110deg,_#a4c3f9,_#7885ff)]",
              "max-tablet:p-24",
              "max-tablet:[&_strong]:text-[clamp(72px,_20vw,_100px)] max-tablet:[&_strong]:leading-[0.94]"
            )}
          >
            <p className="text-12 uppercase leading-[16px] tracking-[0.072em]">
              <Trans>Returned to you up to</Trans>
            </p>
            <strong>
              <RewardsValue loading={loading} width="4ch">
                {config.data ? formatFactorPercentage(getMaxRewardRateFactor(config.data)) : undefined}
              </RewardsValue>
            </strong>
            <p className="mt-12 text-15 leading-[20px] tracking-[-0.032em]">
              <Trans>of your fees, in esGMX + GT</Trans>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
