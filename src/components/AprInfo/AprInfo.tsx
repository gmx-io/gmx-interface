import { Trans, t } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";

import { formatAmount } from "lib/numbers";
import { useCallback } from "react";

export function AprInfo({
  apr,
  incentiveApr,
  isIncentiveActive,
  showTooltip = true,
}: {
  apr: bigint | undefined;
  incentiveApr: bigint | undefined;
  isIncentiveActive?: boolean;
  showTooltip?: boolean;
}) {
  const totalApr = (apr ?? 0n) + (incentiveApr ?? 0n);
  const aprNode = <>{apr !== undefined ? `${formatAmount(totalApr, 28, 2)}%` : "..."}</>;

  const renderTooltipContent = useCallback(() => {
    if (!isIncentiveActive) {
      return <StatsTooltipRow showDollar={false} label={t`Base APR`} value={`${formatAmount(apr, 28, 2)}%`} />;
    }

    return (
      <>
        <StatsTooltipRow showDollar={false} label={t`Base APR`} value={`${formatAmount(apr, 28, 2)}%`} />
        <StatsTooltipRow showDollar={false} label={t`Bonus APR`} value={`${formatAmount(incentiveApr, 28, 2)}%`} />
        <br />
        <Trans>
          The Bonus APR will be airdropped as ARB tokens.{" "}
          <ExternalLink href="https://gmxio.notion.site/GMX-S-T-I-P-Incentives-Distribution-1a5ab9ca432b4f1798ff8810ce51fec3#5c07d62e5676466db25f30807ef0a647">
            Read more
          </ExternalLink>
          .
        </Trans>
      </>
    );
  }, [apr, incentiveApr, isIncentiveActive]);

  return showTooltip && incentiveApr !== undefined && incentiveApr > 0 ? (
    <Tooltip maxAllowedWidth={280} handle={aprNode} position="bottom-end" renderContent={renderTooltipContent} />
  ) : (
    aprNode
  );
}
