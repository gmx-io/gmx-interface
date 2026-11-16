import { t } from "@lingui/macro";

import { getChainName } from "config/chains";

type LowGasPaymentTokenBalanceWarningProps = {
  symbol: string | undefined;
  chainId: number;
  isGmxAccount: boolean;
};

export function getLowGasPaymentTokenBalanceWarning({
  symbol,
  chainId,
  isGmxAccount,
}: LowGasPaymentTokenBalanceWarningProps): string | undefined {
  if (symbol === undefined) {
    return undefined;
  }

  if (isGmxAccount) {
    return t`Low ${symbol} balance. This amount leaves little for future fees on your GMX Account.`;
  }

  return t`Low ${symbol} balance. This amount leaves little for future fees on ${getChainName(chainId)}.`;
}
