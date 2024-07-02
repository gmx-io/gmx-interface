import { Trans, t } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { getIncentivesV2Url } from "config/links";
import { useLiquidityProvidersIncentives } from "domain/synthetics/common/useIncentiveStats";
import { useTokensDataRequest } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { formatAmount } from "lib/numbers";
import { useCallback, useMemo } from "react";
import sparkleIcon from "img/sparkle.svg";

export function AprInfo({
  apy,
  incentiveApr,
  showTooltip = true,
}: {
  apy: bigint | undefined;
  incentiveApr: bigint | undefined;
  showTooltip?: boolean;
}) {
  const { chainId } = useChainId();
  const totalApr = (apy ?? 0n) + (incentiveApr ?? 0n);
  const incentivesData = useLiquidityProvidersIncentives(chainId);
  const isIncentiveActive = !!incentivesData;
  const airdropTokenAddress = incentivesData?.token;
  // TODO use context instead
  const { tokensData } = useTokensDataRequest(chainId);
  const airdropTokenSymbol = useMemo(
    () => (airdropTokenAddress ? tokensData?.[airdropTokenAddress]?.symbol : undefined),
    [airdropTokenAddress, tokensData]
  );

  const renderTooltipContent = useCallback(() => {
    if (!isIncentiveActive) {
      return <StatsTooltipRow showDollar={false} label={t`Base APY`} value={`${formatAmount(apy, 28, 2)}%`} />;
    }

    return (
      <>
        <StatsTooltipRow showDollar={false} label={t`Base APY`} value={`${formatAmount(apy, 28, 2)}%`} />
        <StatsTooltipRow showDollar={false} label={t`Bonus APR`} value={`${formatAmount(incentiveApr, 28, 2)}%`} />
        <br />
        <Trans>
          The Bonus APR will be airdropped as {airdropTokenSymbol} tokens.{" "}
          <ExternalLink href={getIncentivesV2Url(chainId)}>Read more</ExternalLink>.
        </Trans>
      </>
    );
  }, [airdropTokenSymbol, apy, chainId, incentiveApr, isIncentiveActive]);

  const aprNode = useMemo(() => {
    const node = <>{apy !== undefined ? `${formatAmount(totalApr, 28, 2)}%` : "..."}</>;

    if (incentiveApr !== undefined && incentiveApr > 0) {
      return (
        <div className="flex flex-nowrap">
          {node}
          <img className="relative -top-3 h-10" src={sparkleIcon} alt="sparkle" />
        </div>
      );
    } else {
      return node;
    }
  }, [apy, incentiveApr, totalApr]);

  return showTooltip && incentiveApr !== undefined && incentiveApr > 0 ? (
    <Tooltip maxAllowedWidth={280} handle={aprNode} position="bottom-end" renderContent={renderTooltipContent} />
  ) : (
    aprNode
  );
}
