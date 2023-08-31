import React, { useState } from "react";
import { Popover } from "@headlessui/react";
import cx from "classnames";
import { FaChevronDown } from "react-icons/fa";
import "./ChartTokenSelector.scss";
import { Token } from "domain/tokens";
import SearchInput from "components/SearchInput/SearchInput";
import TokenIcon from "components/TokenIcon/TokenIcon";
import { t } from "@lingui/macro";
import { TradeFlags } from "domain/synthetics/trade/useTradeFlags";

type Label = {
  label: string;
  value: string;
};

type Props = {
  chainId: number;
  selectedToken: Label | undefined;
  onSelectToken: (address: string) => void;
  tradeFlags?: TradeFlags;
  options: Token[] | undefined;
  className?: string;
};

export default function ChartTokenSelector(props: Props) {
  const { options, selectedToken, onSelectToken, tradeFlags } = props;
  const { isSwap } = tradeFlags || {};
  const [searchKeyword, setSearchKeyword] = useState("");

  const onSelect = (token: Token) => {
    onSelectToken(token.address);
    setSearchKeyword("");
  };

  const filteredTokens: Token[] | undefined = options?.filter((item) => {
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
                {selectedToken && (
                  <span className="chart-token-selector--current inline-items-center">
                    <TokenIcon className="chart-token-current-icon" symbol={"ETH"} displaySize={20} importSize={24} />
                    {selectedToken.label}
                  </span>
                )}
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
                    if (e.key === "Enter" && filteredTokens && filteredTokens.length > 0) {
                      onSelect(filteredTokens[0]);
                      close();
                    }
                  }}
                />
                <div className="divider" />
                <div className="chart-token-list">
                  <table>
                    {filteredTokens && filteredTokens.length > 0 && (
                      <thead className="table-head">
                        <tr>
                          <th>Market</th>
                          <th>{!isSwap && t`Long Liquidity`}</th>
                          <th>{!isSwap && t`Short Liquidity`}</th>
                        </tr>
                      </thead>
                    )}
                    <tbody>
                      {filteredTokens &&
                        filteredTokens.map((option) => {
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
                                {/* $
                                {formatAmount(
                                  isSwap ? option.maxInUsd : option.maxAvailableLong,
                                  USD_DECIMALS,
                                  0,
                                  true
                                )} */}
                              </td>
                              <td>
                                {/* $
                                {formatAmount(
                                  isSwap ? option.maxOutUsd : option.maxAvailableShort,
                                  USD_DECIMALS,
                                  0,
                                  true
                                )} */}
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
