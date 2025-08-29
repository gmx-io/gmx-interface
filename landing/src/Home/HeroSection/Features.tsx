import { Trans } from "@lingui/macro";

import bgProtection from "img/bg_protection.png";
import AsssetsBg from "img/bg_support_assets.png";
import IcGears from "img/ic_gears.svg?react";
import IcChecked from "img/ic_new_checked.svg?react";
import IcProtection from "img/ic_protection.svg?react";

import { ChainIcons } from "./ChainIcons";
import { ProtectionBackground } from "./ProtectionBackground";
import { SeamlessBackground } from "./SeamlessBackground";
import { IconBox } from "../IconBox/IconBox";

const assetsBgStyle = {
  backgroundImage: `url(${AsssetsBg})`,
  backgroundSize: "cover",
};

type Props = {
  goToTradeArbitrum: () => void;
};

export function Features({ goToTradeArbitrum }: Props) {
  return (
    <div className="relative flex flex-col gap-24 py-80 lg:grid lg:grid-cols-3 lg:grid-rows-3 lg:py-[120px]">
      <div className="flex flex-col gap-24 lg:col-start-1 lg:col-end-2 lg:row-start-1 lg:row-end-4">
        {/* Trade with confidence */}
        <div className="bg-fiord-600 flex-grow-0 rounded-20 p-20">
          <div className="border-fiord-500 mb-18 flex flex-row items-center gap-20 border-b pb-20">
            <IconBox iconComponent={IcGears} />
            <div className="flex flex-col gap-4">
              <p className="text-secondary text-12 uppercase tracking-[0.864px]">
                <Trans>Trade with confidence</Trans>
              </p>
              <p className="text-heading-4">
                <Trans>Guaranteed Liquidity </Trans>
              </p>
            </div>
          </div>
          <p className="text-description">
            Benefit from up to 100x leverage, and guaranteed on-chain liquidity that's not dependent on order book depth
          </p>
        </div>
        {/* Stay Safe from Liquidations */}
        <div className="flex-grow-1 relative h-[220px] overflow-hidden rounded-20 bg-blue-600 p-20 lg:h-full">
          <ProtectionBackground />
          <img src={bgProtection} alt="Protection" className="absolute bottom-1/2 left-1/2 w-[60%] object-cover" />
          <div className="relative flex h-full w-full flex-col justify-end">
            <p className="text-heading-4 md:text-heading-3 mb-12">
              <Trans>
                Stay Safe from <br /> Liquidations
              </Trans>
            </p>
            <p className="text-description text-white">
              Avoid price wicks with transparent, sub-second Chainlink price feeds tailor-made for GMX{" "}
            </p>
          </div>
        </div>
      </div>
      {/* Support for numerous assets */}
      <div
        style={assetsBgStyle}
        className="bg-fiord-600 h-[220px] overflow-hidden rounded-20 lg:col-start-2  lg:col-end-3 lg:row-start-1 lg:row-end-3 lg:h-full lg:min-h-[180px]"
      >
        <div className="h-full w-full overflow-hidden">
          <div className="relative flex flex-col p-20 pb-0 lg:p-28">
            <p className="text-heading-4 md:text-heading-3 mb-11">
              <Trans>Support for</Trans> <br className="hidden lg:block" /> <Trans>Numerous Assets</Trans>
            </p>
            <p className="text-description">Use your preferred token to pay and collateralize your positions</p>
          </div>
          <div className="flex-grow-1 relative mt-20 w-full lg:mt-36">
            <div className="absolute left-1/2 -translate-x-1/2 lg:top-0">
              <ChainIcons />
            </div>
          </div>
        </div>
      </div>
      {/* Keep more of what you earn */}
      <div className="bg-fiord-600 h-full rounded-20 p-20 lg:col-start-3 lg:col-end-4 lg:row-start-1 lg:row-end-2 lg:min-h-[180px]">
        <div className="border-fiord-500 mb-18 flex flex-row items-center gap-20 border-b pb-20">
          <IconBox iconComponent={IcProtection} />
          <div className="flex flex-col gap-4">
            <p className="text-secondary text-12 uppercase tracking-[0.864px]">
              <Trans>keep more of what you earn</Trans>
            </p>
            <p className="text-heading-4">
              <Trans>Save on Costs </Trans>
            </p>
          </div>
        </div>
        <p className="text-description">Trade at scale without worrying about thin order books or slippage</p>
      </div>
      {/*Secure
& Permissionless */}
      <div className="bg-fiord-600 h-full rounded-20 p-20 lg:col-start-3 lg:col-end-4 lg:row-start-2 lg:row-end-3 lg:min-h-[180px]">
        <div className="flex h-full w-full flex-col justify-between">
          <p className="text-heading-4 mb-20 lg:mb-0">
            <Trans>Secure & Permissionless</Trans>
          </p>
          <div className="flex flex-row flex-wrap gap-12 text-[13px]">
            <div className="flex flex-1 flex-col items-stretch gap-8 lg:flex-row lg:flex-wrap lg:items-start">
              <div className="bg-fiord-500/50 text-secondary flex flex-row items-center justify-center gap-2 rounded-8 py-6 pl-3 pr-10">
                <IcChecked className="text-blue-400" />
                <p className="tracking-normal">
                  <Trans>No deposits required</Trans>
                </p>
              </div>
              <div className="bg-fiord-500/50 text-secondary flex flex-row items-center justify-center gap-2 rounded-8 py-6 pl-3 pr-10">
                <IcChecked className="text-blue-400" />
                <p className="tracking-normal">
                  <Trans>Trade from your wallet</Trans>
                </p>
              </div>
              <div className="bg-fiord-500/50 text-secondary flex flex-row items-center justify-center gap-2 rounded-8 py-6 pl-3 pr-10">
                <IcChecked className="text-blue-400" />
                <p className="tracking-normal">
                  <Trans>No loss of fund ownership</Trans>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-fiord-600 relative h-full overflow-hidden rounded-20 p-20 lg:col-start-2 lg:col-end-4 lg:row-start-3 lg:row-end-4 lg:min-h-[180px] lg:p-28">
        <SeamlessBackground />
        <div className="relative flex h-full flex-col items-stretch justify-between gap-20 lg:flex-row lg:items-end">
          <div className="w-[360px]">
            <p className="text-heading-4 md:text-heading-3 mb-12">
              <Trans>Seamless Trading</Trans>
            </p>
            <p className="text-description">
              Enjoy a frictionless trading experience and sidestep blockchain congestion with One-Click Trading and GMX
              Express
            </p>
          </div>
          <button className="btn-landing rounded-6 px-16 py-10 text-16 font-medium" onClick={goToTradeArbitrum}>
            <Trans>Trade Now</Trans>
          </button>
        </div>
      </div>
    </div>
  );
}
