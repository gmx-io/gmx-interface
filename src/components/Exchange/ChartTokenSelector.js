import React, { useState } from "react";
import { Menu } from "@headlessui/react";
import { FaChevronDown } from "react-icons/fa";
import cx from "classnames";
import "./ChartTokenSelector.scss";
import { LONG, SHORT, SWAP, USD_DECIMALS } from "lib/legacy";
import { getTokens, getWhitelistedTokens } from "config/tokens";
import SearchInput from "./SearchInput";
import { formatAmount } from "lib/numbers";

function addLiquidityToTokens(tokens, infoTokens) {
  if (!infoTokens) return tokens;
  return tokens.map((token) => {
    return {
      ...token,
      maxAvailableLong: infoTokens[token.address]?.maxAvailableLong,
      maxAvailableShort: infoTokens[token.address]?.maxAvailableShort,
    };
  });
}

export default function ChartTokenSelector(props) {
  const { chainId, selectedToken, onSelectToken, swapOption, infoTokens } = props;
  const [searchKeyword, setSearchKeyword] = useState("");

  const isLong = swapOption === LONG;
  const isShort = swapOption === SHORT;
  const isSwap = swapOption === SWAP;

  let options = getTokens(chainId);
  const whitelistedTokens = getWhitelistedTokens(chainId);
  const indexTokens = whitelistedTokens.filter((token) => !token.isStable && !token.isWrapped);
  const shortableTokens = indexTokens.filter((token) => token.isShortable);
  if (isLong) {
    options = addLiquidityToTokens(indexTokens, infoTokens);
  }
  if (isShort) {
    options = addLiquidityToTokens(shortableTokens, infoTokens);
  }

  const onSelect = async (token) => {
    onSelectToken(token);
  };

  const filteredTokens = options.filter((item) => {
    return (
      item.name.toLowerCase().indexOf(searchKeyword.toLowerCase()) > -1 ||
      item.symbol.toLowerCase().indexOf(searchKeyword.toLowerCase()) > -1
    );
  });

  const _handleKeyDown = (e) => {
    if (e.key === "Enter" && filteredTokens.length > 0) {
      onSelectToken(filteredTokens[0]);
    }
  };

  return (
    <Menu>
      <Menu.Button as="div" disabled={isSwap}>
        <button className={cx("App-cta small transparent chart-token-selector", { "default-cursor": isSwap })}>
          <span className="chart-token-selector--current">{selectedToken.symbol} / USD</span>
          {!isSwap && <FaChevronDown />}
        </button>
      </Menu.Button>
      <div className="chart-token-menu">
        <Menu.Items as="div" className="menu-items chart-token-menu-items">
          <SearchInput
            className="m-md"
            value={searchKeyword}
            setValue={({ target }) => setSearchKeyword(target.value)}
            onKeyDown={_handleKeyDown}
          />
          <div className="divider" />
          <div className="chart-token-list">
            <table>
              <thead>
                <tr>
                  <th>Market</th>
                  <th>Long Liquidity</th>
                  <th>Short Liquidity</th>
                </tr>
              </thead>
              <tbody>
                {filteredTokens.map((option, index) => {
                  return (
                    <Menu.Item key={index}>
                      <tr className="">
                        <td
                          className="token-item"
                          onClick={() => {
                            onSelect(option);
                          }}
                        >
                          <span> {option.symbol} / USD</span>
                        </td>
                        <td>
                          <span>${formatAmount(option.maxAvailableLong, USD_DECIMALS, 2, true)}</span>
                        </td>
                        <td>
                          <span>${formatAmount(option.maxAvailableShort, USD_DECIMALS, 2, true)}</span>
                        </td>
                      </tr>
                    </Menu.Item>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Menu.Items>
      </div>
    </Menu>
  );
}
