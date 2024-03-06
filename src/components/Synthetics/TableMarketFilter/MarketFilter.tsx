import { t } from "@lingui/macro";
import { useCallback, useMemo } from "react";

import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { useTradeboxAvailableTokensOptions } from "context/SyntheticsStateContext/hooks/tradeboxHooks";

import { TableOptionsFilter } from "components/Synthetics/TableOptionsFilter/TableOptionsFilter";
import TokenIcon from "components/TokenIcon/TokenIcon";
import { sortTokens } from "./sortTokens";

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
