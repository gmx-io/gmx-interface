import { Popover } from "@headlessui/react";
import { t } from "@lingui/macro";
import cx from "classnames";
import { useState } from "react";
import { FaChevronDown } from "react-icons/fa";
import { BigNumberish } from "ethers";

import { USD_DECIMALS } from "config/factors";
import { getTokens, getWhitelistedV1Tokens } from "sdk/configs/tokens";
import { getUsd } from "domain/tokens";
import { InfoTokens, Token } from "sdk/types/tokens";
import { bigMath } from "sdk/utils/bigmath";
import { LONG, SHORT, SWAP, USDG_DECIMALS } from "lib/legacy";
import { expandDecimals, formatAmount } from "lib/numbers";

import SearchInput from "components/SearchInput/SearchInput";
import TokenIcon from "components/TokenIcon/TokenIcon";

import "./ChartTokenSelector.scss";

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
  setSwapOption?: (option: string) => void;
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
    if (
      availableAmount === undefined ||
      poolAmount === undefined ||
      bufferAmount === undefined ||
      maxUsdgAmount === undefined ||
      usdgAmount === undefined
    )
      return {
        ...token,
        maxInUsd: 0n,
        maxOutUsd: 0n,
      };
    const maxOut = availableAmount > poolAmount - bufferAmount ? poolAmount - bufferAmount : availableAmount;
    const maxOutUsd = getUsd(maxOut, token.address, false, infoTokens);
    const maxInUsd = bigMath.mulDiv(
      maxUsdgAmount - usdgAmount,
      expandDecimals(1, USD_DECIMALS),
      expandDecimals(1, USDG_DECIMALS)
    );

    return {
      ...token,
      maxOutUsd: maxOutUsd !== undefined && maxOutUsd > 0n ? maxOutUsd : 0n,
      maxInUsd: maxInUsd !== undefined && maxInUsd > 0n ? maxInUsd : 0n,
    };
  });
}

export default function ChartTokenSelector(props: Props) {
  const { chainId, selectedToken, onSelectToken, swapOption, infoTokens, setSwapOption } = props;
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
        if (!open && searchKeyword.length > 0) setSearchKeyword("");
        return (
          <>
            <Popover.Button as="div">
              <button className={cx("chart-token-selector", { "chart-token-label--active": open })}>
                <span className="chart-token-selector--current inline-flex items-center">
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
                  className="m-15 *:!text-body-medium"
                  value={searchKeyword}
                  setValue={setSearchKeyword}
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
                          <Popover.Button
                            as="tr"
                            key={option.symbol}
                            className={isSwap ? "Swap-token-list" : "Position-token-list"}
                          >
                            <td className="token-item" onClick={() => onSelect(option)}>
                              <span className="inline-flex items-center">
                                <TokenIcon
                                  className="ChartToken-list-icon"
                                  symbol={option.symbol}
                                  displaySize={16}
                                  importSize={24}
                                />
                                {option.symbol} {!isSwap && "/ USD"}
                              </span>
                            </td>
                            <td
                              onClick={() => {
                                onSelect(option);
                                if (setSwapOption && !isSwap) {
                                  setSwapOption(LONG);
                                }
                              }}
                            >
                              ${formatAmount(isSwap ? option.maxInUsd : option.maxAvailableLong, USD_DECIMALS, 0, true)}
                            </td>
                            <td
                              onClick={() => {
                                onSelect(option);
                                if (setSwapOption && !isSwap) {
                                  setSwapOption(SHORT);
                                }
                              }}
                            >
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
