import { Trans } from "@lingui/macro";

import { useHomePageContext } from "landing/Home/contexts/HomePageContext";
import { cleanFormatUsd } from "landing/Home/utils/formatters";

import { PoolCards } from "./PoolCards";
import { useGoToPools } from "../hooks/useGoToPools";

export function LiqiuditySection() {
  const { poolsData } = useHomePageContext();
  const totalLiquidity = poolsData?.totalLiquidity ? cleanFormatUsd(poolsData.totalLiquidity) : "-";
  const onClickEarn = useGoToPools("GLV");
  return (
    <section className="bg-light-150 flex w-full px-16 py-80 text-slate-900 sm:px-40 sm:py-[120px]">
      <div className="mx-auto flex w-[1200px] flex-col items-stretch justify-center overflow-hidden sm:items-start">
        <h2 className="text-heading-2 mb-20 sm:mb-28">
          {totalLiquidity}
          <br />
          <Trans>in available liquidity</Trans>
        </h2>
        <div className="mb-44 flex w-full flex-col items-stretch justify-between gap-24 lg:flex-row lg:items-center">
          <h3 className="leading-heading-md text-18 font-medium -tracking-[0.896px] sm:text-[28px]">
            <Trans>Join {poolsData.totalDepositedUsers} users earning real yield.</Trans>
          </h3>
          <button onClick={onClickEarn} className="btn-landing rounded-8 px-16 py-12 text-16 text-white">
            <Trans>Start Earning</Trans>
          </button>
        </div>
        <div className="flex w-full flex-col justify-between gap-16 lg:flex-row">
          <PoolCards />
        </div>
      </div>
    </section>
  );
}
