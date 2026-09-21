import { Trans } from "@lingui/macro";

import { selectPoolsDetailsFlags } from "context/PoolsDetailsContext/selectors";
import { useSelector } from "context/SyntheticsStateContext/utils";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";

import type { PaxosTransitState } from "./usePaxosTransitState";

export function PaxosTransitExecutionRows({ transitState }: { transitState: PaxosTransitState }) {
  const { isDeposit } = useSelector(selectPoolsDetailsFlags);
  const { quote, isZeroFeeCapacityShort } = transitState;

  return (
    <>
      <SyntheticsInfoRow
        label={<Trans>Transactions</Trans>}
        value={isDeposit ? <Trans>2, convert then buy</Trans> : <Trans>2, sell then convert</Trans>}
      />

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
            Zero-fee capacity is used up for this amount. Convert now at the standard fee, or wait for the next zero-fee
            window.
          </Trans>
        </AlertInfoCard>
      )}
    </>
  );
}
