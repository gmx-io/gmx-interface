import { Trans } from "@lingui/macro";

import bgProtection from "img/bg_protection.png";
import IcGears from "img/ic_gears.svg?react";
import IcChecked from "img/ic_new_checked.svg?react";
import IcNewLink from "img/ic_new_link_20.svg?react";
import IcProtection from "img/ic_protection.svg?react";

import { ChainIcons } from "../components/ChainIcons";
import { HeroBackground } from "../components/HeroBackground";
import { IconBox } from "../components/IconBox";
import { ProtectionBackground } from "../components/ProtectionBackground";

export function HeroSection() {
  return (
    <section className="overflow-hidden bg-fiord-700">
      <div className="mx-auto px-16 sm:max-w-[1360px] sm:px-80">
        <div className="relative py-80 sm:h-[860px] ">
          <HeroBackground />
          <div className="relative flex h-full flex-col justify-end">
            <h1 className="text-heading-1 mb-64">
              <Trans>Trade with</Trans>
              <Trans>100x leverage from your wallet</Trans>
            </h1>
            {/* Stats and description */}
            <div className="flex flex-wrap items-end justify-between gap-56 ">
              <div className="flex flex-1 flex-col-reverse items-stretch gap-36 sm:flex-row">
                <button className="btn-landing-bg flex w-full flex-col items-start gap-4 rounded-12 pb-12 pl-12 pr-8 pt-8 text-16 font-medium sm:w-[200px]">
                  <IcNewLink className="self-end" />
                  <Trans>Trade Now</Trans>
                </button>
                <div className="text-subheadline sm:w-[226px]">
                  <Trans>
                    Decentralised permissionless on-chain exchange with deep liquidity and low costs, live since 2021
                  </Trans>
                </div>
              </div>
              <div className="flex flex-row gap-36 sm:gap-60">
                <div className="flex flex-col gap-4">
                  <div className="text-nowrap text-12 text-secondary sm:text-14">Traders</div>
                  <div className="text-[30px] tracking-tight sm:text-[40px]">701K</div>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="text-nowrap text-12 text-secondary sm:text-14">Open Interest</div>
                  <div className="text-[30px] tracking-tight sm:text-[40px]">$137M</div>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="text-nowrap text-12 text-secondary sm:text-14">Total Volume</div>
                  <div className="text-[30px] tracking-tight sm:text-[40px]">$285B</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="relative grid grid-cols-1 grid-rows-6 gap-24 py-[120px] sm:grid-cols-3 sm:grid-rows-3">
          {/* Trade with confidence */}
          <div className="h-full rounded-20 bg-fiord-600 p-20 sm:col-start-1 sm:col-end-2 sm:row-start-1 sm:row-end-2 sm:min-h-[180px]">
            <div className="mb-18 flex flex-row items-center gap-20 border-b border-fiord-500 pb-20">
              <IconBox iconComponent={IcGears} />
              <div className="flex flex-col gap-4">
                <p className="text-12 uppercase text-secondary">
                  <Trans>Trade with confidence</Trans>
                </p>
                <p className="text-heading-4">
                  <Trans>Guaranteed Liquidity </Trans>
                </p>
              </div>
            </div>
            <p className="text-description">
              Benefit from up to 100x leverage, and guaranteed on-chain liquidity that's not dependent on order book
              depth
            </p>
          </div>
          {/* Support for numerous assets */}
          <div className="relative h-full overflow-hidden rounded-20 bg-fiord-600 p-28 sm:col-start-2 sm:col-end-3 sm:row-start-1 sm:row-end-3 sm:min-h-[180px]">
            <div className="h-full w-full overflow-hidden">
              <div className="relative">
                <p className="text-heading-4 sm:text-heading-3 mb-11">
                  <Trans>Support for</Trans> <br className="hidden sm:block" /> <Trans>Numerous Assets</Trans>
                </p>
                <p className="text-description">Use your preferred token to pay and collateralize your positions</p>
              </div>
              <div className="absolute left-1/2 mt-20 -translate-x-1/2 sm:bottom-0 sm:mt-0">
                <ChainIcons />
              </div>
            </div>
          </div>
          {/* Keep more of what you earn */}
          <div className="h-full rounded-20 bg-fiord-600 p-20 sm:col-start-3 sm:col-end-4 sm:row-start-1 sm:row-end-2 sm:min-h-[180px]">
            <div className="mb-18 flex flex-row items-center gap-20 border-b border-fiord-500 pb-20">
              <IconBox iconComponent={IcProtection} />
              <div className="flex flex-col gap-4">
                <p className="text-12 uppercase text-secondary">
                  <Trans>keep more of what you earn</Trans>
                </p>
                <p className="text-heading-4">
                  <Trans>Save on Costs </Trans>
                </p>
              </div>
            </div>
            <p className="text-description">Trade at scale without worrying about thin order books or slippage</p>
          </div>
          {/* Stay Safe from Liquidations */}
          <div className="relative h-full overflow-hidden rounded-20 bg-blue-600 p-20 sm:col-start-1 sm:col-end-2 sm:row-start-2 sm:row-end-4 sm:min-h-[180px]">
            <ProtectionBackground />
            <img src={bgProtection} alt="Protection" className="absolute bottom-1/2 left-1/2 w-[60%] object-cover" />
            <div className="relative flex h-full w-full flex-col justify-end">
              <p className="text-heading-4 sm:text-heading-3 mb-12">
                <Trans>
                  Stay Safe from <br /> Liquidations
                </Trans>
              </p>
              <p className="text-description text-white">
                Avoid price wicks with transparent, sub-second Chainlink price feeds tailor-made for GMX{" "}
              </p>
            </div>
          </div>
          {/* Non-Custodial, Secure & Permissionless */}
          <div className="h-full rounded-20 bg-fiord-600 p-20 sm:col-start-3 sm:col-end-4 sm:row-start-2 sm:row-end-3 sm:min-h-[180px]">
            <div className="flex h-full w-full flex-col justify-between">
              <p className="text-heading-4 mb-20 sm:mb-0">
                <Trans>Non-Custodial, Secure & Permissionless</Trans>
              </p>
              <div className="flex flex-row flex-wrap gap-12 text-[13px]">
                <div className="flex flex-1 flex-col items-stretch gap-8 sm:flex-row sm:flex-wrap sm:items-start">
                  <div className="flex flex-row items-center justify-center gap-2 rounded-8 bg-fiord-500/50 py-6 pl-3 pr-10 text-secondary">
                    <IcChecked className="text-blue-400" />
                    <p className="tracking-normal">
                      <Trans>No deposits required</Trans>
                    </p>
                  </div>
                  <div className="flex flex-row items-center justify-center gap-2 rounded-8 bg-fiord-500/50 py-6 pl-3 pr-10 text-secondary">
                    <IcChecked className="text-blue-400" />
                    <p className="tracking-normal">
                      <Trans>Trade from your wallet</Trans>
                    </p>
                  </div>
                  <div className="flex flex-row items-center justify-center gap-2 rounded-8 bg-fiord-500/50 py-6 pl-3 pr-10 text-secondary">
                    <IcChecked className="text-blue-400" />
                    <p className="tracking-normal">
                      <Trans>No loss of fund ownership</Trans>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative h-full overflow-hidden rounded-20 bg-fiord-600 p-20 sm:col-start-2 sm:col-end-4 sm:row-start-3 sm:row-end-4 sm:min-h-[180px] sm:p-28">
            <div className="relative flex h-full flex-col items-stretch justify-between gap-20 sm:flex-row sm:items-end">
              <div className="w-[360px]">
                <p className="text-heading-4 sm:text-heading-3 mb-12">
                  <Trans>Seamless Trading</Trans>
                </p>
                <p className="text-description">
                  Enjoy a frictionless trading experience and sidestep blockchain congestion with One-Click Trading and
                  GMX Express
                </p>
              </div>
              <button className="btn-landing-bg rounded-6 px-16 py-10 text-16">
                <Trans>Trade Now</Trans>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
