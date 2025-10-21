import { t, Trans } from "@lingui/macro";
import React, { useCallback, useEffect } from "react";
import { toast } from "react-toastify";
import { useMedia } from "react-use";

import { ContractsChainId, getChainName } from "config/chains";
import { getChainIcon } from "config/icons";
import type { TokenData } from "domain/synthetics/tokens/types";
import { formatBalanceAmount } from "lib/numbers";
import { TokenBalanceType } from "sdk/types/tokens";

import { TableTd } from "components/Table/Table";
import TokenIcon from "components/TokenIcon/TokenIcon";

import ArrowRightIcon from "img/ic_arrow_right.svg?react";

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
  variant?: "balance" | "destination";
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
            key={`${option.address}-${option.balanceType}`}
            onSelect={() => {
              props.onSelect(option.address, option.balanceType === TokenBalanceType.GmxAccount);
              close();
            }}
            chainId={props.chainId}
            tokenData={option}
            variant={props.variant}
          />
        ))}
      </tbody>
    </table>
  );
}

function CollateralListItemDesktop({
  variant,
  chainId,
  tokenData,
  onSelect,
}: {
  variant?: "balance" | "destination";
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
        padding={variant === "balance" ? "compact" : "compact-one-column"}
        data-qa={`collateral-in-selector-row-${tokenData.symbol}`}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-6">
            <TokenIcon
              symbol={tokenData.symbol}
              displaySize={variant === "destination" ? 16 : 28}
              importSize={24}
              chainIdBadge={
                variant === "destination"
                  ? undefined
                  : tokenData.balanceType === TokenBalanceType.GmxAccount
                    ? 0
                    : chainId
              }
            />
            {tokenData.symbol}
          </div>

          {variant === "destination" && (
            <>
              <ArrowRightIcon className="text-slate-100" />
              <div className="flex items-center gap-4">
                <img
                  src={getChainIcon(tokenData.balanceType === TokenBalanceType.GmxAccount ? 0 : chainId)}
                  alt={getChainName(tokenData.balanceType === TokenBalanceType.GmxAccount ? 0 : chainId)}
                  className="size-16"
                />
                {tokenData.balanceType === TokenBalanceType.GmxAccount ? (
                  <Trans>GMX Balance</Trans>
                ) : (
                  getChainName(chainId)
                )}
              </div>
            </>
          )}
        </div>
      </TableTd>
      {variant === "balance" && (
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
          key={`${option.address}-${option.balanceType}`}
          onSelect={() => {
            props.onSelect(option.address, option.balanceType === TokenBalanceType.GmxAccount);
            close();
          }}
          chainId={props.chainId}
          tokenData={option}
          variant={props.variant}
        />
      ))}
    </SelectorBaseMobileList>
  );
}

function CollateralListItemMobile({
  variant,
  chainId,
  tokenData,
  onSelect,
}: {
  variant?: "balance" | "destination";
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
          chainIdBadge={tokenData.balanceType === TokenBalanceType.GmxAccount ? 0 : chainId}
        />
        <div>{tokenData.symbol}</div>
      </div>
      {variant === "balance" &&
        (tokenData.balance !== undefined
          ? formatBalanceAmount(tokenData.balance, tokenData.decimals, undefined, {
              isStable: tokenData.isStable,
            })
          : "-")}
    </SelectorBaseMobileButton>
  );
}
