import { RedirectChainIds } from "landing/pages/Home/hooks/useGoToTrade";
import type { ComponentPropsWithoutRef } from "react";

import type { ChainName } from "config/chains";

import IcBase from "img/ic_base.svg?react";
import IcBotanix from "img/ic_botanix_landing.svg?react";
import IcBsc from "img/ic_bsc.svg?react";
import MidChevronIcon from "img/ic_mid_chevron.svg?react";
import IcArb from "img/tokens/ic_arb.svg?react";
import IcAvax from "img/tokens/ic_avax.svg?react";
import IcEth from "img/tokens/ic_eth.svg?react";
import IcMegaeth from "img/tokens/ic_megaeth.svg?react";
import IcSol from "img/tokens/ic_sol.svg?react";

const icons: Record<RedirectChainIds, React.ComponentType<ComponentPropsWithoutRef<"svg">>> = {
  [RedirectChainIds.Arbitum]: IcArb,
  [RedirectChainIds.Base]: IcBase,
  [RedirectChainIds.Solana]: IcSol,
  [RedirectChainIds.Avalanche]: IcAvax,
  [RedirectChainIds.Botanix]: IcBotanix,
  [RedirectChainIds.MegaETH]: IcMegaeth,
  [RedirectChainIds.Bsc]: IcBsc,
  [RedirectChainIds.Ethereum]: IcEth,
};

const names: Record<RedirectChainIds, ChainName | "Solana"> = {
  [RedirectChainIds.Arbitum]: "Arbitrum",
  [RedirectChainIds.Base]: "Base",
  [RedirectChainIds.Solana]: "Solana",
  [RedirectChainIds.Avalanche]: "Avalanche",
  [RedirectChainIds.Botanix]: "Botanix",
  [RedirectChainIds.MegaETH]: "MegaETH",
  [RedirectChainIds.Bsc]: "BNB",
  [RedirectChainIds.Ethereum]: "Ethereum",
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
      <MidChevronIcon className="duration-180 ml-auto size-24 translate-x-0 text-slate-500 transition-all ease-in-out group-hover:translate-x-4" />
    </button>
  );
}
