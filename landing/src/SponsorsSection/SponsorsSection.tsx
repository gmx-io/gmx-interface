import { Trans } from "@lingui/macro";

import IcChainlink from "img/ic_chainlink.svg?react";
import IcChaos from "img/ic_chaos.svg?react";
import IcGuardian from "img/ic_guardian.svg?react";
import IcLayerZero from "img/ic_layer_zero.svg?react";

export function SponsorsSection() {
  return (
    <div className="text-fiord-700 flex gap-24 border-t-[0.5px] border-[#D8DBE9] bg-[#F4F5F9] px-16 py-80 sm:px-80 sm:py-60">
      <div className="mx-auto flex flex-col justify-between gap-28 sm:w-[1200px] sm:flex-row sm:items-center">
        <div className="flex flex-col gap-16 sm:w-[380px]">
          <h3 className="leading-heading-md text-[40px] font-medium -tracking-[1.28]">
            <Trans>Supported by</Trans>
          </h3>
          <h4 className="leading-body-sm text-18 font-medium -tracking-[0.576px]">
            <Trans>over 100 protocols</Trans>
          </h4>
        </div>
        <div className="grid flex-1 grid-cols-2 grid-rows-2 flex-row flex-wrap items-center gap-16 sm:flex">
          <div className="flex h-80 flex-1 flex-row items-center justify-center rounded-12 bg-white p-8">
            <IcChainlink className="h-28" />
          </div>
          <div className="flex h-80 flex-1 flex-row items-center justify-center rounded-12 bg-white p-8">
            <IcLayerZero className="h-34" />
          </div>
          <div className="flex h-80 flex-1 flex-row items-center justify-center rounded-12 bg-white p-8">
            <IcChaos className="h-24" />
          </div>
          <div className="flex h-80 flex-1 flex-row items-center justify-center rounded-12 bg-white p-8">
            <IcGuardian className="h-22" />
          </div>
        </div>
      </div>
    </div>
  );
}
