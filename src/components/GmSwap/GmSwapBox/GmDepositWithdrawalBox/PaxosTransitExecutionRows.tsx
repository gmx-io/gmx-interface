import { Trans } from "@lingui/macro";

import { convertToUsd, getMidPrice } from "domain/synthetics/tokens";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import { AmountWithUsdBalance } from "components/AmountWithUsd/AmountWithUsd";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";

import type { PaxosTransitState } from "./usePaxosTransitState";

export function PaxosTransitExecutionRows({ transitState }: { transitState: PaxosTransitState }) {
  const { quote, tokenIn, isZeroFeeCapacityShort, step, order } = transitState;
  const isConverting = step === "converting" && order !== undefined;

  return (
    <>
      {isConverting ? (
        <SyntheticsInfoRow
          label={<Trans>Conversion status</Trans>}
          value={order.status === "PROCESSING" ? <Trans>Processing</Trans> : <Trans>Waiting for settlement</Trans>}
        />
      ) : (
        <>
          <SyntheticsInfoRow
            label={<Trans>Conversion fee</Trans>}
            value={
              tokenIn ? (
                <AmountWithUsdBalance
                  amount={quote?.totalFees}
                  decimals={tokenIn.decimals}
                  symbol={tokenIn.symbol}
                  usd={convertToUsd(quote?.totalFees, tokenIn.decimals, getMidPrice(tokenIn.prices))}
                  isStable={tokenIn.isStable}
                />
              ) : (
                "..."
              )
            }
          />
          {quote?.estimatedLatencyMs !== undefined && (
            <SyntheticsInfoRow
              label={<Trans>Estimated time</Trans>}
              valueClassName="numbers"
              value={<Trans>{Math.ceil(quote.estimatedLatencyMs / 60_000)}m</Trans>}
            />
          )}
        </>
      )}

      {isZeroFeeCapacityShort && !isConverting && (
        <AlertInfoCard type="warning" hideClose>
          <Trans>
            Zero-fee capacity is used up for this amount. Convert now at the standard fee, or wait for the next zero-fee
            window.
          </Trans>
        </AlertInfoCard>
      )}
    </>
  );
}
