import { Trans, msg } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import {
  selectClaimsFundingFeesClaimableTotal,
  selectClaimsPriceImpactClaimableTotal,
} from "context/SyntheticsStateContext/selectors/claimsSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { CSSProperties, useMemo } from "react";
import { ClaimableCardUI } from "./ClaimableCardUI";
import { useLingui } from "@lingui/react";

type Props = {
  onClaimClick: () => void;
  onClaimablePositionPriceImpactFeesClick: () => void;
  style?: CSSProperties;
};

const tooltipText = msg`Positive Funding Fees for a Position become claimable after the Position is increased, decreased or closed; or settled its fees with the option under "Accrued".`;
const buttonText = msg`Claim`;
const title = msg`Claimable`;

export function ClaimableCard({ onClaimClick, style, onClaimablePositionPriceImpactFeesClick }: Props) {
  const totalClaimableFundingUsd = useSelector(selectClaimsFundingFeesClaimableTotal);
  const priceImpactRebateUsd = useSelector(selectClaimsPriceImpactClaimableTotal);
  const { _ } = useLingui();

  const sections = useMemo(
    () =>
      [
        {
          buttonText: _(buttonText),
          tooltipText: _(tooltipText),
          onButtonClick: onClaimClick,
          usd: totalClaimableFundingUsd,
        },
        {
          buttonText: _(buttonText),
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
    [_, onClaimClick, onClaimablePositionPriceImpactFeesClick, priceImpactRebateUsd, totalClaimableFundingUsd]
  );

  return <ClaimableCardUI sections={sections} title={_(title)} style={style} />;
}
