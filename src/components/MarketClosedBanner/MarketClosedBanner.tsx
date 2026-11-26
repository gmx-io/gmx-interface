import { Trans } from "@lingui/macro";

import type { ClosedMarketOrderState } from "context/SyntheticsStateContext/selectors/closedMarketsSelectors";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import { EmbeddedActionButton } from "components/Button/EmbeddedActionButton";

type Props = {
  state: ClosedMarketOrderState;
  onSwitchToLimit?: () => void;
};

export function MarketClosedBanner({ state, onSwitchToLimit }: Props) {
  if (state === "blocked") {
    return (
      <AlertInfoCard type="error" hideClose>
        <Trans>
          Market orders and TWAP are unavailable while the market is closed. Limit, Stop Market and TP/SL orders can
          still be created, but execute only after the market reopens.
        </Trans>
        {onSwitchToLimit && (
          <>
            {" "}
            <EmbeddedActionButton onClick={onSwitchToLimit}>
              <Trans>Switch to a limit order</Trans>
            </EmbeddedActionButton>
          </>
        )}
      </AlertInfoCard>
    );
  }

  return (
    <AlertInfoCard type="warning" hideClose>
      {state === "limitWaits" ? (
        <Trans>
          Market closed. This order executes only after the market reopens. The reopen price may differ from the last
          price.
        </Trans>
      ) : (
        <Trans>
          Market closed. This order executes only after the market reopens. A price gap at the reopen can fill a Stop
          Market or Stop-Loss at a worse price.
        </Trans>
      )}
    </AlertInfoCard>
  );
}
