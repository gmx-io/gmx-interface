import { Trans, t } from "@lingui/macro";
import { useEffect } from "react";

import { DEFAULT_SLIPPAGE_AMOUNT, EXCESSIVE_SLIPPAGE_AMOUNT } from "config/factors";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import {
  selectSetTradeboxAllowedSlippage,
  selectTradeboxAllowedSlippage,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { formatPercentage } from "lib/numbers";

import ExternalLink from "components/ExternalLink/ExternalLink";
import PercentageInput from "components/PercentageInput/PercentageInput";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import { useTradeboxChanges } from "../hooks/useTradeboxChanges";

export function AllowedSlippageRow({ slippageInputId }: { slippageInputId: string }) {
  const { savedAllowedSlippage } = useSettings();
  const allowedSlippage = useSelector(selectTradeboxAllowedSlippage);
  const setAllowedSlippage = useSelector(selectSetTradeboxAllowedSlippage);

  const tradeboxChanges = useTradeboxChanges();

  useEffect(() => {
    if (tradeboxChanges.direction || tradeboxChanges.toTokenAddress) {
      setAllowedSlippage(savedAllowedSlippage);
    }
  }, [tradeboxChanges.direction, tradeboxChanges.toTokenAddress, savedAllowedSlippage, setAllowedSlippage]);

  return (
    <SyntheticsInfoRow
      label={
        <TooltipWithPortal
          handle={t`Allowed Slippage`}
          position="left-start"
          variant="icon"
          content={
            <div className="text-typography-primary">
              <Trans>
                Slippage: The price difference between order submission and execution.
                <br />
                <br />
                Too low ({"<"}
                {formatPercentage(BigInt(DEFAULT_SLIPPAGE_AMOUNT), { signed: false })}): Orders may fail during
                volatility.
                <br />
                Too high: You may get worse prices.
                <br />
                <br />
                Note: Different from price impact.{" "}
                <ExternalLink href="https://docs.gmx.io/docs/trading/v2#slippage">Read more</ExternalLink>.
              </Trans>
            </div>
          }
        />
      }
      valueClassName="-my-5"
    >
      <PercentageInput
        onChange={setAllowedSlippage}
        negativeSign
        defaultValue={savedAllowedSlippage}
        value={allowedSlippage}
        highValue={EXCESSIVE_SLIPPAGE_AMOUNT}
        highValueWarningText={t`Slippage is too high.`}
        inputId={slippageInputId}
      />
    </SyntheticsInfoRow>
  );
}
