import { t } from "@lingui/macro";

import { getChainName } from "config/chains";

type LowGasPaymentTokenBalanceWarningProps = {
  symbol: string | undefined;
  chainId: number;
};

export function getLowGasPaymentTokenBalanceWarning({
  symbol,
  chainId,
}: LowGasPaymentTokenBalanceWarningProps): string | undefined {
  if (symbol === undefined) {
    return undefined;
  }

  return t`Low ${symbol} balance. This amount leaves little for future fees on ${getChainName(chainId)}`;
}
