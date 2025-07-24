import { Trans } from "@lingui/macro";

import { useHomePageContext } from "pages/Home/contexts/HomePageContext";

import { LaunchButtonContainer } from "./LaunchButtonContainer";
import { REDIRECT_CHAIN_IDS, useGoToTrade } from "../hooks/useGoToTrade";

export function LaunchSection() {
  const { showRedirectModal } = useHomePageContext();
  const goToTradeArbitrum = useGoToTrade({
    showRedirectModal,
    buttonPosition: "LaunchSection",
    chainId: REDIRECT_CHAIN_IDS.Arbitum,
  });
  return (
    <section className="flex w-full items-center justify-center px-16 py-80 text-fiord-700 sm:px-80 sm:py-[120px]">
      <div className="flex max-w-[1200px] flex-col items-stretch justify-center gap-24 sm:items-center lg:flex-row">
        <div className="flex flex-1 flex-col items-stretch sm:items-start">
          <h2 className="text-heading-2 mb-20 sm:mb-24">
            <Trans>Runs entirely on public chains</Trans>
          </h2>
          <p className="leading-body-md mb-36 text-18 font-normal -tracking-[0.036px] sm:mb-24">
            <Trans>
              Operates on open, permissionless networks to ensure transparency, decentralisation, and unrestricted
              access
            </Trans>
          </p>
          <button
            className="btn-landing-bg mb-36 rounded-8 px-16 py-12 text-16 text-white sm:mb-0"
            onClick={goToTradeArbitrum}
          >
            <Trans>Open App</Trans>
          </button>
        </div>
        <div className="grid grid-flow-row grid-cols-1 gap-16 sm:grid-cols-2">
          <LaunchButtonContainer chainId={REDIRECT_CHAIN_IDS.Arbitum} />
          <LaunchButtonContainer chainId={REDIRECT_CHAIN_IDS.Base} />
          <LaunchButtonContainer chainId={REDIRECT_CHAIN_IDS.Solana} />
          <LaunchButtonContainer chainId={REDIRECT_CHAIN_IDS.Avalanche} />
          <LaunchButtonContainer chainId={REDIRECT_CHAIN_IDS.Botanix} />
        </div>
      </div>
    </section>
  );
}
