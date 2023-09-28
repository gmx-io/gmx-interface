import { t } from "@lingui/macro";
import { MarketsInfoData, getTotalClaimableFundingUsd } from "domain/synthetics/markets";
import useWallet from "lib/wallets/useWallet";
import { ClaimableCardUI } from "./ClaimableCardUI";

type Props = {
  marketsInfoData: MarketsInfoData | undefined;
  onClaimClick: () => void;
};

const tooltipText = t`Positive Funding Fees for a Position become claimable after the Position is increased, decreased or closed; or settled its fees with the option under "Accrued".`;

export function ClaimableCard({ marketsInfoData, onClaimClick }: Props) {
  const { account } = useWallet();
  const markets = Object.values(marketsInfoData ?? {});
  const totalClaimableFundingUsd = getTotalClaimableFundingUsd(markets);

  return (
    <ClaimableCardUI
      fundingFees={totalClaimableFundingUsd}
      buttonText={t`Claim`}
      title={t`Claimable`}
      tooltipText={tooltipText}
      onButtonClick={onClaimClick}
      canShowButton={!!account}
    />
  );
}
