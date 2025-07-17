import { Trans } from "@lingui/macro";

import glvCoin from "img/bg_coin_glv.png";
import gmCoin from "img/bg_coin_gm.png";
import gmxCoin from "img/bg_coin_gmx.png";
import IcGlvPool from "img/ic_glv_pool.svg?react";
import IcGmPool from "img/ic_gm_pool.svg?react";
import IcGmxPool from "img/ic_gmx_pool.svg?react";

import { PoolCard } from "./components/PoolCard";

export function LiqiuditySection() {
  return (
    <section className="flex w-full bg-[#F4F5F9] px-16 py-80 text-fiord-700 sm:px-80 sm:py-[120px]">
      <div className="mx-auto flex w-[1200px] flex-col items-stretch justify-center gap-24 overflow-hidden sm:items-start">
        <h2 className="text-heading-2 mb-20 sm:mb-28">
          $494 000 000
          <br />
          <Trans>in available liquidity</Trans>
        </h2>
        <div className="mb-44 flex w-full flex-col items-stretch justify-between gap-24 sm:flex-row sm:items-center">
          <h3 className="text-[28px] font-medium leading-heading-md -tracking-[0.896px]">
            <Trans>Deposited by 13 654 users.</Trans>
          </h3>
          <button className="btn-landing-bg rounded-8 px-16 py-12 text-16 text-white">
            <Trans>Start Earning</Trans>
          </button>
        </div>
        <div className="flex w-full flex-col justify-between gap-16 sm:flex-row">
          <PoolCard
            description="Stake for rewards and governance rights"
            name="GMX"
            to="/"
            apr={10}
            iconComponent={IcGmxPool}
            coinImage={gmxCoin}
          />
          <PoolCard
            description="Steady returns without management "
            name="GLV"
            to="/"
            apr={10}
            iconComponent={IcGlvPool}
            coinImage={glvCoin}
          />
          <PoolCard
            description="Invest with control over risk and reward"
            name="GM"
            to="/"
            apr={10}
            iconComponent={IcGmPool}
            coinImage={gmCoin}
          />
        </div>
      </div>
    </section>
  );
}
