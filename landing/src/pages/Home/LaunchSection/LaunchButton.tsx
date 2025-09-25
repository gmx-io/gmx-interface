import { RedirectChainIds } from "landing/pages/Home/hooks/useGoToTrade";

import IcArb from "img/ic_arb_24.svg?react";
import IcArrowRight from "img/ic_arrow_right.svg?react";
import IcAvax from "img/ic_avax_24.svg?react";
import IcBase from "img/ic_base.svg?react";
import IcBotanix from "img/ic_botanix_landing.svg?react";
import IcSol from "img/ic_sol_24.svg?react";

const icons = {
  [RedirectChainIds.Arbitum]: IcArb,
  [RedirectChainIds.Base]: IcBase,
  [RedirectChainIds.Solana]: IcSol,
  [RedirectChainIds.Avalanche]: IcAvax,
  [RedirectChainIds.Botanix]: IcBotanix,
};

const names = {
  [RedirectChainIds.Arbitum]: "Arbitrum",
  [RedirectChainIds.Base]: "Base",
  [RedirectChainIds.Solana]: "Solana",
  [RedirectChainIds.Avalanche]: "Avalanche",
  [RedirectChainIds.Botanix]: "Botanix",
};

type Props = {
  chainId: RedirectChainIds;
  onClick: () => void;
};

export function LaunchButton({ chainId, onClick }: Props) {
  const Icon = icons[chainId];
  const name = names[chainId];
  return (
    <button
      onClick={onClick}
      className="duration-180 bg-light-150 group inline-flex w-full select-none items-center gap-12 rounded-16 p-12 pr-20 transition-colors hover:bg-[#EFF0F4] lg:w-[288px]"
    >
      <div className="flex h-60 w-60 flex-shrink-0 items-center justify-center rounded-12 border-1/2 border-[#E8EAF2] bg-white">
        <Icon className="size-24" />
      </div>
      <span className="text-16 font-medium -tracking-[0.768px] sm:text-24">{name}</span>
      <IcArrowRight className="duration-180 ml-auto size-18 translate-x-0 transition-all ease-in-out group-hover:translate-x-4" />
    </button>
  );
}
