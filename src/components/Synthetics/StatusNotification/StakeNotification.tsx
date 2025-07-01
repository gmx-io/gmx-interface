import { Trans } from "@lingui/macro";

import { BOTANIX, getExplorerUrl } from "config/chains";
import { StakeOrUnstakeParams } from "domain/synthetics/orders/createStakeOrUnStakeTxn";
import { formatTokenAmount } from "lib/numbers";

import ExternalLink from "components/ExternalLink/ExternalLink";

export function StakeNotification({
  txnHash,
  amount,
  isStake,
  isWrapBeforeStake,
}: StakeOrUnstakeParams & { txnHash: string }) {
  const fromTokenSymbol = isStake ? (isWrapBeforeStake ? "BTC" : "PBTC") : "STBTC";
  const toTokenSymbol = isStake ? "STBTC" : "PBTC";
  const fromAmount = formatTokenAmount(amount, 18, fromTokenSymbol, { isStable: false });
  const toAmount = formatTokenAmount(amount, 18, toTokenSymbol, { isStable: false });

  return (
    <span className="flex justify-between font-bold">
      <Trans>
        {isStake ? "Stake" : "Unstake"} {fromAmount} for {toAmount}
      </Trans>

      <ExternalLink href={`${getExplorerUrl(BOTANIX)}tx/${txnHash}`}>
        <Trans>View</Trans>
      </ExternalLink>
    </span>
  );
}
