import { getServerUrl } from "config/backend";
import { getNativeToken, getTokenBySymbol, getWrappedToken, isChartAvailabeForToken } from "config/tokens";
import { getChainlinkChartPricesFromGraph, getChartPricesFromStats } from "domain/prices";

export const getTokenChartPrice = async (chainId: number, symbol: string, period: string) => {
  if (!isChartAvailabeForToken(chainId, symbol)) {
    symbol = getNativeToken(chainId).symbol;
  }
  let prices;
  try {
    prices = await getChartPricesFromStats(chainId, symbol, period);
  } catch (ex) {
    // eslint-disable-next-line no-console
    console.warn(ex, "Switching to graph chainlink data");
    try {
      prices = await getChainlinkChartPricesFromGraph(symbol, period);
    } catch (ex2) {
      // eslint-disable-next-line no-console
      console.warn("getChainlinkChartPricesFromGraph failed", ex2);
      prices = [];
    }
  }
  return prices;
};

export async function getCurrentPriceOfToken(chainId: number, symbol: string) {
  if (!isChartAvailabeForToken(chainId, symbol)) {
    symbol = getNativeToken(chainId).symbol;
  }
  try {
    const indexPricesUrl = getServerUrl(chainId, "/prices");
    const response = await fetch(indexPricesUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const indexPrices = await response.json();
    let symbolInfo = getTokenBySymbol(chainId, symbol);
    if (symbolInfo.isNative) {
      symbolInfo = getWrappedToken(chainId);
    }
    return indexPrices[symbolInfo.address];
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
  }
}
