import { getTokens } from "config/tokens";
import { useMarketsInfoData, useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { useLiquidityProvidersIncentives, useTradingIncentives } from "domain/synthetics/common/useIncentiveStats";
import find from "lodash/find";
import { Address, isAddressEqual } from "viem";
import { getMarketIndexName, getMarketPoolName } from "../markets";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";

export function useLpAirdroppedTokenTitle(): string | JSX.Element {
  const chainId = useSelector(selectChainId);
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
        <span className="ml-2 text-12 leading-1 text-slate-100">[{poolName}]</span>
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

export function useTradingAirdroppedTokenTitle(): string | JSX.Element {
  const chainId = useSelector(selectChainId);
  const tradingIncentives = useTradingIncentives(chainId);
  const marketsInfoData = useMarketsInfoData();
  const tokensData = useTokensData();

  if (!marketsInfoData || !tradingIncentives) {
    return "";
  }

  const airdropTokenAddress = tradingIncentives.token;

  if (!airdropTokenAddress) {
    return "";
  }

  const marketInfo = marketsInfoData[airdropTokenAddress];

  if (marketInfo) {
    const indexName = getMarketIndexName(marketInfo);
    const poolName = getMarketPoolName(marketInfo);

    const title = (
      <span className="inline-flex items-center">
        <span>GM: {indexName}</span>
        <span className="ml-2 text-12 leading-1 text-slate-100">[{poolName}]</span>
      </span>
    );

    return title;
  }

  const token = tokensData?.[airdropTokenAddress];

  if (token) {
    return token.symbol;
  }

  return "";
}

export function useAnyAirdroppedTokenTitle(): string | JSX.Element {
  const lpAirdroppedTokenTitle = useLpAirdroppedTokenTitle();
  const tradingAirdroppedTokenTitle = useTradingAirdroppedTokenTitle();

  return lpAirdroppedTokenTitle ?? tradingAirdroppedTokenTitle;
}
