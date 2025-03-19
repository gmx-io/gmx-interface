import { Trans, msg } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { CSSProperties, useMemo } from "react";

import {
  selectClaimsFundingFeesAccruedTotal,
  selectClaimsPriceImpactAccruedTotal,
} from "context/SyntheticsStateContext/selectors/claimsSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";

import ExternalLink from "components/ExternalLink/ExternalLink";


import { ClaimableCardUI } from "./ClaimableCardUI";

type Props = {
  onSettleClick: () => void;
  onAccruedPositionPriceImpactRebateClick: () => void;
  style?: CSSProperties;
};

const buttonText = msg`Settle`;
const button2Text = msg`Show details`;
const title = msg`Accrued`;

export function SettleAccruedCard({ onAccruedPositionPriceImpactRebateClick, onSettleClick, style }: Props) {
  const fundingFees = useSelector(selectClaimsFundingFeesAccruedTotal);
  const priceImpactDifference = useSelector(selectClaimsPriceImpactAccruedTotal);
  const { _ } = useLingui();

  const sections = useMemo(
    () =>
      [
        {
          usd: fundingFees,
          buttonText: _(buttonText),
          tooltipText: (
            <Trans>
              Accrued positive funding fees in positions not yet claimable.
              <br />
              <br />
              They become available after modifying the position by increasing or decreasing it, depositing or
              withdrawing collateral, or settling the fees using the "Settle" button.
            </Trans>
          ),
          onButtonClick: onSettleClick,
        },
        {
          usd: priceImpactDifference,
          buttonText: _(button2Text),
          tooltipText: (
            <Trans>
              Accrued price impact rebates. They will become claimable after approximately ten days.
              <br />
              <br />
              <ExternalLink newTab href="https://docs.gmx.io/docs/trading/v2/#price-impact-rebates">
                Read more
              </ExternalLink>
              .
            </Trans>
          ),
          onButtonClick: onAccruedPositionPriceImpactRebateClick,
        },
      ] as const,
    [_, fundingFees, onAccruedPositionPriceImpactRebateClick, onSettleClick, priceImpactDifference]
  );

  return <ClaimableCardUI title={_(title)} style={style} sections={sections} />;
}
