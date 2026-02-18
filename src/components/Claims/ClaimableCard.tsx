import { Trans, msg } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { CSSProperties, useMemo } from "react";

import { DOCS_LINKS } from "config/links";
import {
  selectClaimsFundingFeesClaimableTotal,
  selectClaimsPriceImpactClaimableTotal,
} from "context/SyntheticsStateContext/selectors/claimsSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";

import ExternalLink from "components/ExternalLink/ExternalLink";

import { ClaimableCardUI } from "./ClaimableCardUI";

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
              Positive funding fees ready to claim.
              <br />
              <br />
              Available after changing position size, adjusting collateral, or clicking "Settle".
            </Trans>
          ),
          onButtonClick: onClaimClick,
          usd: totalClaimableFundingUsd,
        },
        {
          buttonText: _(buttonText),
          tooltipText: (
              <Trans>
                Price impact rebates ready to claim.{" "}
              <ExternalLink newTab href={DOCS_LINKS.priceImpact}>
                Read more
              </ExternalLink>.
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
