import { Trans, t } from "@lingui/macro";
import { addDays, formatDistanceToNowStrict, isPast } from "date-fns";
import { useCallback, useMemo } from "react";

import { getIncentivesV2Url } from "config/links";
import { useLiquidityProvidersIncentives } from "domain/synthetics/common/useIncentiveStats";
import { useLpAirdroppedTokenTitle } from "domain/synthetics/tokens/useAirdroppedTokenTitle";
import { useChainId } from "lib/chains";
import { formatAmount } from "lib/numbers";
import { ENOUGH_DAYS_SINCE_LISTING_FOR_APY, getMarketListingDate } from "config/markets";

import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import sparkleIcon from "img/sparkle.svg";

/**
 * We let the APY to stabilize for a few days before showing it to the user
 */
function getIsBaseApyReadyToBeShown(listingDate: Date): boolean {
  const enoughDateForApy = addDays(listingDate, ENOUGH_DAYS_SINCE_LISTING_FOR_APY);

  return isPast(enoughDateForApy);
}

function getApyReadyToBeShownDate(listingDate: Date): Date {
  return addDays(listingDate, ENOUGH_DAYS_SINCE_LISTING_FOR_APY);
}

export function AprInfo({
  apy,
  incentiveApr,
  showTooltip = true,
  tokenAddress,
}: {
  apy: bigint | undefined;
  incentiveApr: bigint | undefined;
  showTooltip?: boolean;
  tokenAddress: string;
}) {
  const { chainId } = useChainId();

  const listingDate = getMarketListingDate(chainId, tokenAddress);
  const { isBaseAprReadyToBeShown, apyReadyToBeShownDate } = useMemo(
    () => ({
      isBaseAprReadyToBeShown: getIsBaseApyReadyToBeShown(listingDate),
      apyReadyToBeShownDate: getApyReadyToBeShownDate(listingDate),
    }),
    [listingDate]
  );

  let totalApr = 0n;
  if (!isBaseAprReadyToBeShown) {
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
            value={isBaseAprReadyToBeShown ? `${formatAmount(apy, 28, 2)}%` : t`NA`}
          />
          {!isBaseAprReadyToBeShown && (
            <>
              <br />
              <Trans>
                The base APY estimate will be available{" "}
                {formatDistanceToNowStrict(apyReadyToBeShownDate as Date, { addSuffix: true })} to ensure accurate data
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
          value={isBaseAprReadyToBeShown ? `${formatAmount(apy, 28, 2)}%` : t`NA`}
        />
        <StatsTooltipRow showDollar={false} label={t`Bonus APR`} value={`${formatAmount(incentiveApr, 28, 2)}%`} />
        <br />
        {!isBaseAprReadyToBeShown && (
          <>
            <Trans>
              The base APY estimate will be available{" "}
              {formatDistanceToNowStrict(apyReadyToBeShownDate as Date, { addSuffix: true })} to ensure accurate data
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
  }, [
    airdropTokenTitle,
    apy,
    apyReadyToBeShownDate,
    chainId,
    incentiveApr,
    isBaseAprReadyToBeShown,
    isIncentiveActive,
  ]);

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
