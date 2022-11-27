import { Menu } from "@headlessui/react";
import { FaChevronDown } from "react-icons/fa";
import { SyntheticsMarket } from "domain/synthetics/markets/types";
import { getMarketTokenFullName } from "domain/synthetics/markets/utils";
import "./MarketDropdown.scss";

export type MarketOption = {
  symbol: string;
};

export type Props = {
  selectedMarket: SyntheticsMarket;
  markets: SyntheticsMarket[];
  onSelect: (market: SyntheticsMarket) => void;
};

export function MarketDropdown(p: Props) {
  return (
    <div className="MarketDropdown-root">
      <Menu>
        <Menu.Button as="div">
          <button className="MarketDropdown-current">
            <span className="MarketDropdown-current-label">{getMarketTokenFullName(p.selectedMarket)}</span>
            <FaChevronDown className="MarketDropdown-current-arrow" />
          </button>
        </Menu.Button>
        <Menu.Items as="div" className="MarketDropdown-options menu-items">
          {p.markets.map((market) => (
            <Menu.Item key={market.indexTokenSymbol}>
              <div className="MarketDropdown-option" onClick={() => p.onSelect(market)}>
                {getMarketTokenFullName(market)}
              </div>
            </Menu.Item>
          ))}
        </Menu.Items>
      </Menu>
    </div>
  );
}
