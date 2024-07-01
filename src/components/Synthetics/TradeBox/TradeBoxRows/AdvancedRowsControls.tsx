import { Trans } from "@lingui/macro";

import { ExchangeInfo } from "components/Exchange/ExchangeInfo";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";
import {
  useTradeboxAdvancedOptions,
  useTradeboxSetAdvancedOptions,
} from "context/SyntheticsStateContext/hooks/tradeboxHooks";

// import Arrow from "img/ic_arrowright16.svg";
import { useCallback } from "react";

export function TradeBoxAdvancedRowsControls() {
  const options = useTradeboxAdvancedOptions();
  const setOptions = useTradeboxSetAdvancedOptions();
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

  return (
    <>
      <ExchangeInfo.Row
        label={
          <span className="flex flex-row justify-between align-middle">
            <Trans>Advanced display</Trans>
            {/* <img src={Arrow} className="rotate-90 cursor-pointer" alt="arrow" /> */}
          </span>
        }
        className="SwapBox-info-row"
        value={<ToggleSwitch className="!mb-0" isChecked={options.advancedDisplay} setIsChecked={setAdvancedDisplay} />}
      />
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
    </>
  );
}
