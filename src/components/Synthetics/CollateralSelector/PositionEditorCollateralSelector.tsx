import { t } from "@lingui/macro";
import React, { useCallback, useEffect } from "react";
import { toast } from "react-toastify";
import { useMedia } from "react-use";

import { ContractsChainId } from "config/chains";
import type { TokenData } from "domain/synthetics/tokens/types";
import { formatBalanceAmount } from "lib/numbers";

import { TableTd } from "components/Table/Table";
import TokenIcon from "components/TokenIcon/TokenIcon";

import {
  SELECTOR_BASE_MOBILE_THRESHOLD,
  SelectorBase,
  SelectorBaseDesktopRow,
  SelectorBaseMobileButton,
  SelectorBaseMobileList,
  useSelectorClose,
} from "../SelectorBase/SelectorBase";

import "./CollateralSelector.scss";

type Props = {
  chainId: ContractsChainId;
  // eslint-disable-next-line react/no-unused-prop-types
  selectedTokenSymbol?: string;
  // eslint-disable-next-line react/no-unused-prop-types
  isCollateralTokenFromGmxAccount: boolean;
  options: TokenData[] | undefined;
  onSelect: (tokenAddress: string, isGmxAccount: boolean) => void;
  withBalance?: boolean;
};

export function PositionEditorCollateralSelector(props: Props) {
  const isMobile = useMedia(`(max-width: ${SELECTOR_BASE_MOBILE_THRESHOLD}px)`);

  return (
    <SelectorBase
      label={
        props.selectedTokenSymbol ? (
          <div className="flex items-center gap-8">
            <TokenIcon
              symbol={props.selectedTokenSymbol}
              displaySize={20}
              importSize={24}
              chainIdBadge={props.isCollateralTokenFromGmxAccount ? 0 : props.chainId}
            />
            {props.selectedTokenSymbol}
          </div>
        ) : (
          "..."
        )
      }
      modalLabel={t`Collateral In`}
      qa="collateral-in-selector"
    >
      {isMobile ? <CollateralSelectorMobile {...props} /> : <CollateralSelectorDesktop {...props} />}
    </SelectorBase>
  );
}

function CollateralSelectorDesktop(props: Props) {
  const close = useSelectorClose();

  return (
    <table className="CollateralSelector-table" data-qa="collateral-in-selector-table">
      <tbody>
        {props.options?.map((option) => (
          <CollateralListItemDesktop
            key={option.address}
            onSelect={() => {
              props.onSelect(option.address, Boolean(option.isGmxAccount));
              close();
            }}
            chainId={props.chainId}
            tokenData={option}
            withBalance={props.withBalance}
          />
        ))}
      </tbody>
    </table>
  );
}

function CollateralListItemDesktop({
  withBalance,
  chainId,
  tokenData,
  onSelect,
}: {
  withBalance?: boolean;
  chainId: ContractsChainId;
  tokenData: TokenData;
  onSelect: () => void;
}) {
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      onSelect();
    },
    [onSelect]
  );

  return (
    <SelectorBaseDesktopRow onClick={handleClick}>
      <TableTd
        padding={withBalance ? "compact" : "compact-one-column"}
        data-qa={`collateral-in-selector-row-${tokenData.symbol}`}
      >
        <div className="flex items-center gap-8">
          <TokenIcon
            symbol={tokenData.symbol}
            displaySize={28}
            importSize={24}
            chainIdBadge={tokenData.isGmxAccount ? 0 : chainId}
          />
          {tokenData.symbol}
        </div>
      </TableTd>
      {withBalance && (
        <TableTd padding="compact">
          {tokenData.balance !== undefined
            ? formatBalanceAmount(tokenData.balance, tokenData.decimals, undefined, {
                isStable: tokenData.isStable,
              })
            : "-"}
        </TableTd>
      )}
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
            props.onSelect(option.address, Boolean(option.isGmxAccount));
            close();
          }}
          chainId={props.chainId}
          tokenData={option}
          withBalance={props.withBalance}
        />
      ))}
    </SelectorBaseMobileList>
  );
}

function CollateralListItemMobile({
  withBalance,
  chainId,
  tokenData,
  onSelect,
}: {
  withBalance?: boolean;
  chainId: ContractsChainId;
  tokenData: TokenData;
  onSelect: () => void;
}) {
  const handleSelect = useCallback(() => {
    onSelect();
  }, [onSelect]);

  useEffect(() => {
    const symbol = tokenData.symbol;
    return () => {
      toast.dismiss(`error-collateral-${symbol}`);
    };
  }, [tokenData.symbol]);

  return (
    <SelectorBaseMobileButton onSelect={handleSelect}>
      <div className="CollateralSelector-mobile-column-pool" data-qa={`collateral-in-selector-row-${tokenData.symbol}`}>
        <TokenIcon
          symbol={tokenData.symbol}
          displaySize={28}
          importSize={24}
          chainIdBadge={tokenData.isGmxAccount ? 0 : chainId}
        />
        <div>{tokenData.symbol}</div>
      </div>
      {withBalance &&
        (tokenData.balance !== undefined
          ? formatBalanceAmount(tokenData.balance, tokenData.decimals, undefined, {
              isStable: tokenData.isStable,
            })
          : "-")}
    </SelectorBaseMobileButton>
  );
}
