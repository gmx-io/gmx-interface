import { Menu } from "@headlessui/react";
import { Trans } from "@lingui/macro";
import { FaChevronDown } from "react-icons/fa";

import "./TradeDropdown.scss";

export function TradeDropdown() {
  return (
    <div className="TradeDropdown-root">
      <Menu>
        <Menu.Button as="div">
          <div className="TradeDropdown-button default-btn">
            <span>
              <Trans>Trade</Trans>
            </span>
            <FaChevronDown className="TradeDropdown-arrow" />
          </div>
        </Menu.Button>

        <Menu.Items as="div" className="TradeDropdown-options  menu-items">
          <Menu.Item>
            <div className="TradeDropdown-option">
              <div className="TradeDropdown-option-label">V1</div>
              <div className="TradeDropdown-option-description">GLP Contracts</div>
            </div>
          </Menu.Item>
          <Menu.Item>
            <div className="TradeDropdown-option">
              <div className="TradeDropdown-option-label">V2</div>
              <div className="TradeDropdown-option-description">GM Contracts</div>
            </div>
          </Menu.Item>
        </Menu.Items>
      </Menu>
    </div>
  );
}
