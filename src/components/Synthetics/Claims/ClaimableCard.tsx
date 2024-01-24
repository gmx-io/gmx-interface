import { Trans, t } from "@lingui/macro";
import { MarketsInfoData, getTotalClaimableFundingUsd } from "domain/synthetics/markets";
import { useTokensData } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { CSSProperties, useMemo } from "react";
import { ClaimableCardUI } from "./ClaimableCardUI";
import { calcTotalRebateUsd } from "./utils";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { RebateInfoItem } from "domain/synthetics/fees/useRebatesInfo";

type Props = {
  onClaimClick: () => void;
  onClaimablePositionPriceImpactFeesClick: () => void;
  marketsInfoData: MarketsInfoData | undefined;
  style?: CSSProperties;
  claimablePositionPriceImpactFees: RebateInfoItem[];
};

const tooltipText = t`Positive Funding Fees for a Position become claimable after the Position is increased, decreased or closed; or settled its fees with the option under "Accrued".`;
const buttonText = t`Claim`;
const title = t`Claimable`;

export function ClaimableCard({
  marketsInfoData,
  onClaimClick,
  style,
  claimablePositionPriceImpactFees,
  onClaimablePositionPriceImpactFeesClick,
}: Props) {
  const markets = Object.values(marketsInfoData ?? {});
  const totalClaimableFundingUsd = useMemo(() => getTotalClaimableFundingUsd(markets), [markets]);
  const { chainId } = useChainId();
  const { tokensData } = useTokensData(chainId);
  const priceImpactRebateUsd = useMemo(
    () => calcTotalRebateUsd(claimablePositionPriceImpactFees, tokensData, false),
    [claimablePositionPriceImpactFees, tokensData]
  );

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
