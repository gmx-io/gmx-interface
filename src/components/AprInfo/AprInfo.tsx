import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useMemo } from "react";

import { getIncentivesV2Url } from "config/links";
import { TBTC_INFORMATION_URL, isTbtcIncentivizedMarket } from "config/tbtc";
import { LIDO_APR_DECIMALS } from "domain/stake/useLidoStakeApr";
import { useLiquidityProvidersIncentives } from "domain/synthetics/common/useIncentiveStats";
import { useLpAirdroppedTokenTitle } from "domain/synthetics/tokens/useAirdroppedTokenTitle";
import type { UsdgLaunchBoost } from "domain/synthetics/usdgLaunchBoost/utils";
import { useChainId } from "lib/chains";
import { formatAmount } from "lib/numbers";

import StandardTooltip from "components/Tooltip/StandardTooltip";
import {
  TooltipContent,
  TooltipFootnote,
  TooltipLink,
  TooltipRow,
  TooltipRows,
} from "components/Tooltip/TooltipBlocks";

import sparkleIcon from "img/sparkle.svg";

import { UsdgLaunchBoostAprInfo } from "./UsdgLaunchBoostAprInfo";

type Props = {
  apy: bigint | undefined;
  incentiveApr: bigint | undefined;
  lidoApr: bigint | undefined;
  launchBoost?: UsdgLaunchBoost;
  isApyLoading?: boolean;
  showTooltip?: boolean;
  marketAddress: string;
  className?: string;
};

export function AprInfo({ launchBoost, isApyLoading, ...props }: Props) {
  if (launchBoost) {
    return (
      <UsdgLaunchBoostAprInfo
        apy={props.apy}
        isApyLoading={isApyLoading}
        launchBoost={launchBoost}
        showTooltip={props.showTooltip}
        className={props.className}
      />
    );
  }

  return <DefaultAprInfo {...props} />;
}

function DefaultAprInfo({
  apy,
  incentiveApr,
  lidoApr,
  showTooltip = true,
  marketAddress,
  className,
}: Omit<Props, "launchBoost" | "isApyLoading">) {
  const { chainId } = useChainId();

  let totalApr = (incentiveApr ?? 0n) + (lidoApr ?? 0n) + (apy ?? 0n);

  const incentivesData = useLiquidityProvidersIncentives(chainId);
  const isIncentiveActive = !!incentivesData && incentivesData?.rewardsPerMarket[marketAddress] !== undefined;
  const isLidoApr = lidoApr !== undefined && lidoApr > 0n;
  const isTbtcIncentive = isTbtcIncentivizedMarket(marketAddress);

  const airdropTokenTitle = useLpAirdroppedTokenTitle();

  const renderTooltipContent = useCallback(() => {
    return (
      <TooltipContent>
        <TooltipRows>
          <TooltipRow label={t`Base APY`} value={`${formatAmount(apy, 28, 2)}%`} />
          {isIncentiveActive && <TooltipRow label={t`Bonus APR`} value={`${formatAmount(incentiveApr, 28, 2)}%`} />}
          {isLidoApr && <TooltipRow label={t`wstETH APR`} value={`${formatAmount(lidoApr, LIDO_APR_DECIMALS, 2)}%`} />}
        </TooltipRows>
        {isIncentiveActive && (
          <>
            <TooltipFootnote>
              <Trans>Bonus APR paid as {airdropTokenTitle} airdrops.</Trans>
            </TooltipFootnote>
            <TooltipLink href={isTbtcIncentive ? TBTC_INFORMATION_URL : getIncentivesV2Url(chainId)}>
              <Trans>Read more</Trans>
            </TooltipLink>
          </>
        )}
      </TooltipContent>
    );
  }, [airdropTokenTitle, apy, chainId, incentiveApr, isIncentiveActive, lidoApr, isLidoApr, isTbtcIncentive]);

  const aprNode = useMemo(() => {
    const isIncentiveApr = incentiveApr !== undefined && incentiveApr > 0;
    const node = (
      <>
        {apy !== undefined ? <span className={cx("numbers", className)}>{formatAmount(totalApr, 28, 2)}%</span> : "..."}
      </>
    );

    if (isIncentiveApr) {
      return (
        <div className="inline-flex flex-nowrap">
          {node}
          <img className="relative -top-3 h-10" src={sparkleIcon} alt={t`Sparkle`} />
        </div>
      );
    } else {
      return node;
    }
  }, [apy, className, incentiveApr, totalApr]);

  return showTooltip && (isIncentiveActive || isLidoApr) ? (
    <StandardTooltip handle={aprNode} position="bottom-end" renderContent={renderTooltipContent} />
  ) : (
    aprNode
  );
}
