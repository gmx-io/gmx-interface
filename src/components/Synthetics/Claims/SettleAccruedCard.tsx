import { Trans, t } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import {
  selectClaimsFundingFeesAccruedTotal,
  selectClaimsPriceImpactAccruedTotal,
} from "context/SyntheticsStateContext/selectors/claimsSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { CSSProperties, useMemo } from "react";
import { ClaimableCardUI } from "./ClaimableCardUI";

type Props = {
  onSettleClick: () => void;
  onAccruedPositionPriceImpactRebateClick: () => void;
  style?: CSSProperties;
};

const tooltipText = t`Accrued Positive Funding Fees for Positions not yet claimable. They will become available to claim by using the "Settle" button, or after the Position is increased, decreased or closed.`;
const buttonText = t`Settle`;
const button2Text = t`Show details`;
const title = t`Accrued`;

export function SettleAccruedCard({ onAccruedPositionPriceImpactRebateClick, onSettleClick, style }: Props) {
  const fundingFees = useSelector(selectClaimsFundingFeesAccruedTotal);
  const priceImpactDifference = useSelector(selectClaimsPriceImpactAccruedTotal);

  const sections = useMemo(
    () =>
      [
        { usd: fundingFees, buttonText, tooltipText, onButtonClick: onSettleClick },
        {
          usd: priceImpactDifference,
          buttonText: button2Text,
          tooltipText: (
            <Trans>
              Accrued Price Impact Rebates. They will become Claimable after some time.
              <br />
              <br />
              <ExternalLink newTab href="https://docs.gmx.io/docs/trading/v2/#price-impact-rebates">
                Read more
              </ExternalLink>
              .
            </Trans>
          ),
          onButtonClick: onAccruedPositionPriceImpactRebateClick,
          buttonStyle: "secondary",
        },
      ] as const,
    [fundingFees, onAccruedPositionPriceImpactRebateClick, onSettleClick, priceImpactDifference]
  );

  return <ClaimableCardUI title={title} style={style} sections={sections} />;
}
