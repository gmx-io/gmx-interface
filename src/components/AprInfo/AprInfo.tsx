import { Trans, t } from "@lingui/macro";
import { formatDistanceToNowStrict } from "date-fns";
import { useCallback, useMemo } from "react";

import { getIncentivesV2Url } from "config/links";
import { useLiquidityProvidersIncentives } from "domain/synthetics/common/useIncentiveStats";
import { useLpAirdroppedTokenTitle } from "domain/synthetics/tokens/useAirdroppedTokenTitle";
import { useChainId } from "lib/chains";
import { formatAmount } from "lib/numbers";

import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import sparkleIcon from "img/sparkle.svg";

export function AprInfo({
  apy,
  incentiveApr,
  showTooltip = true,
  futureDateForApyReadiness,
}: {
  apy: bigint | undefined;
  incentiveApr: bigint | undefined;
  showTooltip?: boolean;
  /**
   * @default undefined meaning that APY is ready to be shown
   */
  futureDateForApyReadiness?: Date;
}) {
  const { chainId } = useChainId();
  let totalApr = 0n;
  if (futureDateForApyReadiness) {
    totalApr = incentiveApr ?? 0n;
  } else {
    totalApr = (apy ?? 0n) + (incentiveApr ?? 0n);
  }
  const incentivesData = useLiquidityProvidersIncentives(chainId);
  const isIncentiveActive = !!incentivesData;
  const airdropTokenTitle = useLpAirdroppedTokenTitle();

  const renderTooltipContent = useCallback(() => {
    if (!isIncentiveActive) {
      return (
        <>
          <StatsTooltipRow
            showDollar={false}
            label={t`Base APY`}
            value={futureDateForApyReadiness ? t`NA` : `${formatAmount(apy, 28, 2)}%`}
          />
          {futureDateForApyReadiness && (
            <>
              <br />
              <Trans>
                The base APY estimate will be available{" "}
                {formatDistanceToNowStrict(futureDateForApyReadiness, { addSuffix: true })} to ensure accurate data
                display.
              </Trans>
            </>
          )}
        </>
      );
    }

    return (
      <>
        <StatsTooltipRow
          showDollar={false}
          label={t`Base APY`}
          value={futureDateForApyReadiness ? t`NA` : `${formatAmount(apy, 28, 2)}%`}
        />
        <StatsTooltipRow showDollar={false} label={t`Bonus APR`} value={`${formatAmount(incentiveApr, 28, 2)}%`} />
        <br />
        {futureDateForApyReadiness && (
          <>
            <Trans>
              The base APY estimate will be available{" "}
              {formatDistanceToNowStrict(futureDateForApyReadiness, { addSuffix: true })} to ensure accurate data
              display.
            </Trans>
            <br />
            <br />
          </>
        )}
        <Trans>
          The Bonus APR will be airdropped as {airdropTokenTitle} tokens.{" "}
          <ExternalLink href={getIncentivesV2Url(chainId)}>Read more</ExternalLink>.
        </Trans>
      </>
    );
  }, [airdropTokenTitle, apy, chainId, futureDateForApyReadiness, incentiveApr, isIncentiveActive]);

  const aprNode = useMemo(() => {
    const node = <>{apy !== undefined ? `${formatAmount(totalApr, 28, 2)}%` : "..."}</>;

    if (incentiveApr !== undefined && incentiveApr > 0) {
      return (
        <div className="inline-flex flex-nowrap">
          {node}
          <img className="relative -top-3 h-10" src={sparkleIcon} alt="sparkle" />
        </div>
      );
    } else {
      return node;
    }
  }, [apy, incentiveApr, totalApr]);

  return showTooltip && incentiveApr !== undefined && incentiveApr > 0 ? (
    <TooltipWithPortal
      maxAllowedWidth={280}
      handle={aprNode}
      position="bottom-end"
      renderContent={renderTooltipContent}
    />
  ) : (
    aprNode
  );
}
