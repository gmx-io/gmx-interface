import { Trans } from "@lingui/macro";
import React from "react";

import { percentFormat } from "landing/pages/Home/utils/formatters";

import bgPoolsGradient from "img/bg_pools_gradient.png";
import BgPoolsLines from "img/bg_pools_lines.svg?react";
import IcLinkArrow from "img/ic_link_arrow.svg?react";

import { IconBox } from "../IconBox/IconBox";

type Props = {
  name: string;
  description: string;
  apr: number | undefined;
  onClick: () => void;
  coinImage: string;
  iconComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
};

const style: React.CSSProperties = {
  backgroundImage: `url(${bgPoolsGradient})`,
  backgroundSize: "cover",
};

export function PoolCard({ name, apr, description, iconComponent, coinImage, onClick }: Props) {
  const aprText = apr ? percentFormat(apr) : "-";
  return (
    <div
      onClick={onClick}
      style={style}
      className="duration-180 group relative h-[200px] w-full cursor-pointer overflow-hidden rounded-20 bg-slate-800 bg-cover text-white transition-transform hover:-translate-y-4 lg:h-[380px] lg:w-[384px]"
    >
      <BgPoolsLines className="duration-180 absolute left-0 top-0 h-full w-full transition-transform group-hover:translate-y-4" />
      <img
        src={coinImage}
        alt={name}
        className="duration-180 absolute -bottom-85 -right-45 aspect-square size-[216px] transition-transform group-hover:z-10 group-hover:-translate-x-2 group-hover:-translate-y-2 group-hover:scale-[1.019] sm:-bottom-30 sm:-right-63"
      />
      <div style={style} className="relative z-20 flex h-full w-full flex-col justify-between p-20">
        <div className="flex flex-row items-center gap-20">
          <IconBox iconComponent={iconComponent} />
          <div>
            <h4 className="leading-heading-md text-[28px] font-medium -tracking-[0.896px]">{name}</h4>
            <h5 className="leading-body-sm text-14 font-normal tracking-[0.168px]">{description}</h5>
          </div>
        </div>
        <div className="flex flex-row items-end justify-between">
          <div className="flex flex-col gap-4">
            <p className="leading-body-sm tracking-body text-12 font-medium text-slate-400 sm:text-14">
              <Trans>Annually</Trans>
            </p>
            <p className="leading-heading-lg text-[28px] font-medium sm:text-[50px] sm:-tracking-[2px]">
              {aprText}{" "}
              <span className="leading-body-sm tracking-body text-12 font-medium text-slate-400 sm:text-14">
                <Trans>APR</Trans>
              </span>
            </p>
          </div>
          <div className="flex size-36 rounded-8 bg-slate-700 text-slate-500 group-hover:bg-blue-400 group-hover:text-white">
            <IcLinkArrow className="m-auto size-8 rotate-90" />
          </div>
        </div>
      </div>
    </div>
  );
}
