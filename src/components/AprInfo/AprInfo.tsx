import { Trans, t } from "@lingui/macro";
import { useCallback, useMemo } from "react";

import { getIncentivesV2Url } from "config/links";
import { getTokens } from "config/tokens";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useLiquidityProvidersIncentives } from "domain/synthetics/common/useIncentiveStats";
import { useChainId } from "lib/chains";
import { formatAmount } from "lib/numbers";

import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";

import sparkleIcon from "img/sparkle.svg";

function useAirdroppedTokenTitle() {
  const chainId = useSelector(selectChainId);
  const incentivesData = useLiquidityProvidersIncentives(chainId);
  const marketsData = useSelector((s) => s.globals.markets.marketsData);

  if (!incentivesData) {
    return undefined;
  }

  const airdropTokenAddress = incentivesData.token;

  const market = marketsData?.[airdropTokenAddress];

  if (market) {
    const title = `GM: ${market.name}`;
    return title;
  }

  const tokens = getTokens(chainId);
  const tokenInfo = tokens.find((token) => token.address === airdropTokenAddress);

  if (tokenInfo) {
    return tokenInfo.symbol;
  }

  return undefined;
}

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
  const airdropTokenTitle = useAirdroppedTokenTitle();

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
          The Bonus APR will be airdropped as {airdropTokenTitle} tokens.{" "}
          <ExternalLink href={getIncentivesV2Url(chainId)}>Read more</ExternalLink>.
        </Trans>
      </>
    );
  }, [airdropTokenTitle, apy, chainId, incentiveApr, isIncentiveActive]);

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
