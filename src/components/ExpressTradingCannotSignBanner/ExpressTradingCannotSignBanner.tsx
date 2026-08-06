import { Trans } from "@lingui/macro";

import { useChainId } from "lib/chains";

import { ColorfulBanner } from "components/ColorfulBanner/ColorfulBanner";

import ExpressIcon from "img/ic_express.svg?react";

export function ExpressTradingCannotSignBanner() {
  const { srcChainId } = useChainId();

  return (
    <ColorfulBanner color="red" icon={ExpressIcon}>
      <div>
        {srcChainId !== undefined ? (
          <Trans>Your wallet cannot sign messages. Connect a different wallet to trade.</Trans>
        ) : (
          <Trans>Your wallet cannot sign messages. Use Classic mode to trade.</Trans>
        )}
      </div>
    </ColorfulBanner>
  );
}
