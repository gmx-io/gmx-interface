import { Trans } from "@lingui/macro";

import IcArb from "img/ic_arb_24.svg?react";
import IcAvax from "img/ic_avax_24.svg?react";
import IcBase from "img/ic_base.svg?react";
import IcBotanix from "img/ic_botanix_landing.svg?react";
import IcSol from "img/ic_sol_24.svg?react";

import LaunchButton from "./components/LaunchButton";
import { useGoToTrade } from "../../hooks/useGoToTrade";

type Props = {
  showRedirectModal: (to: string) => void;
};

export function LaunchSection({ showRedirectModal }: Props) {
  const goToTradeArbitrum = useGoToTrade({
    showRedirectModal,
    buttonPosition: "LaunchSection",
    chain: "arb",
  });
  const goToTradeBase = useGoToTrade({
    showRedirectModal,
    buttonPosition: "LaunchSection",
    chain: "base",
  });
  const goToTradeSolana = useGoToTrade({
    showRedirectModal,
    buttonPosition: "LaunchSection",
    chain: "solana",
  });
  const goToTradeAvax = useGoToTrade({
    showRedirectModal,
    buttonPosition: "LaunchSection",
    chain: "avax",
  });
  const goToTradeBotanix = useGoToTrade({
    showRedirectModal,
    buttonPosition: "LaunchSection",
    chain: "botanix",
  });

  return (
    <section className="flex w-full items-center justify-center px-16 py-80 text-fiord-700 sm:px-80 sm:py-[120px]">
      <div className="flex max-w-[1200px] flex-col items-stretch justify-center gap-24 sm:flex-row sm:items-center">
        <div className="flex flex-1 flex-col items-stretch sm:items-start">
          <h2 className="text-heading-2 mb-20 sm:mb-24">
            <Trans>Runs entirely on public chains</Trans>
          </h2>
          <p className="mb-36 text-18 font-normal leading-text-md -tracking-[0.036px] sm:mb-24">
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
          <LaunchButton icon={IcArb} name="Arbitrum" onClick={goToTradeArbitrum} />
          <LaunchButton icon={IcBase} name="Base" onClick={goToTradeBase} />
          <LaunchButton icon={IcSol} name="Solana" onClick={goToTradeSolana} />
          <LaunchButton icon={IcAvax} name="Avax" onClick={goToTradeAvax} />
          <LaunchButton icon={IcBotanix} name="Botanix" onClick={goToTradeBotanix} />
        </div>
      </div>
    </section>
  );
}
