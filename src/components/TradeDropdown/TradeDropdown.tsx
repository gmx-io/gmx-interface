import { Menu } from "@headlessui/react";
import { HeaderLink } from "components/Header/HeaderLink";
import { ReactNode } from "react";

import { getIcon } from "config/icons";
import "./TradeDropdown.scss";

type Props = {
  redirectPopupTimestamp: number;
  showRedirectModal: (to: string) => void;
  buttonLabel: ReactNode;
};

export function TradeDropdown(p: Props) {
  const { redirectPopupTimestamp, showRedirectModal, buttonLabel } = p;

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
            <HeaderLink
              className="TradeDropdown-option"
              to="/trade"
              redirectPopupTimestamp={redirectPopupTimestamp}
              showRedirectModal={showRedirectModal}
            >
              <img src={getIcon("common", "gmxOutline")} alt="GMX V1" className="TradeDropdown-option-icon" />
              <div className="TradeDropdown-option-label">GMX V1</div>
            </HeaderLink>
          </Menu.Item>

          <Menu.Item>
            <HeaderLink
              className="TradeDropdown-option"
              to="/v2"
              redirectPopupTimestamp={redirectPopupTimestamp}
              showRedirectModal={showRedirectModal}
            >
              <img src={getIcon("common", "gmxOutline")} alt="GMX V2" className="TradeDropdown-option-icon" />
              <div className="TradeDropdown-option-label">GMX V2</div>
            </HeaderLink>
          </Menu.Item>
        </Menu.Items>
      </Menu>
    </div>
  );
}
