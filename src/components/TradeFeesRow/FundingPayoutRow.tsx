import { t, Trans } from "@lingui/macro";

import { getFundingPayoutOutputs } from "domain/synthetics/trade/utils/fundingPayout";
import { formatBalanceAmount } from "lib/numbers";
import type { MarketInfo } from "sdk/utils/markets";
import type { FundingPayout } from "sdk/utils/trade/types";

import { AmountWithUsdBalance } from "components/AmountWithUsd/AmountWithUsd";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import StandardTooltip from "components/Tooltip/StandardTooltip";

export function FundingPayoutRow({
  fundingPayout,
  marketInfo,
}: {
  fundingPayout: FundingPayout | undefined;
  marketInfo: MarketInfo | undefined;
}) {
  if (!fundingPayout || (fundingPayout.longTokenAmount <= 0n && fundingPayout.shortTokenAmount <= 0n)) {
    return null;
  }

  const outputs = marketInfo
    ? getFundingPayoutOutputs({ fundingPayout, longToken: marketInfo.longToken, shortToken: marketInfo.shortToken })
    : [];

  return (
    <SyntheticsInfoRow
      label={
        <StandardTooltip
          handle={t`Funding received`}
          content={<Trans>Received separately when this order executes, not added to position margin.</Trans>}
        />
      }
      value={
        outputs.length === 0 ? (
          "-"
        ) : (
          <span className="inline-flex flex-col items-end gap-2">
            {outputs.map(({ token, amount, usd }) =>
              usd === undefined ? (
                <span key={token.address}>
                  {formatBalanceAmount(amount, token.decimals, token.symbol, {
                    showZero: true,
                    isStable: token.isStable,
                  })}
                </span>
              ) : (
                <AmountWithUsdBalance
                  key={token.address}
                  amount={amount}
                  decimals={token.decimals}
                  symbol={token.symbol}
                  usd={usd}
                  isStable={token.isStable}
                  secondaryValueClassName="!text-14"
                />
              )
            )}
          </span>
        )
      }
    />
  );
}
