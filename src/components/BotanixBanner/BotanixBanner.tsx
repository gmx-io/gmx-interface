import { Trans } from "@lingui/macro";
import { Link } from "react-router-dom";

import { ARBITRUM, AVALANCHE } from "config/chains";
import { switchNetwork } from "lib/wallets";
import useWallet from "lib/wallets/useWallet";

import ArbitrumIcon from "img/ic_arbitrum_24.svg?react";
import AvalancheIcon from "img/ic_avalanche_24.svg?react";
import BotanixIcon from "img/ic_botanix_24.svg?react";

export function BotanixBanner() {
  const { active, chainId } = useWallet();

  const makeOnChainClickHandler = (nextChainId: number) => {
    return () => {
      if (nextChainId === chainId) {
        return;
      } else {
        switchNetwork(nextChainId, active);
      }
    };
  };

  return (
    <div className="flex w-full flex-col gap-8 bg-slate-800 p-16">
      <p>
        <BotanixIcon className="-ml-4 inline-block pb-4" />
        <Trans>
          <span className="text-yellow-500">Botanix</span> currently only supports
        </Trans>{" "}
        <Link to="/trade" className="underline">
          <Trans>V2 trading</Trans>
        </Link>{" "}
        <Trans>and</Trans>{" "}
        <Link to="/pools" className="underline">
          <Trans>providing liquidity</Trans>
        </Link>{" "}
        <Trans>
          using GLV and GM tokens. Buying or staking GMX, or using referrals, is not supported at this time.
        </Trans>
      </p>
      <p>
        <Trans>
          Please switch to the{" "}
          <span className="cursor-pointer" onClick={makeOnChainClickHandler(ARBITRUM)}>
            <ArbitrumIcon className="inline-block pb-4" />
            <span className="underline">Arbitrum</span>
          </span>{" "}
          or{" "}
          <span className="cursor-pointer" onClick={makeOnChainClickHandler(AVALANCHE)}>
            <AvalancheIcon className="inline-block pb-4" />
            <span className="underline">Avalanche</span>
          </span>{" "}
          deployment for those features.
        </Trans>
      </p>
    </div>
  );
}
