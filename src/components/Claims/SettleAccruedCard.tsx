import { Trans, msg } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { CSSProperties, useMemo } from "react";

import {
  selectClaimsFundingFeesAccruedTotal,
  selectClaimsPriceImpactAccruedTotal,
} from "context/SyntheticsStateContext/selectors/claimsSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { DOCS_LINKS } from "config/links";

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
              Positive funding fees accrued in positions, not yet claimable.
              <br />
              <br />
              Available after changing position size, adjusting collateral, or clicking "Settle".
            </Trans>
          ),
          onButtonClick: onSettleClick,
        },
        {
          usd: priceImpactDifference,
          buttonText: _(button2Text),
          tooltipText: (
            <Trans>
              Price impact rebates accrued. Claimable after 5 days.{" "}
              <ExternalLink newTab href={DOCS_LINKS.priceImpact}>
                Read more
              </ExternalLink>.
            </Trans>
          ),
          onButtonClick: onAccruedPositionPriceImpactRebateClick,
        },
      ] as const,
    [_, fundingFees, onAccruedPositionPriceImpactRebateClick, onSettleClick, priceImpactDifference]
  );

  return <ClaimableCardUI title={_(title)} style={style} sections={sections} />;
}
