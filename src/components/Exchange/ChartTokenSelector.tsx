import React, { useState } from "react";
import { Menu } from "@headlessui/react";
import { FaChevronDown } from "react-icons/fa";
import cx from "classnames";
import "./ChartTokenSelector.scss";
import { LONG, SHORT, SWAP, USDG_DECIMALS, USD_DECIMALS } from "lib/legacy";
import { getTokens, getWhitelistedTokens } from "config/tokens";
import SearchInput from "./SearchInput";
import { bigNumberify, expandDecimals, formatAmount } from "lib/numbers";
import { InfoTokens, Token } from "domain/tokens/types";
import { getUsd } from "domain/tokens";
import { BigNumberish } from "ethers";

type ChartToken = Token & {
  maxInUsd?: BigNumberish;
  maxOutUsd?: BigNumberish;
  maxAvailableLong?: BigNumberish;
  maxAvailableShort?: BigNumberish;
};

type Props = {
  chainId: number;
  selectedToken: Token;
  onSelectToken: (token: Token) => void;
  swapOption: string;
  infoTokens?: InfoTokens;
};

function addLiquidityToTokens(tokens: Token[], infoTokens: InfoTokens): ChartToken[] {
  return tokens.map((token) => {
    const { maxAvailableLong, maxAvailableShort } = infoTokens[token.address] || {};
    return {
      ...token,
      maxAvailableLong,
      maxAvailableShort,
    };
  });
}

function addMaxInAndOut(tokens: Token[], infoTokens: InfoTokens): ChartToken[] {
  return tokens.map((token) => {
    const { availableAmount, poolAmount, bufferAmount, maxUsdgAmount, usdgAmount } = infoTokens[token.address] || {};
    if (!availableAmount || !poolAmount || !bufferAmount || !maxUsdgAmount || !usdgAmount)
      return {
        ...token,
        maxInUsd: bigNumberify(0),
        maxOutUsd: bigNumberify(0),
      };
    const maxOut = availableAmount.gt(poolAmount.sub(bufferAmount)) ? poolAmount.sub(bufferAmount) : availableAmount;
    const maxOutUsd = getUsd(maxOut, token.address, false, infoTokens);
    const maxInUsd = maxUsdgAmount
      .sub(usdgAmount)
      .mul(expandDecimals(1, USD_DECIMALS))
      .div(expandDecimals(1, USDG_DECIMALS));

    return {
      ...token,
      maxOutUsd,
      maxInUsd,
    };
  });
}

export default function ChartTokenSelector(props: Props) {
  const { chainId, selectedToken, onSelectToken, swapOption, infoTokens } = props;
  const [searchKeyword, setSearchKeyword] = useState("");
  const isLong = swapOption === LONG;
  const isShort = swapOption === SHORT;
  const isSwap = swapOption === SWAP;

  let options = getTokens(chainId);
  const whitelistedTokens = getWhitelistedTokens(chainId);
  const indexTokens = whitelistedTokens.filter((token) => !token.isStable && !token.isWrapped);
  const shortableTokens = indexTokens.filter((token) => token.isShortable);
  const swapTokens = whitelistedTokens.filter((token) => !token.isWrapped && !token.isTempHidden);

  if (infoTokens) {
    if (isLong) {
      options = addLiquidityToTokens(indexTokens, infoTokens);
    }
    if (isShort) {
      options = addLiquidityToTokens(shortableTokens, infoTokens);
    }
    if (isSwap) {
      options = addMaxInAndOut(swapTokens, infoTokens);
    }
  }

  const onSelect = async (token: Token) => {
    onSelectToken(token);
  };

  const filteredTokens: ChartToken[] = options.filter((item) => {
    return (
      item.name.toLowerCase().indexOf(searchKeyword.toLowerCase()) > -1 ||
      item.symbol.toLowerCase().indexOf(searchKeyword.toLowerCase()) > -1
    );
  });

  const _handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && filteredTokens.length > 0) {
      onSelectToken(filteredTokens[0]);
    }
  };

  return (
    <Menu>
      <Menu.Button as="div">
        <button className={cx("App-cta small transparent chart-token-selector", { "default-cursor": isSwap })}>
          <span className="chart-token-selector--current">{selectedToken.symbol} / USD</span>
          <FaChevronDown />
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
              {filteredTokens.length > 0 && (
                <thead className="table-head">
                  <tr>
                    <th>Market</th>
                    <th>{isSwap ? "Max In" : "Long Liquidity"}</th>
                    <th>{isSwap ? "Max Out" : "Short Liquidity"}</th>
                  </tr>
                </thead>
              )}
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
                          {option.symbol} {!isSwap && "/ USD"}
                        </td>
                        <td>
                          ${formatAmount(isSwap ? option.maxInUsd : option.maxAvailableLong, USD_DECIMALS, 0, true)}
                        </td>
                        <td>
                          ${formatAmount(isSwap ? option.maxOutUsd : option.maxAvailableShort, USD_DECIMALS, 0, true)}
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
