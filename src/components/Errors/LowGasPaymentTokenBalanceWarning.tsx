import { t } from "@lingui/macro";

import { getChainName } from "config/chains";
import { GasPaymentTokenMaxAvailabilityStatus } from "domain/synthetics/fees/getMaxAvailableTokenAmount";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";

type LowGasPaymentTokenBalanceWarningProps = {
  enabled: boolean;
  status: GasPaymentTokenMaxAvailabilityStatus;
  symbol: string | undefined;
  chainId: number;
};

export function getLowGasPaymentTokenBalanceWarning({
  status,
  symbol,
  chainId,
}: Pick<LowGasPaymentTokenBalanceWarningProps, "status" | "symbol" | "chainId">): string | undefined {
  if (status !== GasPaymentTokenMaxAvailabilityStatus.MinimalBuffer || symbol === undefined) {
    return undefined;
  }

  return t`Low ${symbol} balance. This amount leaves little for future fees on ${getChainName(chainId)}`;
}

export function LowGasPaymentTokenBalanceWarning({
  enabled,
  status,
  symbol,
  chainId,
}: LowGasPaymentTokenBalanceWarningProps) {
  if (!enabled) {
    return null;
  }

  const warningContent = getLowGasPaymentTokenBalanceWarning({ status, symbol, chainId });

  if (warningContent === undefined) {
    return null;
  }

  return (
    <AlertInfoCard hideClose type="warning">
      {warningContent}
    </AlertInfoCard>
  );
}
