import { Trans } from "@lingui/macro";

import { LaunchButtonContainer } from "./LaunchButtonContainer";
import { RedirectChainIds, useGoToTrade } from "../hooks/useGoToTrade";

export function LaunchSection() {
  const goToTradeArbitrum = useGoToTrade({
    buttonPosition: "LaunchSection",
    chainId: RedirectChainIds.Arbitum,
  });
  return (
    <section className="flex w-full items-center justify-center bg-white px-16 py-80 text-slate-900 sm:px-40 sm:py-[120px]">
      <div className="flex max-w-[1200px] flex-col items-stretch justify-center gap-24 sm:items-center lg:flex-row">
        <div className="flex flex-1 flex-col items-stretch sm:items-start">
          <h2 className="text-heading-2 mb-20 sm:mb-24">
            <Trans>Runs entirely on public chains</Trans>
          </h2>
          <p className="leading-body-md text-18 mb-36 font-normal -tracking-[0.036px] sm:mb-24">
            <Trans>
              Operates on open, permissionless networks to ensure transparency, decentralisation, and unrestricted
              access
            </Trans>
          </p>
          <button
            className="btn-landing mb-36 rounded-8 px-16 py-12 text-16 text-white sm:mb-0"
            onClick={goToTradeArbitrum}
          >
            <Trans>Open App</Trans>
          </button>
        </div>
        <div className="grid w-full grid-flow-row grid-cols-1 gap-16 md:grid-cols-3 lg:w-auto lg:grid-cols-2">
          <div className="lg:col-start-1 lg:row-start-1">
            <LaunchButtonContainer chainId={RedirectChainIds.Arbitum} />
          </div>
          <div className="lg:col-start-1 lg:row-start-2">
            <LaunchButtonContainer chainId={RedirectChainIds.Avalanche} />
          </div>
          <div className="lg:col-start-2 lg:row-start-1">
            <LaunchButtonContainer chainId={RedirectChainIds.Base} />
          </div>
          <div className="lg:col-start-2 lg:row-start-2">
            <LaunchButtonContainer chainId={RedirectChainIds.Bsc} />
          </div>
          <div className="lg:col-start-1 lg:row-start-3">
            <LaunchButtonContainer chainId={RedirectChainIds.Ethereum} />
          </div>
          <div className="lg:col-start-2 lg:row-start-3">
            <LaunchButtonContainer chainId={RedirectChainIds.Solana} />
          </div>
          <div className="lg:col-start-1 lg:row-start-4">
            <LaunchButtonContainer chainId={RedirectChainIds.Botanix} />
          </div>
          <div className="lg:col-start-2 lg:row-start-4">
            <LaunchButtonContainer chainId={RedirectChainIds.MegaETH} />
          </div>
        </div>
      </div>
    </section>
  );
}
