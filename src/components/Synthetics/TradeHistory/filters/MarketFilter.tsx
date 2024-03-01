import { FloatingPortal, autoUpdate, flip, offset, shift, useFloating } from "@floating-ui/react";
import { Popover } from "@headlessui/react";
import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import React, { useMemo, useState } from "react";

import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { useTradeboxAvailableTokensOptions } from "context/SyntheticsStateContext/hooks/tradeboxHooks";

import Checkbox from "components/Checkbox/Checkbox";
import SearchInput from "components/SearchInput/SearchInput";
import TokenIcon from "components/TokenIcon/TokenIcon";

import { ReactComponent as FilterIcon } from "img/ic_filter.svg";

import "./MarketFilter.scss";

type Props = {
  /**
   * Token addresses
   */
  value: string[];
  onChange: (value: string[]) => void;
};

export function MarketFilter({ value, onChange }: Props) {
  const { refs, floatingStyles } = useFloating({
    middleware: [offset(10), flip(), shift()],
    strategy: "fixed",
    whileElementsMounted: autoUpdate,
  });
  const sortOptions = useTradeboxAvailableTokensOptions();

  const isActive = value.length > 0;

  const [marketSearch, setMarketSearch] = useState("");

  const tokensData = useTokensData();

  const tokens = useMemo(() => {
    const tokenDataArr = Object.values(tokensData || {});
    const sortSequence = sortOptions.sortedLongAndShortTokens;
    const sortedTokens = tokenDataArr.sort((a, b) => {
      // making sure to use the wrapped address if it exists in the extended sort sequence
      const aAddress = a.wrappedAddress && sortSequence.includes(a.wrappedAddress) ? a.wrappedAddress : a.address;
      const bAddress = b.wrappedAddress && sortSequence.includes(b.wrappedAddress) ? b.wrappedAddress : b.address;

      const aIndex = sortSequence.indexOf(aAddress);
      const bIndex = sortSequence.indexOf(bAddress);

      if (aIndex === -1 && bIndex === -1) {
        return 0;
      }

      if (aIndex === -1) {
        return 1;
      }

      if (bIndex === -1) {
        return -1;
      }

      return aIndex - bIndex;
    });

    return sortedTokens;
  }, [sortOptions.sortedLongAndShortTokens, tokensData]);

  const filteredTokens = useMemo(() => {
    if (!marketSearch.trim()) {
      return tokens;
    }

    return tokens.filter((token) => token.symbol.toLowerCase().includes(marketSearch.toLowerCase()));
  }, [marketSearch, tokens]);

  function toggleTokenAddress(tokenAddress: string) {
    if (value.includes(tokenAddress)) {
      onChange(value.filter((address) => address !== tokenAddress));
    } else {
      onChange([...value, tokenAddress]);
    }
  }

  function handleSearchEnterKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && filteredTokens.length > 0) {
      toggleTokenAddress(filteredTokens[0].address);
    }
  }

  return (
    <>
      <Popover>
        <Popover.Button
          as="div"
          ref={refs.setReference}
          className={cx("TradeHistorySynthetics-filter", {
            active: isActive,
          })}
        >
          <Trans>Market</Trans>
          <FilterIcon className="TradeHistorySynthetics-filter-icon" />
        </Popover.Button>
        <FloatingPortal>
          <Popover.Panel
            ref={refs.setFloating}
            style={floatingStyles}
            className={"TradeHistorySynthetics-filter-popover"}
          >
            <SearchInput
              className="MarketFilter-search"
              placeholder={t`Search Token`}
              value={marketSearch}
              setValue={(event) => setMarketSearch(event.target.value)}
              onKeyDown={handleSearchEnterKey}
            />

            <div className="MarketFilter-options">
              {filteredTokens.map((token) => (
                <div
                  key={token.address}
                  className="MarketFilter-option"
                  onClick={() => {
                    toggleTokenAddress(token.address);
                  }}
                >
                  <Checkbox isChecked={value.includes(token.address)} />
                  <TokenIcon symbol={token.symbol} displaySize={16} importSize={24} className="mr-xs" />
                  {token.symbol}
                </div>
              ))}
            </div>
          </Popover.Panel>
        </FloatingPortal>
      </Popover>
    </>
  );
}
