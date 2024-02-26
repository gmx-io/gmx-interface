import { FloatingPortal, flip, offset, shift, useFloating } from "@floating-ui/react";
import { Popover } from "@headlessui/react";
import { Trans } from "@lingui/macro";
import cx from "classnames";
import React, { useMemo, useState } from "react";

import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";

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
  });

  const isActive = value.length > 0;

  const [marketSearch, setMarketSearch] = useState("");

  const tokensData = useTokensData();

  const tokens = useMemo(() => Object.values(tokensData || {}), [tokensData]);

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
        <Popover.Button as="div" ref={refs.setReference} className="TradeHistorySynthetics-filter">
          <Trans>Market</Trans>
          <FilterIcon
            className={cx("TradeHistorySynthetics-filter-icon", {
              active: isActive,
            })}
          />
        </Popover.Button>
        <FloatingPortal>
          <Popover.Panel
            ref={refs.setFloating}
            style={floatingStyles}
            className={"TradeHistorySynthetics-filter-popover"}
          >
            <SearchInput
              className="MarketFilter-search"
              placeholder="Search Token"
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
