import { Menu } from "@headlessui/react";
import { ReactNode } from "react";

import { getIcon } from "config/icons";
import "./TradeDropdown.scss";
import { Link } from "react-router-dom";

type Props = {
  buttonLabel: ReactNode;
};

export function TradeDropdown({ buttonLabel }: Props) {
  return (
    <div className="TradeDropdown-root">
      <Menu>
        <Menu.Button as="div">
          <div className="TradeDropdown-button default-btn">
            <span>{buttonLabel}</span>
          </div>
        </Menu.Button>

        <Menu.Items as="div" className="TradeDropdown-options  menu-items">
          <Menu.Item>
            <Link className="TradeDropdown-option" to="/trade">
              <img src={getIcon("common", "gmxOutline")} alt="GMX V1" className="TradeDropdown-option-icon" />
              <div className="TradeDropdown-option-label">GMX V1</div>
            </Link>
          </Menu.Item>

          <Menu.Item>
            <Link className="TradeDropdown-option" to="/v2">
              <img src={getIcon("common", "gmxOutline")} alt="GMX V2" className="TradeDropdown-option-icon" />
              <div className="TradeDropdown-option-label">GMX V2</div>
            </Link>
          </Menu.Item>
        </Menu.Items>
      </Menu>
    </div>
  );
}
