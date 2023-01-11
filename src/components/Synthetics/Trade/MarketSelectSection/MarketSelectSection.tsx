import { Menu } from "@headlessui/react";
import { FaChevronDown } from "react-icons/fa";

type Option = {
  label: string;
  value: string;
};

export type Props = {
  topLeftLabel: string;
  selectedOption?: Option;
  options: Option[];
  onSelect?: (option: Option) => void;
};

export function SelectSection(p: Props) {
  return (
    <div className="Exchange-swap-section">
      <div className="Exchange-swap-section-top">
        <div className="muted">{p.topLeftLabel}</div>
      </div>
      <label className="Exchange-swap-section-bottom">
        <div className="Exchange-swap-input-container">
          <Menu>
            <Menu.Button as="div">
              {/* <button className="MarketDropdown-current"> */}
              <span
                className="Exchange-swap-input font-lg"
                style={{
                  fontSize: "2rem",
                }}
              >
                AVAX/USD
              </span>
              {/* </button> */}
            </Menu.Button>
            <Menu.Items as="div" className="MarketDropdown-options menu-items">
              {p.options.map((opt) => (
                <Menu.Item key={opt.value}>
                  <div className="MarketDropdown-option" onClick={() => p.onSelect?.(opt)}>
                    {opt.label}
                  </div>
                </Menu.Item>
              ))}
            </Menu.Items>
          </Menu>
        </div>
        <div className="PositionEditor-token-symbol">
          <FaChevronDown />
        </div>
      </label>
    </div>
  );
}
