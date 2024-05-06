import { Trans, t } from "@lingui/macro";
import { noop } from "lodash";
import React, { useCallback, useEffect } from "react";
import { toast } from "react-toastify";
import { useMedia } from "react-use";

import type { TokenData } from "domain/synthetics/tokens/types";
import { helperToast } from "lib/helperToast";

import TokenIcon from "components/TokenIcon/TokenIcon";
import {
  Selector2Base,
  Selector2BaseDesktopRow,
  Selector2BaseMobileButton,
  Selector2BaseMobileList,
  Selector2BaseTableHeadRow,
  useSelector2Close,
} from "../Selector2Base/Selector2Base";

import "./CollateralSelector.scss";

type Props = {
  // eslint-disable-next-line react/no-unused-prop-types
  selectedTokenSymbol?: string;
  options: TokenData[] | undefined;
  disabledOptions?: TokenData[];
  onSelect: (tokenAddress: string) => void;
};

export function CollateralSelector(props: Props) {
  const isMobile = useMedia("(max-width: 1100px)");

  return (
    <Selector2Base label={props.selectedTokenSymbol} modalLabel={t`Collateral In`}>
      {isMobile ? <CollateralSelectorMobile {...props} /> : <CollateralSelectorDesktop {...props} />}
    </Selector2Base>
  );
}

function CollateralSelectorDesktop(props: Props) {
  const close = useSelector2Close();

  return (
    <table className="CollateralSelector-table">
      <thead>
        <Selector2BaseTableHeadRow>
          <th>
            <Trans>Collateral In</Trans>
          </th>
        </Selector2BaseTableHeadRow>
      </thead>
      <tbody>
        {props.options?.map((option) => (
          <CollateralListItemDesktop
            key={option.address}
            onSelect={() => {
              props.onSelect(option.address);
              close();
            }}
            tokenData={option}
          />
        ))}

        {props.disabledOptions?.map((option) => (
          <CollateralListItemDesktop key={option.address} onSelect={noop} tokenData={option} disabled />
        ))}
      </tbody>
    </table>
  );
}

function CollateralListItemDesktop({
  tokenData,
  onSelect,
  disabled,
}: {
  tokenData: TokenData;
  onSelect: () => void;
  disabled?: boolean;
}) {
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (disabled) {
        return;
      }
      onSelect();
    },
    [disabled, onSelect]
  );

  if (disabled) {
    return (
      <Selector2BaseDesktopRow
        disabled
        disabledMessage={<Trans>Select a pool containing {tokenData.symbol} to use it as collateral.</Trans>}
      >
        <td className="CollateralSelector-column-pool">
          <TokenIcon
            symbol={tokenData.symbol}
            displaySize={24}
            importSize={24}
            className="CollateralSelector-collateral-logo-first"
          />
          <div>{tokenData.symbol}</div>
        </td>
      </Selector2BaseDesktopRow>
    );
  }

  return (
    <Selector2BaseDesktopRow onClick={handleClick}>
      <td className="CollateralSelector-column-pool">
        <TokenIcon
          symbol={tokenData.symbol}
          displaySize={24}
          importSize={24}
          className="CollateralSelector-collateral-logo-first"
        />
        <div>{tokenData.symbol}</div>
      </td>
    </Selector2BaseDesktopRow>
  );
}

function CollateralSelectorMobile(props: Props) {
  const close = useSelector2Close();

  return (
    <Selector2BaseMobileList>
      {props.options?.map((option) => (
        <CollateralListItemMobile
          key={option.address}
          onSelect={() => {
            props.onSelect(option.address);
            close();
          }}
          tokenData={option}
        />
      ))}
      {props.disabledOptions?.map((option) => (
        <CollateralListItemMobile key={option.address} onSelect={noop} tokenData={option} disabled />
      ))}
    </Selector2BaseMobileList>
  );
}

function CollateralListItemMobile({
  tokenData,
  onSelect,
  disabled,
}: {
  tokenData: TokenData;
  onSelect: () => void;
  disabled?: boolean;
}) {
  const handleSelect = useCallback(() => {
    if (disabled) {
      helperToast.error(<Trans>Select a pool containing {tokenData.symbol} to use it as collateral.</Trans>, {
        toastId: `error-collateral-${tokenData.symbol}`,
      });
      return;
    }

    onSelect();
  }, [disabled, onSelect, tokenData.symbol]);

  useEffect(() => {
    const symbol = tokenData.symbol;
    return () => {
      toast.dismiss(`error-collateral-${symbol}`);
    };
  }, [tokenData.symbol]);

  return (
    <Selector2BaseMobileButton onSelect={handleSelect} disabled={disabled}>
      <div className="CollateralSelector-column-pool">
        <TokenIcon
          symbol={tokenData.symbol}
          displaySize={30}
          importSize={24}
          className="CollateralSelector-collateral-logo-first"
        />
        <div>{tokenData.symbol}</div>
      </div>
    </Selector2BaseMobileButton>
  );
}
