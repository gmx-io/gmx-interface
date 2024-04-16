import { Trans, t } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import {
  selectClaimsFundingFeesClaimableTotal,
  selectClaimsPriceImpactClaimableTotal,
} from "context/SyntheticsStateContext/selectors/claimsSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { CSSProperties, useMemo } from "react";
import { ClaimableCardUI } from "./ClaimableCardUI";

type Props = {
  onClaimClick: () => void;
  onClaimablePositionPriceImpactFeesClick: () => void;
  style?: CSSProperties;
};

const tooltipText = t`Positive Funding Fees for a Position become claimable after the Position is increased, decreased or closed; or settled its fees with the option under "Accrued".`;
const buttonText = t`Claim`;
const title = t`Claimable`;

export function ClaimableCard({ onClaimClick, style, onClaimablePositionPriceImpactFeesClick }: Props) {
  const totalClaimableFundingUsd = useSelector(selectClaimsFundingFeesClaimableTotal);
  const priceImpactRebateUsd = useSelector(selectClaimsPriceImpactClaimableTotal);

  const sections = useMemo(
    () =>
      [
        { buttonText, tooltipText, onButtonClick: onClaimClick, usd: totalClaimableFundingUsd },
        {
          buttonText,
          tooltipText: (
            <Trans>
              Claimable Price Impact Rebates.
              <br />
              <br />
              <ExternalLink newTab href="https://docs.gmx.io/docs/trading/v2/#price-impact-rebates">
                Read more
              </ExternalLink>
              .
            </Trans>
          ),
          onButtonClick: onClaimablePositionPriceImpactFeesClick,
          usd: priceImpactRebateUsd,
        },
      ] as const,
    [onClaimClick, onClaimablePositionPriceImpactFeesClick, priceImpactRebateUsd, totalClaimableFundingUsd]
  );

  return <ClaimableCardUI sections={sections} title={title} style={style} />;
}
