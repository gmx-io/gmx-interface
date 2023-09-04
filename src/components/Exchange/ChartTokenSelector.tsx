import React, { useState } from "react";
import { Popover } from "@headlessui/react";
import cx from "classnames";
import { FaChevronDown } from "react-icons/fa";
import "./ChartTokenSelector.scss";
import { LONG, SHORT, SWAP, USDG_DECIMALS, USD_DECIMALS } from "lib/legacy";
import { getTokens, getWhitelistedV1Tokens } from "config/tokens";
import { bigNumberify, expandDecimals, formatAmount } from "lib/numbers";
import { InfoTokens, Token } from "domain/tokens/types";
import { getUsd } from "domain/tokens";
import { BigNumberish } from "ethers";
import SearchInput from "components/SearchInput/SearchInput";
import TokenIcon from "components/TokenIcon/TokenIcon";
import { t } from "@lingui/macro";

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
      maxOutUsd: maxOutUsd?.gt(0) ? maxOutUsd : bigNumberify(0),
      maxInUsd: maxInUsd?.gt(0) ? maxInUsd : bigNumberify(0),
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
  const whitelistedTokens = getWhitelistedV1Tokens(chainId);
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

  const onSelect = (token: Token) => {
    onSelectToken(token);
    setSearchKeyword("");
  };

  const filteredTokens: ChartToken[] = options.filter((item) => {
    return (
      item.name.toLowerCase().indexOf(searchKeyword.toLowerCase()) > -1 ||
      item.symbol.toLowerCase().indexOf(searchKeyword.toLowerCase()) > -1
    );
  });

  return (
    <Popover>
      {({ open, close }) => {
        if (!open) setSearchKeyword("");
        return (
          <>
            <Popover.Button as="div">
              <button className={cx("chart-token-selector", { "chart-token-label--active": open })}>
                <span className="chart-token-selector--current inline-items-center">
                  <TokenIcon
                    className="chart-token-current-icon"
                    symbol={selectedToken.symbol}
                    displaySize={20}
                    importSize={24}
                  />
                  {selectedToken.symbol} / USD
                </span>
                <FaChevronDown fontSize={14} />
              </button>
            </Popover.Button>
            <div className="chart-token-menu">
              <Popover.Panel as="div" className="menu-items chart-token-menu-items">
                <SearchInput
                  className="m-md"
                  value={searchKeyword}
                  setValue={({ target }) => setSearchKeyword(target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && filteredTokens.length > 0) {
                      onSelect(filteredTokens[0]);
                      close();
                    }
                  }}
                />
                <div className="divider" />
                <div className="chart-token-list">
                  <table>
                    {filteredTokens.length > 0 && (
                      <thead className="table-head">
                        <tr>
                          <th>Market</th>
                          <th>{isSwap ? t`Max In` : t`Long Liquidity`}</th>
                          <th>{isSwap ? t`Max Out` : t`Short Liquidity`}</th>
                        </tr>
                      </thead>
                    )}
                    <tbody>
                      {filteredTokens.map((option) => {
                        return (
                          <Popover.Button as="tr" key={option.symbol} onClick={() => onSelect(option)}>
                            <td className="token-item">
                              <span className="inline-items-center">
                                <TokenIcon
                                  className="ChartToken-list-icon"
                                  symbol={option.symbol}
                                  displaySize={16}
                                  importSize={24}
                                />
                                {option.symbol} {!isSwap && "/ USD"}
                              </span>
                            </td>
                            <td>
                              ${formatAmount(isSwap ? option.maxInUsd : option.maxAvailableLong, USD_DECIMALS, 0, true)}
                            </td>
                            <td>
                              $
                              {formatAmount(
                                isSwap ? option.maxOutUsd : option.maxAvailableShort,
                                USD_DECIMALS,
                                0,
                                true
                              )}
                            </td>
                          </Popover.Button>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Popover.Panel>
            </div>
          </>
        );
      }}
    </Popover>
  );
}
