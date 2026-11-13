import { Trans, t } from "@lingui/macro";

import { DEFAULT_SLIPPAGE_AMOUNT, EXCESSIVE_SLIPPAGE_AMOUNT } from "config/factors";
import { formatPercentage } from "lib/numbers";

import PercentageInput from "components/PercentageInput/PercentageInput";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import StandardTooltip from "components/Tooltip/StandardTooltip";
import { TooltipContent, TooltipLink, TooltipText } from "components/Tooltip/TooltipBlocks";

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
        <StandardTooltip
          handle={t`Allowed slippage`}
          renderContent={() => {
            return (
              <TooltipContent>
                <TooltipText>
                  <Trans>
                    The difference between expected and actual execution price due to volatility. Orders won't execute
                    if slippage exceeds your maximum. Adjust the default in settings.
                    <br />
                    <br />A low value (e.g. less than -
                    {formatPercentage(BigInt(DEFAULT_SLIPPAGE_AMOUNT), { signed: false })}) may cause failed orders
                    during volatility.
                    <br />
                    <br />
                    Slippage differs from price impact, which is based on open interest imbalances.
                  </Trans>
                </TooltipText>
                <TooltipLink href="https://docs.gmx.io/docs/trading/fees/#slippage">
                  <Trans>Read more</Trans>
                </TooltipLink>
              </TooltipContent>
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
