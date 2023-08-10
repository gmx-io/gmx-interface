import { Menu } from "@headlessui/react";
import cx from "classnames";
import { getV1Tokens, getWhitelistedV1Tokens } from "config/tokens";
import { LONG, SHORT, SWAP } from "lib/legacy";
import { FaChevronDown } from "react-icons/fa";
import "./ChartTokenSelector.css";

export default function ChartTokenSelector(props) {
  const { chainId, selectedToken, onSelectToken, swapOption } = props;

  const isLong = swapOption === LONG;
  const isShort = swapOption === SHORT;
  const isSwap = swapOption === SWAP;

  let options = getV1Tokens(chainId);
  const whitelistedTokens = getWhitelistedV1Tokens(chainId);
  const indexTokens = whitelistedTokens.filter((token) => !token.isStable && !token.isWrapped);
  const shortableTokens = indexTokens.filter((token) => token.isShortable);

  if (isLong) {
    options = indexTokens;
  }
  if (isShort) {
    options = shortableTokens;
  }

  const onSelect = async (token) => {
    onSelectToken(token);
  };

  var value = selectedToken;

  return (
    <Menu>
      <Menu.Button as="div" disabled={isSwap}>
        <button
          className={cx("App-cta small transparent chart-token-selector", {
            "default-cursor": isSwap,
            "chart-token-dropdown": !isSwap,
          })}
        >
          <span className="chart-token-selector--current">{value.symbol} / USD</span>
          {!isSwap && <FaChevronDown />}
        </button>
      </Menu.Button>
      <div className="chart-token-menu">
        <Menu.Items as="div" className="menu-items chart-token-menu-items">
          {options.map((option, index) => (
            <Menu.Item key={index}>
              <div
                className="menu-item"
                onClick={() => {
                  onSelect(option);
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
  );
}
