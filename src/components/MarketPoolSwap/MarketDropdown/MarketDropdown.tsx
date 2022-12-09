import { Menu } from "@headlessui/react";
import { FaChevronDown } from "react-icons/fa";
import { SyntheticsMarket } from "domain/synthetics/markets/types";
import { useChainId } from "lib/chains";
import { useMarkets } from "domain/synthetics/markets/useMarkets";
import { useWhitelistedTokensData } from "domain/synthetics/tokens/useTokensData";
import { getMarketName, getMarkets } from "domain/synthetics/markets/utils";
import { PLACEHOLDER_MARKET_NAME } from "config/synthetics";

import "./MarketDropdown.scss";

export type MarketOption = {
  symbol: string;
};

export type Props = {
  selectedMarketKey?: string;
  markets: SyntheticsMarket[];
  onSelect: (marketAddress: string) => void;
};

export function MarketDropdown(p: Props) {
  const { chainId } = useChainId();

  const marketsData = useMarkets(chainId);
  const tokensData = useWhitelistedTokensData(chainId);

  const data = { ...marketsData, ...tokensData };

  const markets = getMarkets(data);

  return (
    <div className="MarketDropdown-root">
      <Menu>
        <Menu.Button as="div">
          <button className="MarketDropdown-current">
            <span className="MarketDropdown-current-label">
              {p.selectedMarketKey && markets.length > 0
                ? getMarketName(chainId, data, p.selectedMarketKey)
                : PLACEHOLDER_MARKET_NAME}
            </span>
            <FaChevronDown className="MarketDropdown-current-arrow" />
          </button>
        </Menu.Button>
        <Menu.Items as="div" className="MarketDropdown-options menu-items">
          {markets.map((market) => (
            <Menu.Item key={market.marketTokenAddress}>
              <div className="MarketDropdown-option" onClick={() => p.onSelect(market.marketTokenAddress)}>
                {getMarketName(chainId, data, market.marketTokenAddress)}
              </div>
            </Menu.Item>
          ))}
        </Menu.Items>
      </Menu>
    </div>
  );
}
