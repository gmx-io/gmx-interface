import { Trans } from "@lingui/macro";

import { TooltipContent, TooltipText, TooltipTitledText } from "components/Tooltip/TooltipBlocks";

export function MarginDestinationTooltipContent() {
  return (
    <TooltipContent>
      <TooltipText>
        <Trans>
          Because positions on Arbitrum can be funded from both your wallet and your GMX Account, we can't always
          determine where to return the margin automatically.
        </Trans>
      </TooltipText>
      <TooltipText>
        <Trans>Choose:</Trans>
      </TooltipText>
      <TooltipTitledText title={<Trans>Wallet</Trans>}>
        <Trans>If you mostly trade from your personal wallet on Arbitrum</Trans>
      </TooltipTitledText>
      <TooltipTitledText title={<Trans>GMX Account</Trans>}>
        <Trans>If you plan to keep trading or reusing margin on GMX</Trans>
      </TooltipTitledText>
      <TooltipText>
        <Trans>You can change this preference anytime in settings or when closing a position.</Trans>
      </TooltipText>
    </TooltipContent>
  );
}
