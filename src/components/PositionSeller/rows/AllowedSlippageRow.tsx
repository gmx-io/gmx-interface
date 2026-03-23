import { Trans, t } from "@lingui/macro";

import { DEFAULT_SLIPPAGE_AMOUNT, EXCESSIVE_SLIPPAGE_AMOUNT } from "config/factors";
import { formatPercentage } from "lib/numbers";

import ExternalLink from "components/ExternalLink/ExternalLink";
import PercentageInput from "components/PercentageInput/PercentageInput";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

export function AllowedSlippageRow({
  allowedSlippage,
  setAllowedSlippage,
  slippageInputId,
}: {
  setAllowedSlippage: (value: number) => void;
  allowedSlippage: number;
  slippageInputId: string;
}) {
  return (
    <SyntheticsInfoRow
      label={
        <TooltipWithPortal
          handle={t`Allowed slippage`}
          position="top-start"
          variant="iconStroke"
          renderContent={() => {
            return (
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
            );
          }}
        />
      }
      valueClassName="-my-5"
    >
      <PercentageInput
        onChange={setAllowedSlippage}
        defaultValue={allowedSlippage}
        value={allowedSlippage}
        highValue={EXCESSIVE_SLIPPAGE_AMOUNT}
        highValueWarningText={t`Slippage is too high`}
        inputId={slippageInputId}
        negativeSign
      />
    </SyntheticsInfoRow>
  );
}
