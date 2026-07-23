import { t } from "@lingui/macro";

import type { ExpressAccountUnavailableReason } from "lib/wallets/useAccountType";

export function getExpressAccountUnavailableMessage(reason: ExpressAccountUnavailableReason | undefined): string {
  switch (reason) {
    case "unsupportedChain":
      return t`This smart wallet cannot use Express or One-Click on this network. Switch to Arbitrum or use Classic Trading.`;
    case "capabilityCheckFailed":
      return t`Wallet signing support could not be verified. Use Classic Trading and try again later.`;
    case "unsupportedWallet":
    default:
      return t`This wallet cannot sign Express or One-Click orders. Use Classic Trading instead.`;
  }
}
