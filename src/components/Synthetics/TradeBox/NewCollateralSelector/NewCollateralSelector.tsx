/* eslint-disable react/no-unused-prop-types */
import { Trans, t } from "@lingui/macro";
import { noop } from "lodash";
import React, { useCallback, useEffect } from "react";
import { useMedia } from "react-use";

import type { TokenData } from "domain/synthetics/tokens/types";

import TokenIcon from "components/TokenIcon/TokenIcon";
import {
  NewSelectorBase,
  NewSelectorBaseDesktopRow,
  NewSelectorBaseMobileButton,
  NewSelectorBaseMobileList,
  useNewSelectorClose,
} from "../NewSelectorBase/NewSelectorBase";

import "./NewCollateralSelector.scss";
import { helperToast } from "lib/helperToast";
import { toast } from "react-toastify";

type Props = {
  selectedTokenAddress?: string;
  selectedTokenSymbol?: string;
  options: TokenData[] | undefined;
  disabledOptions?: TokenData[];
  onSelect: (tokenAddress: string) => void;
};

export function NewCollateralSelector(props: Props) {
  const isMobile = useMedia("(max-width: 1100px)");

  return (
    <NewSelectorBase label={props.selectedTokenSymbol} modalLabel={t`Select collateral`}>
      {isMobile ? <NewCollateralSelectorMobile {...props} /> : <NewCollateralSelectorDesktop {...props} />}
    </NewSelectorBase>
  );
}

function NewCollateralSelectorDesktop(props: Props) {
  const close = useNewSelectorClose();

  return (
    <table className="NewCollateralSelector-table">
      <thead>
        <tr>
          <th>
            <Trans>Token</Trans>
          </th>
        </tr>
      </thead>
      <tbody>
        {props.options?.map((option) => (
          <CollateralListItemDesktop
            key={option.address}
            isSelected={option.address === props.selectedTokenAddress}
            onSelect={() => {
              props.onSelect(option.address);
              close();
            }}
            tokenData={option}
          />
        ))}

        {props.disabledOptions?.map((option) => (
          <CollateralListItemDesktop
            key={option.address}
            isSelected={false}
            onSelect={noop}
            tokenData={option}
            disabled
          />
        ))}
      </tbody>
    </table>
  );
}

function CollateralListItemDesktop({
  tokenData,
  isSelected,
  onSelect,
  disabled,
}: {
  tokenData: TokenData;
  isSelected: boolean;
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
      <NewSelectorBaseDesktopRow
        isSelected={isSelected}
        disabled
        disabledMessage={<Trans>Select a pool containing {tokenData.symbol} to use it as collateral</Trans>}
      >
        <td className="NewCollateralSelector-column-pool">
          <TokenIcon
            symbol={tokenData.symbol}
            displaySize={24}
            importSize={24}
            className="NewCollateralSelector-collateral-logo-first"
          />
          <div>{tokenData.symbol}</div>
        </td>
      </NewSelectorBaseDesktopRow>
    );
  }

  return (
    <NewSelectorBaseDesktopRow isSelected={isSelected} onClick={handleClick}>
      <td className="NewCollateralSelector-column-pool">
        <TokenIcon
          symbol={tokenData.symbol}
          displaySize={24}
          importSize={24}
          className="NewCollateralSelector-collateral-logo-first"
        />
        <div>{tokenData.symbol}</div>
      </td>
    </NewSelectorBaseDesktopRow>
  );
}

function NewCollateralSelectorMobile(props: Props) {
  const close = useNewSelectorClose();

  return (
    <NewSelectorBaseMobileList>
      {props.options?.map((option) => (
        <CollateralListItemMobile
          key={option.address}
          isSelected={option.address === props.selectedTokenAddress}
          onSelect={() => {
            props.onSelect(option.address);
            close();
          }}
          tokenData={option}
        />
      ))}
      {props.disabledOptions?.map((option) => (
        <CollateralListItemMobile key={option.address} isSelected={false} onSelect={noop} tokenData={option} disabled />
      ))}
    </NewSelectorBaseMobileList>
  );
}

function CollateralListItemMobile({
  tokenData,
  isSelected,
  onSelect,
  disabled,
}: {
  tokenData: TokenData;
  isSelected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}) {
  const handleSelect = useCallback(() => {
    if (disabled) {
      helperToast.error(<Trans>Select a pool containing {tokenData.symbol} to use it as collateral</Trans>, {
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
    <NewSelectorBaseMobileButton isSelected={isSelected} onSelect={handleSelect} disabled={disabled}>
      <div className="NewCollateralSelector-column-pool">
        <TokenIcon
          symbol={tokenData.symbol}
          displaySize={24}
          importSize={24}
          className="NewCollateralSelector-collateral-logo-first"
        />
        <div>{tokenData.symbol}</div>
      </div>
    </NewSelectorBaseMobileButton>
  );
}
