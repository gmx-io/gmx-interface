import { Trans, t } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { useLiquidityProvidersIncentives } from "domain/synthetics/common/useIncentiveStats";
import { useTokensDataRequest } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import { formatAmount } from "lib/numbers";
import { useCallback, useMemo } from "react";

export function AprInfo({
  apr,
  incentiveApr,
  isIncentiveActive,
  showTooltip = true,
}: {
  apr: BigNumber | undefined;
  incentiveApr: BigNumber | undefined;
  isIncentiveActive?: boolean;
  showTooltip?: boolean;
}) {
  const { chainId } = useChainId();
  const totalApr = apr?.add(incentiveApr ?? 0) ?? BigNumber.from(0);
  const aprNode = <>{apr ? `${formatAmount(totalApr, 28, 2)}%` : "..."}</>;
  const airdropTokenAddress = useLiquidityProvidersIncentives(chainId)?.token;
  // TODO use context instead
  const { tokensData } = useTokensDataRequest(chainId);
  const airdropTokenSymbol = useMemo(
    () => (airdropTokenAddress ? tokensData?.[airdropTokenAddress]?.symbol : undefined),
    [airdropTokenAddress, tokensData]
  );

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
          The Bonus APR will be airdropped as {airdropTokenSymbol} tokens.{" "}
          <ExternalLink href="https://gmxio.notion.site/GMX-S-T-I-P-Incentives-Distribution-1a5ab9ca432b4f1798ff8810ce51fec3#5c07d62e5676466db25f30807ef0a647">
            Read more
          </ExternalLink>
          .
        </Trans>
      </>
    );
  }, [airdropTokenSymbol, apr, incentiveApr, isIncentiveActive]);

  return showTooltip && incentiveApr && incentiveApr.gt(0) ? (
    <Tooltip maxAllowedWidth={280} handle={aprNode} position="bottom-end" renderContent={renderTooltipContent} />
  ) : (
    aprNode
  );
}
