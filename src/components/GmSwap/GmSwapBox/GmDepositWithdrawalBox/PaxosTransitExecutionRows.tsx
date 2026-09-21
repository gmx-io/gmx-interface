import { t, Trans } from "@lingui/macro";

import { selectPoolsDetailsFlags } from "context/PoolsDetailsContext/selectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { formatBalanceAmount } from "lib/numbers";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import type { PaxosTransitState } from "./usePaxosTransitState";

export function PaxosTransitExecutionRows({ transitState }: { transitState: PaxosTransitState }) {
  const { isDeposit } = useSelector(selectPoolsDetailsFlags);
  const { quote, isZeroFeeCapacityShort, isWhitelisted, zeroFeeCapacity, tokenIn } = transitState;
  const shouldShowZeroFeeCapacity =
    isWhitelisted && isDeposit && zeroFeeCapacity !== undefined && tokenIn !== undefined;

  return (
    <>
      <SyntheticsInfoRow
        label={
          <TooltipWithPortal
            handle={t`Transactions`}
            position="left-start"
            variant="iconStroke"
            content={
              <div className="text-typography-primary">
                {isDeposit ? (
                  <Trans>
                    First you convert USDC to USDG in your wallet, then you confirm the buy. If the buy fails, the USDG
                    stays in your wallet.
                  </Trans>
                ) : (
                  <Trans>
                    First the pool pays out USDG to your wallet, then you confirm the conversion to USDC. If it fails,
                    the USDG stays in your wallet.
                  </Trans>
                )}
              </div>
            }
          />
        }
        value={isDeposit ? <Trans>2, convert then buy</Trans> : <Trans>2, sell then convert</Trans>}
      />

      {shouldShowZeroFeeCapacity && (
        <SyntheticsInfoRow
          label={<Trans>Zero-fee capacity left</Trans>}
          value={formatBalanceAmount(zeroFeeCapacity, tokenIn.decimals, tokenIn.symbol, { isStable: true })}
          valueClassName="numbers"
        />
      )}

      {quote?.estimatedLatencyMs !== undefined && (
        <SyntheticsInfoRow
          label={<Trans>Estimated time</Trans>}
          valueClassName="numbers"
          value={<Trans>{Math.ceil(quote.estimatedLatencyMs / 60_000)}m</Trans>}
        />
      )}

      {isZeroFeeCapacityShort && (
        <AlertInfoCard type="warning" hideClose>
          <Trans>
            Zero-fee capacity is used up for this amount. Convert now at the standard fee, convert a smaller amount, or
            wait for the next zero-fee window.
          </Trans>
        </AlertInfoCard>
      )}
    </>
  );
}
