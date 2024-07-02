import { getTokens } from "config/tokens";
import { useMarketsInfoData, useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useLiquidityProvidersIncentives, useTradingIncentives } from "domain/synthetics/common/useIncentiveStats";
import { getMarketIndexName, getMarketPoolName } from "../markets";

export function useLpAirdroppedTokenTitle() {
  const chainId = useSelector(selectChainId);
  const incentivesData = useLiquidityProvidersIncentives(chainId);
  const marketsInfoData = useMarketsInfoData();

  if (!incentivesData) {
    return undefined;
  }

  const airdropTokenAddress = incentivesData.token;

  const market = marketsInfoData?.[airdropTokenAddress];

  if (market) {
    const indexName = getMarketIndexName(market);
    const poolName = getMarketPoolName(market);

    const title = (
      <span className="inline-flex items-center">
        <span>GM: {indexName}</span>
        <span className="ml-2 text-12 leading-1 text-gray-300">[{poolName}]</span>
      </span>
    );
    return title;
  }

  const tokens = getTokens(chainId);
  const tokenInfo = tokens.find((token) => token.address === airdropTokenAddress);

  if (tokenInfo) {
    return tokenInfo.symbol;
  }

  return undefined;
}

export function useTradingAirdroppedTokenTitle() {
  const tokensData = useTokensData();
  const tradingIncentives = useTradingIncentives(tokensData);
  const marketsData = useSelector((s) => s.globals.markets.marketsData);

  if (!tradingIncentives) {
    return undefined;
  }

  const airdropToken = tradingIncentives.token;

  if (!airdropToken) {
    return undefined;
  }

  const market = marketsData?.[airdropToken.address];

  if (market) {
    const title = `GM: ${market.name}`;
    return title;
  }

  if (airdropToken) {
    return airdropToken.symbol;
  }

  return undefined;
}

export function useAnyAirdroppedTokenTitle() {
  const lpAirdroppedTokenTitle = useLpAirdroppedTokenTitle();
  const tradingAirdroppedTokenTitle = useTradingAirdroppedTokenTitle();

  return lpAirdroppedTokenTitle ?? tradingAirdroppedTokenTitle;
}
