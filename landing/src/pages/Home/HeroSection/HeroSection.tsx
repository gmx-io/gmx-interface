import { Trans } from "@lingui/macro";
import cx from "classnames";
import { useHeroStats, type HeroStat } from "landing/pages/Home/hooks/useHeroStats";
import { shortFormat, shortFormatUsd } from "landing/pages/Home/utils/formatters";

import { ChainsStatsNotices } from "components/StatsTooltip/ChainsStatsNotices";
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
  const text = summary.total === undefined ? "-" : format(summary.total);

  if (summary.missingTitles.length === 0 && staleEntries.length === 0) {
    return <div className={className}>{text}</div>;
  }

  return (
    <TooltipWithPortal
      variant="none"
      tooltipClassName="!rounded-16 !p-20 !text-14 !font-medium !leading-[1.36] !text-white ![background:#3C4067] [&>svg]:!fill-[#3C4067]"
      handle={
        <div
          className={cx(className, "text-yellow-300 underline decoration-dotted decoration-[4%] underline-offset-8")}
        >
          {text}
        </div>
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
    <section className="overflow-hidden bg-slate-900 px-16 sm:px-40">
      <div className="mx-auto sm:max-w-[1200px]">
        <div className="relative h-[640px] py-60 sm:h-[860px] sm:py-80 ">
          <HeroBackground />
          <div className="relative flex h-full w-full flex-col justify-end">
            <div className="text-heading-1 mb-28 w-full border-b-0 border-b-slate-600 pb-28 sm:border-b-1/2 sm:pb-36">
              <div className="float-left">
                <Trans>Trade</Trans>
              </div>{" "}
              <AnimatedTitle />
              <Trans>from your wallet</Trans>
            </div>
            {/* Stats and description */}
            <div className="flex flex-wrap items-end justify-between gap-0 sm:gap-56">
              <div className="flex flex-1 flex-col-reverse items-stretch sm:flex-row sm:gap-36">
                <button
                  className="btn-landing my-28 flex w-full flex-col items-start gap-4 rounded-12 pb-12 pl-12 pr-8 pt-8 text-16 font-medium sm:m-0 sm:w-[200px]"
                  onClick={goToTradeArbitrum}
                >
                  <div className="self-end rounded-full bg-white p-4">
                    <IcLinkArrow className="size-8 text-blue-400" />
                  </div>
                  <Trans>Trade now</Trans>
                </button>
                <div className="text-subheadline sm:w-[226px]">
                  <Trans>
                    Decentralised permissionless on-chain exchange with deep liquidity and low costs, live since 2021
                  </Trans>
                </div>
              </div>
              <div className="flex w-full flex-row flex-wrap gap-36 border-t-slate-600 pt-28 sm:w-auto sm:gap-60 sm:border-t-0 sm:pt-0">
                <div className="flex flex-col gap-4">
                  <span className="text-nowrap text-12 text-slate-400 sm:text-14">
                    <Trans>Traders</Trans>
                  </span>
                  <StatValue
                    stat={traders}
                    format={(total) => shortFormat(Number(total))}
                    className="text-[30px] font-medium tracking-tight sm:text-[40px]"
                  />
                </div>
                <div className="flex flex-col gap-4">
                  <span className="text-nowrap text-12 text-slate-400 sm:text-14">
                    <Trans>Open interest</Trans>
                  </span>
                  <StatValue
                    stat={openInterest}
                    format={shortFormatUsd}
                    className="text-[30px] font-medium tracking-tight sm:text-[40px]"
                  />
                </div>
                <div className="group flex cursor-pointer flex-col gap-4" onClick={onTotalVolumeClick}>
                  <span className="duration-180 inline-flex items-center text-nowrap text-12 text-slate-400 transition-colors group-hover:text-blue-300 sm:text-14">
                    <Trans>Total volume</Trans>{" "}
                    <IcMidChevron className="duration-180 size-16 transition-transform group-hover:translate-x-4" />
                  </span>
                  <StatValue
                    stat={totalVolume}
                    format={shortFormatUsd}
                    className="duration-180 text-[30px] font-medium tracking-tight transition-colors group-active:text-white/80 sm:text-[40px]"
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
