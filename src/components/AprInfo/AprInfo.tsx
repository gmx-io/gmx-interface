import { Trans, t } from "@lingui/macro";
import { useCallback, useMemo } from "react";

import { getIncentivesV2Url } from "config/links";
import { TBTC_INFORMATION_URL, isTbtcIncentivizedMarket } from "config/tbtc";
import { LIDO_APR_DECIMALS } from "domain/stake/useLidoStakeApr";
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
  lidoApr,
  showTooltip = true,
  marketAddress,
}: {
  apy: bigint | undefined;
  incentiveApr: bigint | undefined;
  lidoApr: bigint | undefined;
  showTooltip?: boolean;
  marketAddress: string;
}) {
  const { chainId } = useChainId();

  let totalApr = (incentiveApr ?? 0n) + (lidoApr ?? 0n) + (apy ?? 0n);

  const incentivesData = useLiquidityProvidersIncentives(chainId);
  const isIncentiveActive = !!incentivesData && incentivesData?.rewardsPerMarket[marketAddress] !== undefined;
  const isLidoApr = lidoApr !== undefined && lidoApr > 0n;
  const isTbtcIncentive = isTbtcIncentivizedMarket(marketAddress);

  const airdropTokenTitle = useLpAirdroppedTokenTitle();

  const renderTooltipContent = useCallback(() => {
    return (
      <div className="flex flex-col gap-y-14">
        <div>
          <StatsTooltipRow showDollar={false} label={t`Base APY`} value={`${formatAmount(apy, 28, 2)}%`} />
          {isIncentiveActive && (
            <StatsTooltipRow showDollar={false} label={t`Bonus APR`} value={`${formatAmount(incentiveApr, 28, 2)}%`} />
          )}
          {isLidoApr && (
            <StatsTooltipRow
              showDollar={false}
              label={t`wstETH APR`}
              value={`${formatAmount(lidoApr, LIDO_APR_DECIMALS, 2)}%`}
            />
          )}
        </div>
        {isIncentiveActive && (
          <div>
            <Trans>
              The Bonus APR will be airdropped as {airdropTokenTitle} tokens.{" "}
              <ExternalLink href={isTbtcIncentive ? TBTC_INFORMATION_URL : getIncentivesV2Url(chainId)}>
                Read more
              </ExternalLink>
              .
            </Trans>
          </div>
        )}
      </div>
    );
  }, [airdropTokenTitle, apy, chainId, incentiveApr, isIncentiveActive, lidoApr, isLidoApr, isTbtcIncentive]);

  const aprNode = useMemo(() => {
    const isIncentiveApr = incentiveApr !== undefined && incentiveApr > 0;
    const node = <>{apy !== undefined ? `${formatAmount(totalApr, 28, 2)}%` : "..."}</>;

    if (isIncentiveApr) {
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

  return showTooltip && (isIncentiveActive || isLidoApr) ? (
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
