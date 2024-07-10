import { Trans } from "@lingui/macro";

import { ExchangeInfo } from "components/Exchange/ExchangeInfo";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";

import {
  selectTradeboxAdvancedOptions,
  selectTradeboxSetAdvancedOptions,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useSidecarOrders } from "domain/synthetics/sidecarOrders/useSidecarOrders";
import { usePrevious } from "lib/usePrevious";
import { useCallback, useEffect, useMemo } from "react";
import { AdvancedDisplayRows } from "./AdvancedDisplayRows";
import { LimitAndTPSLRows } from "./LimitAndTPSLRows";

export function TradeBoxAdvancedRows() {
  const options = useSelector(selectTradeboxAdvancedOptions);
  const setOptions = useSelector(selectTradeboxSetAdvancedOptions);
  const { isTrigger, isSwap } = useSelector(selectTradeboxTradeFlags);

  const setAdvancedDisplay = useCallback(
    (val: boolean) => {
      setOptions((ops) => ({
        ...ops,
        advancedDisplay: val,
      }));
    },
    [setOptions]
  );

  const setLimitOrTPSL = useCallback(
    (val: boolean) => {
      setOptions((ops) => ({
        ...ops,
        limitOrTPSL: val,
      }));
    },
    [setOptions]
  );

  const showTPSL = !isTrigger && !isSwap;

  const { limit, stopLoss, takeProfit } = useSidecarOrders();

  const hasErrorInTPSL = useMemo(
    () => stopLoss.error?.percentage || takeProfit.error?.percentage,
    [stopLoss.error, takeProfit.error]
  );

  const previousHasErrorInTPSL = usePrevious(hasErrorInTPSL);

  useEffect(() => {
    if (hasErrorInTPSL && !previousHasErrorInTPSL) {
      setLimitOrTPSL(true);
    }
  }, [hasErrorInTPSL, previousHasErrorInTPSL, setLimitOrTPSL]);

  const isTpSlVisible = hasErrorInTPSL ? true : options.limitOrTPSL;

  return (
    <>
      {showTPSL && (
        <>
          <ExchangeInfo.Group>
            <ExchangeInfo.Row
              label={
                <span className="flex flex-row justify-between align-middle">
                  {limit.entries?.length ? (
                    <Trans>Limit / Take-Profit / Stop-Loss</Trans>
                  ) : (
                    <Trans>Take-Profit / Stop-Loss</Trans>
                  )}
                </span>
              }
              className="SwapBox-info-row"
              value={
                <ToggleSwitch
                  className="!mb-0"
                  disabled={Boolean(hasErrorInTPSL)}
                  isChecked={isTpSlVisible}
                  setIsChecked={setLimitOrTPSL}
                />
              }
            />
          </ExchangeInfo.Group>
          <LimitAndTPSLRows isVisible={isTpSlVisible} />
          <div className="App-card-divider" />
        </>
      )}
      <div className="App-card-divider" />
      <ExchangeInfo.Group>
        {!isSwap && (
          <ExchangeInfo.Row
            label={
              <span className="flex flex-row justify-between align-middle">
                <Trans>Advanced display</Trans>
              </span>
            }
            className="SwapBox-info-row"
            value={
              <ToggleSwitch className="!mb-0" isChecked={options.advancedDisplay} setIsChecked={setAdvancedDisplay} />
            }
          />
        )}
      </ExchangeInfo.Group>
      <div className="App-card-divider" />
      <ExchangeInfo.Group>
        <AdvancedDisplayRows enforceVisible={isSwap} />
      </ExchangeInfo.Group>
    </>
  );
}
