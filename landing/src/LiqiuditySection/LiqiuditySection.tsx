import { Trans } from "@lingui/macro";

import { useHomePageContext } from "landing/contexts/HomePageContext";
import { cleanFormatUsd } from "landing/utils/formatters";

import { PoolCards } from "./PoolCards";

export function LiqiuditySection() {
  const { poolsData } = useHomePageContext();
  const totalLiquidity = poolsData?.totalLiquidity ? cleanFormatUsd(poolsData.totalLiquidity) : "-";
  return (
    <section className="text-fiord-700 flex w-full bg-[#F4F5F9] px-16 py-80 sm:px-40 sm:py-[120px]">
      <div className="mx-auto flex w-[1200px] flex-col items-stretch justify-center overflow-hidden sm:items-start">
        <h2 className="text-heading-2 mb-20 sm:mb-28">
          {totalLiquidity}
          <br />
          <Trans>in available liquidity</Trans>
        </h2>
        <div className="mb-44 flex w-full flex-col items-stretch justify-between gap-24 lg:flex-row lg:items-center">
          <h3 className="leading-heading-md text-[28px] font-medium -tracking-[0.896px]">
            <Trans>Join 14000 users earning real yield.</Trans>
          </h3>
          <button className="btn-landing rounded-8 px-16 py-12 text-16 text-white">
            <Trans>Start Earning</Trans>
          </button>
        </div>
        <div className="flex w-full flex-col justify-between gap-16 md:flex-row">
          <PoolCards />
        </div>
      </div>
    </section>
  );
}
