import { t } from "@lingui/macro";

import type { GmsolTradeboxErrorCode } from "./buildTradeboxOrderAction";

export function getGmsolTradeboxErrorMessage(code: GmsolTradeboxErrorCode) {
  switch (code) {
    case "market":
      return t`Select a market`;
    case "math":
      return t`Solana market calculations are unavailable`;
    case "mode":
      return t`This order type is not supported on Solana`;
    case "amounts":
      return t`Enter an amount`;
    case "swap":
      return t`Pay with the selected collateral token`;
    case "receive":
      return t`Receive the position's collateral token on Solana`;
    case "acceptablePrice":
      return t`Turn on "Set acceptable price impact" in settings to edit this order on Solana`;
    case "tokenProgram":
      return t`This collateral token is not supported for trading yet`;
    case "tpsl":
      return t`Review your TP/SL orders`;
  }
}
