import { Trans } from "@lingui/macro";
import cx from "classnames";
import { useHeroStats, type HeroStat } from "landing/pages/Home/hooks/useHeroStats";
import { shortFormat, shortFormatUsd } from "landing/pages/Home/utils/formatters";

import { ChainsStatsNotices } from "components/StatsTooltip/ChainsStatsNotices";
import { useSettled } from "components/StatsTooltip/useSettled";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import IcLinkArrow from "img/ic_link_arrow.svg?react";
import IcMidChevron from "img/ic_mid_chevron.svg?react";

import { AnimatedTitle } from "./AnimatedTitle";
import { Features } from "./Features";
import { HeroBackground } from "./HeroBackground";
import { RedirectChainIds, useGoToTrade } from "../hooks/useGoToTrade";

function StatValue({
  stat: { summary, staleEntries },
  format,
  className,
}: {
  stat: HeroStat;
  format: (total: bigint) => string;
  className: string;
}) {
  const partial = summary.missingTitles.length > 0;
  const settled = useSettled(!partial);

  if (partial && !settled) {
    return <div className={className}>-</div>;
  }

  const text = summary.total === undefined ? "-" : format(summary.total);

  if (!partial && staleEntries.length === 0) {
    return <div className={className}>{text}</div>;
  }

  return (
    <TooltipWithPortal
      variant="none"
      tooltipClassName="!text-14 !text-white !rounded-16 !p-20 !font-medium !leading-[1.36] ![background:#3C4067] [&>svg]:!fill-[#3C4067]"
      handle={
        <div className={cx(className, "underline decoration-dotted decoration-[4%] underline-offset-8")}>{text}</div>
      }
      content={
        <div className="flex max-w-[260px] flex-col gap-8">
          <ChainsStatsNotices missingTitles={summary.missingTitles} staleEntries={staleEntries} />
        </div>
      }
    />
  );
}

export function HeroSection() {
  const goToTradeArbitrum = useGoToTrade({
    buttonPosition: "HeroSection",
    chainId: RedirectChainIds.Arbitum,
  });
  const { traders, openInterest, totalVolume } = useHeroStats();
  const onTotalVolumeClick = () => {
    window.open("https://dune.com/gmx-io/gmx-analytics", "_blank");
  };

  return (
    <section className="bg-slate-900 overflow-hidden px-16 sm:px-40">
      <div className="mx-auto sm:max-w-[1200px]">
        <div className="relative h-[640px] py-56 sm:h-[860px] sm:py-80 ">
          <HeroBackground />
          <div className="relative flex h-full w-full flex-col justify-end">
            <div className="text-heading-1 border-b-slate-600 mb-24 w-full border-b-0 pb-24 sm:border-b-1/2 sm:pb-32">
              <div className="float-left">
                <Trans>Trade</Trans>
              </div>{" "}
              <AnimatedTitle />
              <Trans>from your wallet</Trans>
            </div>
            {/* Stats and description */}
            <div className="flex flex-wrap items-end justify-between gap-0 sm:gap-56">
              <div className="flex flex-1 flex-col-reverse items-stretch sm:flex-row sm:gap-32">
                <button
                  className="btn-landing my-24 flex w-full flex-col items-start gap-4 rounded-12 pb-12 pl-12 pr-8 pt-8 text-16 font-medium sm:m-0 sm:w-[200px]"
                  onClick={goToTradeArbitrum}
                >
                  <div className="bg-white self-end rounded-full p-4">
                    <IcLinkArrow className="text-blue-400 size-8" />
                  </div>
                  <Trans>Trade now</Trans>
                </button>
                <div className="text-subheadline sm:w-[226px]">
                  <Trans>
                    Decentralised permissionless on-chain exchange with deep liquidity and low costs, live since 2021
                  </Trans>
                </div>
              </div>
              <div className="border-t-slate-600 flex w-full flex-row flex-wrap gap-32 pt-24 sm:w-auto sm:gap-56 sm:border-t-0 sm:pt-0">
                <div className="flex flex-col gap-4">
                  <span className="text-12 sm:text-14 text-nowrap text-slate-400">
                    <Trans>Traders</Trans>
                  </span>
                  <StatValue
                    stat={traders}
                    format={(total) => shortFormat(Number(total))}
                    className="text-[30px] font-medium tracking-tight sm:text-[40px]"
                  />
                </div>
                <div className="flex flex-col gap-4">
                  <span className="text-12 sm:text-14 text-nowrap text-slate-400">
                    <Trans>Open interest</Trans>
                  </span>
                  <StatValue
                    stat={openInterest}
                    format={shortFormatUsd}
                    className="text-[30px] font-medium tracking-tight sm:text-[40px]"
                  />
                </div>
                <div className="group flex cursor-pointer flex-col gap-4" onClick={onTotalVolumeClick}>
                  <span className="duration-180 text-12 group-hover:text-blue-300 sm:text-14 inline-flex items-center text-nowrap text-slate-400 transition-colors">
                    <Trans>Total volume</Trans>{" "}
                    <IcMidChevron className="duration-180 size-16 transition-transform group-hover:translate-x-4" />
                  </span>
                  <StatValue
                    stat={totalVolume}
                    format={shortFormatUsd}
                    className="duration-180 group-active:text-white/80 text-[30px] font-medium tracking-tight transition-colors sm:text-[40px]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <Features goToTradeArbitrum={goToTradeArbitrum} />
      </div>
    </section>
  );
}
