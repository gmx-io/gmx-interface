import { Trans, t } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { INCENTIVES_V2_URL as INCENTIVES_V2_URL } from "config/ui";
import { useLiquidityProvidersIncentives } from "domain/synthetics/common/useIncentiveStats";
import { useTokensDataRequest } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { formatAmount } from "lib/numbers";
import { useCallback, useMemo } from "react";

export function AprInfo({
  apy,
  incentiveApr,
  isIncentiveActive,
  showTooltip = true,
}: {
  apy: bigint | undefined;
  incentiveApr: bigint | undefined;
  isIncentiveActive?: boolean;
  showTooltip?: boolean;
}) {
  const { chainId } = useChainId();
  const totalApr = (apy ?? 0n) + (incentiveApr ?? 0n);
  const aprNode = <>{apy !== undefined ? `${formatAmount(totalApr, 28, 2)}%` : "..."}</>;
  const airdropTokenAddress = useLiquidityProvidersIncentives(chainId)?.token;
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
          <ExternalLink href={INCENTIVES_V2_URL}>Read more</ExternalLink>.
        </Trans>
      </>
    );
  }, [airdropTokenSymbol, apy, incentiveApr, isIncentiveActive]);

  return showTooltip && incentiveApr !== undefined && incentiveApr > 0 ? (
    <Tooltip maxAllowedWidth={280} handle={aprNode} position="bottom-end" renderContent={renderTooltipContent} />
  ) : (
    aprNode
  );
}
