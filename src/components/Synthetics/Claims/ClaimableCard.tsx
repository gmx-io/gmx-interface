import { t } from "@lingui/macro";
import { MarketsInfoData, getTotalClaimableFundingUsd } from "domain/synthetics/markets";
import { ClaimableCardUI } from "./ClaimableCardUI";
import { CSSProperties, useMemo } from "react";
import { PositionPriceImpactRebateInfo } from "domain/synthetics/claimHistory";
import { calcTotalRebateUsd } from "./utils";
import { useChainId } from "lib/chains";
import { useTokensData } from "domain/synthetics/tokens";

type Props = {
  onClaimClick: () => void;
  onClaimablePositionPriceImpactFeesClick: () => void;
  marketsInfoData: MarketsInfoData | undefined;
  style?: CSSProperties;
  claimablePositionPriceImpactFees: PositionPriceImpactRebateInfo[];
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
  const totalClaimableFundingUsd = getTotalClaimableFundingUsd(markets);
  const { chainId } = useChainId();
  const { tokensData } = useTokensData(chainId);
  const priceImpactDifference = useMemo(
    () => calcTotalRebateUsd(claimablePositionPriceImpactFees, tokensData, false),
    [claimablePositionPriceImpactFees, tokensData]
  );

  return (
    <ClaimableCardUI
      fundingFees={totalClaimableFundingUsd}
      buttonText={buttonText}
      button2Text={buttonText}
      priceImpactDifference={priceImpactDifference}
      title={title}
      tooltipText={tooltipText}
      onButtonClick={onClaimClick}
      onButton2Click={onClaimablePositionPriceImpactFeesClick}
      style={style}
    />
  );
}
