import { REDIRECT_CHAIN_IDS } from "landing/hooks/useGoToTrade";

import IcArb from "img/ic_arb_24.svg?react";
import IcArrowRight from "img/ic_arrowright16.svg?react";
import IcAvax from "img/ic_avax_24.svg?react";
import IcBase from "img/ic_base.svg?react";
import IcBotanix from "img/ic_botanix_landing.svg?react";
import IcSol from "img/ic_sol_24.svg?react";

const icons = {
  [REDIRECT_CHAIN_IDS.Arbitum]: IcArb,
  [REDIRECT_CHAIN_IDS.Base]: IcBase,
  [REDIRECT_CHAIN_IDS.Solana]: IcSol,
  [REDIRECT_CHAIN_IDS.Avalanche]: IcAvax,
  [REDIRECT_CHAIN_IDS.Botanix]: IcBotanix,
};

const names = {
  [REDIRECT_CHAIN_IDS.Arbitum]: "Arbitrum",
  [REDIRECT_CHAIN_IDS.Base]: "Base",
  [REDIRECT_CHAIN_IDS.Solana]: "Solana",
  [REDIRECT_CHAIN_IDS.Avalanche]: "Avalanche",
  [REDIRECT_CHAIN_IDS.Botanix]: "Botanix",
};

type Props = {
  chainId: REDIRECT_CHAIN_IDS;
  onClick: () => void;
};

export function LaunchButton({ chainId, onClick }: Props) {
  const Icon = icons[chainId];
  const name = names[chainId];
  return (
    <button
      onClick={onClick}
      className="duration-180 group inline-flex w-full select-none items-center gap-12 rounded-16 bg-[#F4F5F9] px-20 py-12 transition-colors hover:bg-[#EFF0F4] sm:w-[288px]"
    >
      <div className="flex h-60 w-60 flex-shrink-0 items-center justify-center rounded-12 border-[0.5px] border-[#E8EAF2] bg-white">
        <Icon className="size-24" />
      </div>
      <span className="text-16 font-medium -tracking-[0.768px] sm:text-24">{name}</span>
      <IcArrowRight className="duration-180 ml-auto size-18 translate-x-0 transition-all ease-in-out group-hover:translate-x-4" />
    </button>
  );
}
