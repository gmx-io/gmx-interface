import { Trans } from "@lingui/macro";
import React from "react";

import bgPoolsGradient from "img/bg_pools_gradient.png";
import BgPoolsLines from "img/bg_pools_lines.svg?react";
import IcLinkArrow from "img/ic_link_arrow.svg?react";

import { IconBox } from "../components/IconBox";

type Props = {
  name: string;
  description: string;
  apr: number;
  onClick: () => void;
  coinImage: string;
  iconComponent: React.FunctionComponent<
    React.SVGProps<SVGSVGElement> & {
      title?: string;
    }
  >;
};

const style: React.CSSProperties = {
  backgroundImage: `url(${bgPoolsGradient})`,
};

export function PoolCard({ name, apr, description, iconComponent, coinImage, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      style={style}
      className="bg-fiord-600 duration-180 group relative h-[200px] w-full cursor-pointer overflow-hidden rounded-20 bg-cover text-white transition-transform hover:-translate-y-4 sm:h-[380px] sm:w-[384px]"
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
            <p className="leading-body-sm tracking-body text-secondary text-12 font-medium sm:text-14">
              <Trans>Annually</Trans>
            </p>
            <p className="text-[28px] font-medium leading-[98%] sm:text-[50px] sm:-tracking-[2px]">
              {apr}%{" "}
              <span className="leading-body-sm tracking-body text-secondary text-12 font-medium sm:text-14">
                <Trans>APR</Trans>
              </span>
            </p>
          </div>
          <div className="rounded-8 bg-[#1E2033] p-10 text-slate-100 group-hover:bg-blue-600 group-hover:text-white">
            <IcLinkArrow className="size-8 rotate-90" />
          </div>
        </div>
      </div>
    </div>
  );
}
