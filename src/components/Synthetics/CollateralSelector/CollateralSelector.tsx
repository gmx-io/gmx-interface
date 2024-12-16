import { Trans, t } from "@lingui/macro";
import noop from "lodash/noop";
import React, { useCallback, useEffect } from "react";
import { toast } from "react-toastify";
import { useMedia } from "react-use";

import {
  selectTradeboxMarketInfo,
  selectTradeboxTradeType,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import type { MarketInfo } from "domain/synthetics/markets";
import type { TokenData } from "domain/synthetics/tokens/types";
import type { TradeType } from "domain/synthetics/trade";
import { helperToast } from "lib/helperToast";
import { getCollateralInHintText } from "../TradeBox/hooks/useCollateralInTooltipContent";

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
  // eslint-disable-next-line react/no-unused-prop-types
  selectedTokenSymbol?: string;
  options: TokenData[] | undefined;
  disabledOptions?: TokenData[];
  onSelect: (tokenAddress: string) => void;
};

export function CollateralSelector(props: Props & { marketInfo?: MarketInfo; tradeType: TradeType }) {
  const isMobile = useMedia(`(max-width: ${SELECTOR_BASE_MOBILE_THRESHOLD}px)`);

  return (
    <SelectorBase label={props.selectedTokenSymbol} modalLabel={t`Collateral In`} qa="collateral-in-selector">
      {isMobile ? (
        <CollateralSelectorMobile {...props} />
      ) : (
        <CollateralSelectorDesktop {...props} tradeType={props.tradeType} marketInfo={props.marketInfo} />
      )}
    </SelectorBase>
  );
}

function CollateralSelectorDesktop(props: Props & { tradeType: TradeType; marketInfo?: MarketInfo }) {
  const close = useSelectorClose();

  return (
    <table className="CollateralSelector-table" data-qa="collateral-in-selector-table">
      <tbody>
        {props.options?.map((option) => (
          <CollateralListItemDesktop
            tradeType={props.tradeType}
            key={option.address}
            onSelect={() => {
              props.onSelect(option.address);
              close();
            }}
            tokenData={option}
            marketInfo={props.marketInfo}
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
  tradeType,
  marketInfo,
}: {
  tokenData: TokenData;
  onSelect: () => void;
  disabled?: boolean;
  tradeType?: TradeType;
  marketInfo?: MarketInfo;
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
        <TableTd padding="compact-one-column" data-qa={`collateral-in-selector-row-${tokenData.symbol}`}>
          {tokenData.symbol}
        </TableTd>
      </SelectorBaseDesktopRow>
    );
  }

  return (
    <SelectorBaseDesktopRow
      message={marketInfo && tradeType ? getCollateralInHintText(tradeType, tokenData, marketInfo) : undefined}
      onClick={handleClick}
    >
      <TableTd padding="compact-one-column" data-qa={`collateral-in-selector-row-${tokenData.symbol}`}>
        {tokenData.symbol}
      </TableTd>
    </SelectorBaseDesktopRow>
  );
}

function CollateralSelectorMobile(props: Props) {
  const close = useSelectorClose();
  const marketInfo = useSelector(selectTradeboxMarketInfo);
  const tradeType = useSelector(selectTradeboxTradeType);

  return (
    <SelectorBaseMobileList>
      {props.options?.map((option) => {
        const description = marketInfo ? getCollateralInHintText(tradeType, option, marketInfo) : "";

        return (
          <>
            <CollateralListItemMobile
              key={option.address}
              onSelect={() => {
                props.onSelect(option.address);
                close();
              }}
              tokenData={option}
            />
            <p className="text-body-small text-gray-500 last:mb-0">{description}</p>
          </>
        );
      })}
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
      <div className="CollateralSelector-mobile-column-pool" data-qa={`collateral-in-selector-row-${tokenData.symbol}`}>
        <TokenIcon symbol={tokenData.symbol} displaySize={28} importSize={24} />
        <div>{tokenData.symbol}</div>
      </div>
    </SelectorBaseMobileButton>
  );
}
