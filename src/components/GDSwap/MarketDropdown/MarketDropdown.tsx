import { Menu } from "@headlessui/react";
import { FaChevronDown } from "react-icons/fa";
import cx from "classnames";

export type MarketOption = {
  symbol: string;
};

export type Props = {
  onSelect: (option: MarketOption) => void;
};

export function MarketDropdown(p: Props) {
  const options = [{ symbol: "GD: ETH/USD" }];

  return (
    <div className="MarketDropdown-root">
      <Menu>
        <Menu.Button as="div">
          <button className={cx("App-cta small transparent chart-token-selector")}>
            <span className="chart-token-selector--current">GD: ETH/USD</span>
            <FaChevronDown />
          </button>
        </Menu.Button>
        <div className="chart-token-menu">
          <Menu.Items as="div" className="menu-items chart-token-menu-items">
            {options.map((option, index) => (
              <Menu.Item key={index}>
                <div
                  className="menu-item"
                  onClick={() => {
                    p.onSelect(option);
                  }}
                >
                  <span style={{ marginLeft: 5 }} className="token-label">
                    {option.symbol} / USD
                  </span>
                </div>
              </Menu.Item>
            ))}
          </Menu.Items>
        </div>
      </Menu>
    </div>
  );
}
