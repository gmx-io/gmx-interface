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
          handle={t`Allowed slippage`}
          position="left-start"
          variant="iconStroke"
          content={
            <div className="text-typography-primary">
              <Trans>
                The difference between expected and actual execution price due to volatility. Orders won't execute if
                slippage exceeds your maximum. Adjust the default in settings.
                <br />
                <br />A low value (e.g. less than -
                {formatPercentage(BigInt(DEFAULT_SLIPPAGE_AMOUNT), { signed: false })}) may cause failed orders during
                volatility.
                <br />
                <br />
                Slippage differs from price impact, which is based on open interest imbalances.{" "}
                <ExternalLink href="https://docs.gmx.io/docs/trading/fees/#slippage">Read more</ExternalLink>.
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
        highValueWarningText={t`Slippage is too high`}
        inputId={slippageInputId}
      />
    </SyntheticsInfoRow>
  );
}
