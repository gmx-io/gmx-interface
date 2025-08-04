import { Trans } from "@lingui/macro";

import IcGmxHeader from "img/ic_gmx_header.svg?react";

import { REDIRECT_CHAIN_IDS, useGoToTrade } from "../hooks/useGoToTrade";

export function HeaderMenu() {
  const goToTradeArbitrum = useGoToTrade({
    buttonPosition: "MenuButton",
    chainId: REDIRECT_CHAIN_IDS.Arbitum,
  });

  return (
    <div className="bg-fiord-700 sticky left-0 top-0 z-10 flex w-full items-center justify-center px-16 py-16 text-white sm:px-80">
      <div className="flex w-[1200px] items-center justify-between">
        <IcGmxHeader className="h-24" />
        <div className="flex items-center gap-12">
          <div className="leading-body-sm mr-36 flex flex-row gap-28 text-14 font-medium -tracking-[0.448px]">
            <a href="https://github.com/gmx-io">
              <Trans>Protocol</Trans>
            </a>
            <a href="https://gov.gmx.io/">
              <Trans>Governance</Trans>
            </a>
            <a href="https://snapshot.org/#/gmx.eth">
              <Trans>Voting</Trans>
            </a>
            <a href="https://docs.gmx.io/">
              <Trans>Docs</Trans>
            </a>
          </div>
          <button className="btn-landing rounded-8 px-16 py-10 text-14" onClick={goToTradeArbitrum}>
            <Trans>Open App</Trans>
          </button>
        </div>
      </div>
    </div>
  );
}
