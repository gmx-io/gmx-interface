import { getTokens } from "config/tokens";
import { useMarketsInfoData, useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useLiquidityProvidersIncentives, useTradingIncentives } from "domain/synthetics/common/useIncentiveStats";
import find from "lodash/find";
import { Address, isAddressEqual } from "viem";
import { getMarketIndexName, getMarketPoolName } from "../markets";

export function useLpAirdroppedTokenTitle(chainId: number): string | JSX.Element {
  const incentivesData = useLiquidityProvidersIncentives(chainId);
  const marketsInfoData = useMarketsInfoData();

  if (!marketsInfoData || !incentivesData) {
    return "";
  }

  const airDropTokenAddress = incentivesData.token as Address;

  const market = find(marketsInfoData, (market) =>
    isAddressEqual(market.marketTokenAddress as Address, airDropTokenAddress)
  );

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
  const tokenInfo = tokens.find((token) => isAddressEqual(token.address as Address, airDropTokenAddress));

  if (tokenInfo) {
    return tokenInfo.symbol;
  }

  return "";
}

export function useTradingAirdroppedTokenTitle(chainId: number): string {
  const tradingIncentives = useTradingIncentives(chainId);
  const marketsData = useSelector((s) => s.globals.markets.marketsData);
  const tokensData = useTokensData();

  if (!marketsData || !tradingIncentives) {
    return "";
  }

  const airdropTokenAddress = tradingIncentives.token;

  if (!airdropTokenAddress) {
    return "";
  }

  const market = marketsData[airdropTokenAddress];

  if (market) {
    const title = `GM: ${market.name}`;
    return title;
  }

  const token = tokensData?.[airdropTokenAddress];

  if (token) {
    return token.symbol;
  }

  return "";
}

export function useAnyAirdroppedTokenTitle(chainId: number): string | JSX.Element {
  const lpAirdroppedTokenTitle = useLpAirdroppedTokenTitle(chainId);
  const tradingAirdroppedTokenTitle = useTradingAirdroppedTokenTitle(chainId);

  return lpAirdroppedTokenTitle ?? tradingAirdroppedTokenTitle;
}
