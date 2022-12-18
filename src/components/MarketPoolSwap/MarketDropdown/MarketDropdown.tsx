import { Menu } from "@headlessui/react";
import { FaChevronDown } from "react-icons/fa";
import { Market } from "domain/synthetics/markets/types";
import { useChainId } from "lib/chains";
import { getMarketName, getMarkets } from "domain/synthetics/markets/utils";
import { PLACEHOLDER_MARKET_NAME } from "config/synthetics";
import { useMarketsData } from "domain/synthetics/markets";

import "./MarketDropdown.scss";
import { useAvailableTradeTokensData } from "domain/synthetics/tokens";

export type MarketOption = {
  symbol: string;
};

export type Props = {
  selectedMarketKey?: string;
  markets: Market[];
  onSelect: (marketAddress: string) => void;
};

export function MarketDropdown(p: Props) {
  const { chainId } = useChainId();

  const marketsData = useMarketsData(chainId);
  const tokensData = useAvailableTradeTokensData(chainId);

  const markets = getMarkets(marketsData);

  return (
    <div className="MarketDropdown-root">
      <Menu>
        <Menu.Button as="div">
          <button className="MarketDropdown-current">
            <span className="MarketDropdown-current-label">
              {p.selectedMarketKey && markets.length > 0
                ? getMarketName(marketsData, tokensData, p.selectedMarketKey)
                : PLACEHOLDER_MARKET_NAME}
            </span>
            <FaChevronDown className="MarketDropdown-current-arrow" />
          </button>
        </Menu.Button>
        <Menu.Items as="div" className="MarketDropdown-options menu-items">
          {markets.map((market) => (
            <Menu.Item key={market.marketTokenAddress}>
              <div className="MarketDropdown-option" onClick={() => p.onSelect(market.marketTokenAddress)}>
                {getMarketName(marketsData, tokensData, market.marketTokenAddress)}
              </div>
            </Menu.Item>
          ))}
        </Menu.Items>
      </Menu>
    </div>
  );
}
