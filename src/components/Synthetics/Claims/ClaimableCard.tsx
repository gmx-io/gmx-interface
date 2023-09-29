import { t } from "@lingui/macro";
import { MarketsInfoData, getTotalClaimableFundingUsd } from "domain/synthetics/markets";
import { ClaimableCardUI } from "./ClaimableCardUI";
import { CSSProperties } from "react";

type Props = {
  onClaimClick: () => void;
  marketsInfoData: MarketsInfoData | undefined;
  style?: CSSProperties;
};

const tooltipText = t`Positive Funding Fees for a Position become claimable after the Position is increased, decreased or closed; or settled its fees with the option under "Accrued".`;
const buttonText = t`Claim`;
const title = t`Claimable`;

export function ClaimableCard({ marketsInfoData, onClaimClick, style }: Props) {
  const markets = Object.values(marketsInfoData ?? {});
  const totalClaimableFundingUsd = getTotalClaimableFundingUsd(markets);

  return (
    <ClaimableCardUI
      fundingFees={totalClaimableFundingUsd}
      buttonText={buttonText}
      title={title}
      tooltipText={tooltipText}
      onButtonClick={onClaimClick}
      style={style}
    />
  );
}
