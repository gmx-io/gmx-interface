import { Trans, t } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { RebateInfoItem } from "domain/synthetics/fees/useRebatesInfo";
import { getTotalAccruedFundingUsd } from "domain/synthetics/markets";
import { PositionsInfoData } from "domain/synthetics/positions";
import { CSSProperties, useMemo } from "react";
import { ClaimableCardUI } from "./ClaimableCardUI";
import { calcTotalRebateUsd } from "./utils";

type Props = {
  onSettleClick: () => void;
  onAccruedPositionPriceImpactRebateClick: () => void;
  positionsInfoData: PositionsInfoData | undefined;
  style?: CSSProperties;
  accruedPositionPriceImpactFees: RebateInfoItem[];
};

const tooltipText = t`Accrued Positive Funding Fees for Positions not yet claimable. They will become available to claim by using the "Settle" button, or after the Position is increased, decreased or closed.`;
const buttonText = t`Settle`;
const button2Text = t`Show details`;
const title = t`Accrued`;

export function SettleAccruedCard({
  accruedPositionPriceImpactFees,
  onAccruedPositionPriceImpactRebateClick,
  onSettleClick,
  positionsInfoData,
  style,
}: Props) {
  const positions = useMemo(() => Object.values(positionsInfoData || {}), [positionsInfoData]);
  const fundingFees = useMemo(() => getTotalAccruedFundingUsd(positions), [positions]);
  const tokensData = useTokensData();
  const priceImpactDifference = useMemo(
    () => calcTotalRebateUsd(accruedPositionPriceImpactFees, tokensData, true),
    [accruedPositionPriceImpactFees, tokensData]
  );
  const sections = useMemo(
    () =>
      [
        { usd: fundingFees, buttonText, tooltipText, onButtonClick: onSettleClick },
        {
          usd: priceImpactDifference,
          buttonText: button2Text,
          tooltipText: (
            <Trans>
              Accrued Price Impact Rebates. They will become Claimable after some time.
              <br />
              <br />
              <ExternalLink newTab href="https://docs.gmx.io/docs/trading/v2/#price-impact-rebates">
                Read more
              </ExternalLink>
              .
            </Trans>
          ),
          onButtonClick: onAccruedPositionPriceImpactRebateClick,
          buttonStyle: "secondary",
        },
      ] as const,
    [fundingFees, onAccruedPositionPriceImpactRebateClick, onSettleClick, priceImpactDifference]
  );

  return <ClaimableCardUI title={title} style={style} sections={sections} />;
}
