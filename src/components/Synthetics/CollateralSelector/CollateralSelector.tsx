import { Trans, t } from "@lingui/macro";
import { noop } from "lodash";
import React, { useCallback, useEffect } from "react";
import { toast } from "react-toastify";
import { useMedia } from "react-use";

import type { TokenData } from "domain/synthetics/tokens/types";
import { helperToast } from "lib/helperToast";

import TokenIcon from "components/TokenIcon/TokenIcon";
import {
  SelectorBase,
  SelectorBaseDesktopRow,
  SelectorBaseMobileButton,
  SelectorBaseMobileList,
  SelectorBaseTableHeadRow,
  useSelectorClose,
} from "../SelectorBase/SelectorBase";

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
    <SelectorBase label={props.selectedTokenSymbol} modalLabel={t`Collateral In`}>
      {isMobile ? <CollateralSelectorMobile {...props} /> : <CollateralSelectorDesktop {...props} />}
    </SelectorBase>
  );
}

function CollateralSelectorDesktop(props: Props) {
  const close = useSelectorClose();

  return (
    <table className="CollateralSelector-table">
      <thead>
        <SelectorBaseTableHeadRow>
          <th>
            <Trans>Collateral In</Trans>
          </th>
        </SelectorBaseTableHeadRow>
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
      <SelectorBaseDesktopRow
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
      </SelectorBaseDesktopRow>
    );
  }

  return (
    <SelectorBaseDesktopRow onClick={handleClick}>
      <td className="CollateralSelector-column-pool">
        <TokenIcon
          symbol={tokenData.symbol}
          displaySize={24}
          importSize={24}
          className="CollateralSelector-collateral-logo-first"
        />
        <div>{tokenData.symbol}</div>
      </td>
    </SelectorBaseDesktopRow>
  );
}

function CollateralSelectorMobile(props: Props) {
  const close = useSelectorClose();

  return (
    <SelectorBaseMobileList>
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
    </SelectorBaseMobileList>
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
    <SelectorBaseMobileButton onSelect={handleSelect} disabled={disabled}>
      <div className="CollateralSelector-column-pool">
        <TokenIcon
          symbol={tokenData.symbol}
          displaySize={30}
          importSize={24}
          className="CollateralSelector-collateral-logo-first"
        />
        <div>{tokenData.symbol}</div>
      </div>
    </SelectorBaseMobileButton>
  );
}
