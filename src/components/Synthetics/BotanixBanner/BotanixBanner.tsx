import { Trans } from "@lingui/macro";
import { useHistory } from "react-router-dom";

import { ARBITRUM, AVALANCHE } from "config/chains";
import { switchNetwork } from "lib/wallets";
import useWallet from "lib/wallets/useWallet";

import ExternalLink from "components/ExternalLink/ExternalLink";

import ArbitrumIcon from "img/ic_arbitrum_24.svg?react";
import AvalancheIcon from "img/ic_avalanche_24.svg?react";
import BotanixIcon from "img/ic_botanix_24.svg?react";

export function BotanixBanner() {
  const { active } = useWallet();
  const history = useHistory();

  const makeOnChainClickHandler = (chainId: number) => {
    return () => {
      if (chainId === chainId) {
        return;
      } else {
        switchNetwork(chainId, active);
      }

      history.push("/");
    };
  };

  return (
    <div className="flex w-full flex-col gap-8 bg-slate-800 p-16">
      <p>
        <BotanixIcon className="-ml-4 inline-block pb-4" />
        <Trans>
          <span className="text-[#fccd0d]">Botanix</span> currently only supports
        </Trans>{" "}
        <ExternalLink href="https://docs.gmx.io/docs/trading/v2" className="!text-white">
          <Trans>V2 trading</Trans>
        </ExternalLink>{" "}
        <Trans>and</Trans>{" "}
        <ExternalLink href="https://docs.gmx.io/docs/providing-liquidity/v2" className="!text-white">
          <Trans>providing liquidity</Trans>
        </ExternalLink>{" "}
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
