import { Trans } from "@lingui/macro";

import { ExchangeInfo } from "components/Exchange/ExchangeInfo";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";

import {
  selectTradeboxAdvancedOptions,
  selectTradeboxSetAdvancedOptions,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useCallback } from "react";
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

  return (
    <>
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
      <div className="App-card-divider" />
      {showTPSL && (
        <>
          <ExchangeInfo.Group>
            <ExchangeInfo.Row
              label={
                <span className="flex flex-row justify-between align-middle">
                  <Trans>Limit / Take-Profit / Stop-Loss</Trans>
                  {/* <img src={Arrow} className="rotate-90 cursor-pointer" alt="arrow" /> */}
                </span>
              }
              className="SwapBox-info-row"
              value={<ToggleSwitch className="!mb-0" isChecked={options.limitOrTPSL} setIsChecked={setLimitOrTPSL} />}
            />
          </ExchangeInfo.Group>
          <LimitAndTPSLRows />
          <div className="App-card-divider" />
        </>
      )}
    </>
  );
}
