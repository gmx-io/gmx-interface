import { Trans, msg } from "@lingui/macro";
import { useLingui } from "@lingui/react";
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

const tooltipText = msg`Accrued Positive Funding Fees for Positions not yet claimable. They will become available to claim by using the "Settle" button, or after the Position is increased, decreased or closed.`;
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
        { usd: fundingFees, buttonText: _(buttonText), tooltipText: _(tooltipText), onButtonClick: onSettleClick },
        {
          usd: priceImpactDifference,
          buttonText: _(button2Text),
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
    [_, fundingFees, onAccruedPositionPriceImpactRebateClick, onSettleClick, priceImpactDifference]
  );

  return <ClaimableCardUI title={_(title)} style={style} sections={sections} />;
}
