import { Trans, t } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { BigNumber } from "ethers";
import { formatAmount } from "lib/numbers";
import { useCallback } from "react";

export function AprInfo({
  apr,
  incentiveApr,
  showTooltip = true,
}: {
  apr: BigNumber | undefined;
  incentiveApr: BigNumber | undefined;
  showTooltip?: boolean;
}) {
  const totalApr = apr?.add(incentiveApr ?? 0) ?? BigNumber.from(0);
  const aprNode = <>{apr ? `${formatAmount(totalApr, 2, 2)}%` : "..."}</>;
  const renderTooltipContent = useCallback(() => {
    return (
      <>
        <StatsTooltipRow showDollar={false} label={t`Base APR`} value={`${formatAmount(apr, 2, 2)}%`} />
        <StatsTooltipRow showDollar={false} label={t`Bonus APR`} value={`${formatAmount(incentiveApr, 2, 2)}%`} />
        <br />
        <Trans>
          The Bonus APR is to be airdropped as ARB tokens.{" "}
          <ExternalLink href="https://www.notion.so/gmxio/Arbitrum-S-T-I-P-Grant-Incentives-Distribution-1a5ab9ca432b4f1798ff8810ce51fec3">
            Read more
          </ExternalLink>
          .
        </Trans>
      </>
    );
  }, [apr, incentiveApr]);
  return showTooltip && incentiveApr && incentiveApr.gt(0) ? (
    <Tooltip handle={aprNode} position="right-bottom" renderContent={renderTooltipContent} />
  ) : (
    aprNode
  );
}
