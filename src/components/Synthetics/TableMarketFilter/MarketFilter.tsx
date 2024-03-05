import { t } from "@lingui/macro";
import { useCallback, useMemo } from "react";

import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { useTradeboxAvailableTokensOptions } from "context/SyntheticsStateContext/hooks/tradeboxHooks";
import type { TokenData } from "domain/synthetics/tokens/types";
import { AvailableTokenOptions } from "domain/synthetics/trade";

import { TableOptionsFilter } from "components/Synthetics/TableOptionsFilter/TableOptionsFilter";
import TokenIcon from "components/TokenIcon/TokenIcon";

type Props = {
  /**
   * Token addresses
   */
  value: string[];
  onChange: (value: string[]) => void;
};

export function MarketFilter({ value, onChange }: Props) {
  const sortOptions = useTradeboxAvailableTokensOptions();

  const tokensData = useTokensData();

  const tokensOptions = useMemo(() => {
    const tokenDataArr = Object.values(tokensData || {});
    const sortedTokens = sortTokens(sortOptions, tokenDataArr);

    return sortedTokens.map((token) => ({
      text: token.assetSymbol || token.symbol,
      data: token.address,
    }));
  }, [sortOptions, tokensData]);

  const ItemComponent = useCallback(
    (props: { item: string }) => {
      if (!tokensData) {
        return <></>;
      }
      const token = tokensData[props.item];
      return (
        <>
          <TokenIcon symbol={token.symbol} displaySize={16} importSize={24} className="mr-xs" />
          {token.assetSymbol || token.symbol}
        </>
      );
    },
    [tokensData]
  );

  return (
    <TableOptionsFilter<string>
      multiple
      label={t`Market`}
      onChange={onChange}
      options={tokensOptions}
      ItemComponent={ItemComponent}
      value={value}
    />
  );
}

function sortTokens(sortOptions: AvailableTokenOptions, tokenDataArr: TokenData[]) {
  const primarySortSequence = sortOptions.sortedIndexTokensWithPoolValue;
  const secondarySortSequence = sortOptions.sortedLongAndShortTokens;

  const getAddr = (token: TokenData, sequence: string[]) => {
    // making sure to use the wrapped address if it exists in the extended sort sequence
    if (token.wrappedAddress && sequence.includes(token.wrappedAddress)) {
      return token.wrappedAddress;
    }
    return token.address;
  };

  const getIndex = (token: TokenData, sequence: string[]) => {
    const address = getAddr(token, sequence);
    return sequence.indexOf(address);
  };

  const sortedTokens = tokenDataArr.sort((a, b) => {
    const aIndex = getIndex(a, primarySortSequence);
    const bIndex = getIndex(b, primarySortSequence);

    const areBothIndexesNotFound = aIndex === -1 && bIndex === -1;

    if (areBothIndexesNotFound) {
      const aSecondarySortIndex = getIndex(a, secondarySortSequence);
      const bSecondarySortIndex = getIndex(b, secondarySortSequence);

      return aSecondarySortIndex - bSecondarySortIndex;
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
}
