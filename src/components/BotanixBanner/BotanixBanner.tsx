import { Trans } from "@lingui/macro";
import { Link } from "react-router-dom";

import { ARBITRUM, AVALANCHE } from "config/chains";
import { switchNetwork } from "lib/wallets";
import useWallet from "lib/wallets/useWallet";

import ArbitrumIcon from "img/tokens/ic_arbitrum.svg?react";
import AvalancheIcon from "img/tokens/ic_avalanche.svg?react";
import BotanixIcon from "img/tokens/ic_botanix.svg?react";

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
          <span className="text-yellow-500">Botanix</span> supports
        </Trans>{" "}
        <Link to="/trade" className="underline">
          <Trans>V2 trading</Trans>
        </Link>{" "}
        <Trans>and</Trans>{" "}
        <Link to="/pools" className="underline">
          <Trans>providing liquidity</Trans>
        </Link>{" "}
        <Trans>using GLV and GM tokens. Staking GMX and referrals are not yet supported.</Trans>
      </p>
      <p>
        <Trans>
          Switch to{" "}
          <span className="cursor-pointer" onClick={makeOnChainClickHandler(ARBITRUM)}>
            <ArbitrumIcon className="inline-block pb-4" />
            <span className="underline">Arbitrum</span>
          </span>{" "}
          or{" "}
          <span className="cursor-pointer" onClick={makeOnChainClickHandler(AVALANCHE)}>
            <AvalancheIcon className="inline-block pb-4" />
            <span className="underline">Avalanche</span>
          </span>{" "}
          for those features.
        </Trans>
      </p>
    </div>
  );
}
