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
          tooltipText: (
            <Trans>
              Claimable positive funding fees.
              <br />
              <br />
              They become available after modifying the position by increasing or decreasing it, depositing or
              withdrawing collateral, or settling the fees using the "Settle" button.
            </Trans>
          ),
          onButtonClick: onClaimClick,
          usd: totalClaimableFundingUsd,
        },
        {
          buttonText: _(buttonText),
          tooltipText: (
            <Trans>
              Claimable price impact rebates.
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
