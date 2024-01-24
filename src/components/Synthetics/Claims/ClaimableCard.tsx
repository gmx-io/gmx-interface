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

  return (
    <ClaimableCardUI
      fundingFees={totalClaimableFundingUsd}
      buttonText={buttonText}
      button2Text={buttonText}
      priceImpactRebate={priceImpactRebateUsd}
      title={title}
      tooltipText={tooltipText}
      tooltip2Text={
        <Trans>
          Claimable Price Impact Rebates.
          <br />
          <br />
          <ExternalLink newTab href="https://docs.gmx.io/docs/trading/v2/#price-impact-rebates">
            Read more
          </ExternalLink>
          .
        </Trans>
      }
      onButtonClick={onClaimClick}
      onButton2Click={onClaimablePositionPriceImpactFeesClick}
      style={style}
    />
  );
}
