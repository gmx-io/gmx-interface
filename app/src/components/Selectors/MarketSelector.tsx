import SearchInput from '@/components/Common/Input/SearchInput';
import {
  SELECTOR_BASE_MOBILE_THRESHOLD,
  SelectorBase,
  SelectorBaseDesktopRow,
  SelectorBaseMobileList,
  useSelectorClose,
} from '@/components/Common/SelectorBase/SelectorBase';
import {
  TableTd,
  TableTh,
  TableTheadTr,
} from '@/components/Common/Table/Table';
import TokenIcon from '@/components/Common/TokenIcon/TokenIcon';
import { BN_ZERO } from '@/config/constants';
import { useIndexTokensDataForMarketSelector } from '@/hooks/marketHooks/useIndexTokensDataForMarketSelector';
import { MarketInfo } from '@/selectors/market/types';
import { TokensData } from '@/selectors/token/types';
import { convertTokenAmountToUsd } from '@/utils/legacy/convert';
import { formatPercentage, formatUsd } from '@/utils/legacy/format';
import { getByKey } from '@/utils/lib/object';
import { searchBy } from '@/utils/lib/searchBy';
import { getMarketIndexName } from '@/utils/market/getMarketIndexName';
import { stripBlacklistedWords } from '@/utils/token/stripBlacklistedWords';
import { BN } from '@coral-xyz/anchor';
import { t } from '@lingui/macro';
import classNames from 'classnames';
import {
  KeyboardEventHandler,
  ReactNode,
  useCallback,
  useMemo,
  useState,
} from 'react';
import { useMedia } from 'react-use';
import { useAppStore } from '@/zustand/useAppStore';
import { selectChartToken } from '@/selectors/chart/selectChartToken';

type Props = {
  label?: string;
  className?: string;
  selectedIndexName?: string;
  markets: MarketInfo[];
  marketTokensData?: TokensData;
  showBalances?: boolean;
  selectedMarketLabel?: ReactNode | string;
  footerContent?: ReactNode;
  getMarketState?: (market: MarketInfo) => MarketState | undefined;
  onSelectMarket: (indexName: string, market: MarketInfo) => void;
  size?: 'l' | 'm';
  showIcon?: boolean;
};

type MarketState = {
  disabled?: boolean;
  message?: string;
};

type MarketOption = {
  indexName: string;
  marketInfo: MarketInfo;
  balance: BN;
  balanceUsd: BN;
  state?: MarketState;
  lastPrice?: BN;
  change24h?: number;
  marketTokensData: TokensData;
};

export function MarketSelectorContent({
  markets,
  marketTokensData,
  showBalances,
  footerContent,
  onSelectMarket,
  getMarketState,
}: Props) {
  const [searchKeyword, setSearchKeyword] = useState('');
  const isMobile = useMedia(`(max-width: ${SELECTOR_BASE_MOBILE_THRESHOLD}px)`);

  const { indexTokenData } = useIndexTokensDataForMarketSelector({
    searchKeyword,
    sortField: null,
    sortDirection: 'desc',
    isMobile,
  });

  const marketsOptions: MarketOption[] = useMemo(() => {
    const optionsByIndexName: { [indexName: string]: MarketOption } = {};

    markets
      .filter((market) => !market.isDisabled)
      .forEach((marketInfo) => {
        const indexName = getMarketIndexName(marketInfo);
        const marketToken = getByKey(
          marketTokensData,
          marketInfo.marketTokenAddress.toBase58()
        );

        const tokenData = indexTokenData.find(
          (data) => data.indexToken.symbol === marketInfo.indexToken.symbol
        );

        const gmBalance = marketToken?.balance;
        const gmBalanceUsd = convertTokenAmountToUsd(
          marketToken?.balance ?? BN_ZERO,
          marketToken?.decimals,
          marketToken?.prices.minPrice
        );
        const state = getMarketState?.(marketInfo);
        const lastPrice = tokenData?.lastPrice;
        const change24h = tokenData?.change24h || 0;

        const option = optionsByIndexName[indexName];

        if (option) {
          option.balance = option.balance.add(gmBalance || BN_ZERO);
          option.balanceUsd = option.balanceUsd.add(gmBalanceUsd || BN_ZERO);
        }

        optionsByIndexName[indexName] = optionsByIndexName[indexName] || {
          indexName,
          marketInfo,
          balance: gmBalance || BN_ZERO,
          balanceUsd: gmBalanceUsd || BN_ZERO,
          state,
          lastPrice,
          change24h,
        };
      });

    return Object.values(optionsByIndexName);
  }, [getMarketState, marketTokensData, markets, indexTokenData]);

  const filteredOptions = useMemo(() => {
    const textMatched = searchKeyword.trim()
      ? searchBy(
          marketsOptions,
          [
            'indexName',
            (item) =>
              item.marketInfo.isSpotOnly
                ? ''
                : stripBlacklistedWords(item.marketInfo.indexToken.symbol),
          ],
          searchKeyword
        )
      : marketsOptions;

    return textMatched;
  }, [marketsOptions, searchKeyword]);

  const _handleKeyDown: KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter' && filteredOptions.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      const option = filteredOptions[0];
      onSelectMarket(option.indexName, option.marketInfo);
    }
  };

  return (
    <>
      <div className={`${isMobile ? 'px-5 pt-0' : 'px-10 pt-10'}`}>
        <SearchInput
          className="*:!text-body-medium mb-0"
          value={searchKeyword}
          setValue={setSearchKeyword}
          placeholder={t`Search Market`}
          onKeyDown={_handleKeyDown}
        />
      </div>
      {isMobile ? (
        <MarketSelectorMobile
          filteredOptions={filteredOptions}
          onSelectMarket={onSelectMarket}
        />
      ) : (
        <MarketSelectorDesktop
          filteredOptions={filteredOptions}
          showBalances={showBalances}
          marketTokensData={marketTokensData}
          onSelectMarket={onSelectMarket}
        />
      )}
      {footerContent}
    </>
  );
}
export function MarketSelector({
  label,
  markets,
  marketTokensData,
  showBalances,
  footerContent,
  onSelectMarket,
  getMarketState,
  showIcon = true,
}: Props) {
  const chartToken = useAppStore(selectChartToken);

  return (
    <SelectorBase
      label={
        <div className="flex items-center gap-2">
          {showIcon && chartToken && (
            <TokenIcon
              symbol={chartToken?.symbol}
              displaySize={20}
              importSize={40}
              className="relative overflow-hidden rounded-full"
            />
          )}
          <span>{chartToken?.symbol || '...'}</span>
        </div>
      }
      modalLabel={label || t`Select Market`}
      qa="market-selector"
      popoverXOffset={10}
      popoverYOffset={10}
      chevronStyle="compact"
      chevronSize={20}
    >
      <MarketSelectorContent
        markets={markets}
        showBalances={showBalances}
        footerContent={footerContent}
        marketTokensData={marketTokensData}
        onSelectMarket={onSelectMarket}
        getMarketState={getMarketState}
      />
    </SelectorBase>
  );
}

function MarketSelectorDesktop({
  filteredOptions,
  onSelectMarket,
}: {
  filteredOptions: MarketOption[];
  showBalances?: boolean;
  marketTokensData?: TokensData;
  onSelectMarket: (indexName: string, market: MarketInfo) => void;
}) {
  const close = useSelectorClose();

  return (
    <table className="text-body-medium w-full" data-qa="market-selector-table">
      <thead>
        <TableTheadTr>
          <TableTh className="text-body-medium flex items-center gap-2">{t`Market`}</TableTh>
          <TableTh className="text-body-medium text-left">{t`Last Price`}</TableTh>
          <TableTh className="text-body-medium text-right">{t`24H%`}</TableTh>
        </TableTheadTr>
      </thead>
      <tbody>
        {filteredOptions.map((option) => (
          <MarketListItemDesktop
            key={option.marketInfo.marketTokenAddress.toBase58()}
            option={option}
            onSelect={() => {
              onSelectMarket(option.indexName, option.marketInfo);
              close();
            }}
          />
        ))}
      </tbody>
    </table>
  );
}

function MarketListItemDesktop({
  option,
  onSelect,
}: {
  option: MarketOption;
  onSelect: () => void;
}) {
  const handleClick = useCallback(() => {
    if (option.state?.disabled) {
      return;
    }
    onSelect();
  }, [onSelect, option.state?.disabled]);

  return (
    <SelectorBaseDesktopRow
      onClick={handleClick}
      className="hover:bg-dark-blue-100 active:bg-dark-blue-200"
      disabled={option.state?.disabled}
      disabledMessage={option.state?.message}
    >
      <TableTd className="text-body-medium flex items-center gap-2">
        <TokenIcon
          symbol={option.marketInfo.indexToken.symbol}
          displaySize={20}
          importSize={40}
          className="relative overflow-hidden rounded-full"
        />
        <div>{option.indexName}</div>
      </TableTd>
      <TableTd className="text-body-medium text-left">
        {option.lastPrice ? formatUsd(option.lastPrice) : 'N/A'}
      </TableTd>
      <TableTd className="text-body-medium text-right">
        <span
          className={classNames({
            'text-green-500': option.change24h && option.change24h > 0,
            'text-red-500': option.change24h && option.change24h < 0,
          })}
        >
          {option.change24h
            ? formatPercentage(option.change24h, 2, { signed: true })
            : 'N/A'}
        </span>
      </TableTd>
    </SelectorBaseDesktopRow>
  );
}

function MarketSelectorMobile({
  filteredOptions,
  onSelectMarket,
}: {
  filteredOptions: MarketOption[];
  onSelectMarket: (indexName: string, market: MarketInfo) => void;
}) {
  const close = useSelectorClose();

  return (
    <SelectorBaseMobileList>
      <div className="text-body-medium mt-5 grid h-[30px] grid-cols-[2fr_1fr_1fr] items-center gap-2 px-5 text-slate-300">
        <div className="text-left">{t`Market`}</div>
        <div className="text-left">{t`Last Price`}</div>
        <div className="text-right">{t`24H%`}</div>
      </div>
      {filteredOptions.map((option) => (
        <div
          key={option.marketInfo.marketTokenAddress.toBase58()}
          className="text-body-medium hover:bg-dark-blue-100 active:bg-dark-blue-200 rounded-4 grid cursor-pointer grid-cols-[2fr_1fr_1fr] items-center gap-2 p-5"
          onClick={() => {
            if (!option.state?.disabled) {
              onSelectMarket(option.indexName, option.marketInfo);
              close();
            }
          }}
        >
          <div className="flex items-center gap-2">
            <TokenIcon
              symbol={option.marketInfo.indexToken.symbol}
              displaySize={20}
              importSize={40}
              className="relative overflow-hidden rounded-full"
            />
            <div>{option.indexName}</div>
          </div>
          <div className="text-left">
            {option.lastPrice ? formatUsd(option.lastPrice) : 'N/A'}
          </div>
          <div className="text-right">
            <span
              className={classNames({
                'text-green-500': option.change24h && option.change24h > 0,
                'text-red-500': option.change24h && option.change24h < 0,
              })}
            >
              {option.change24h
                ? formatPercentage(option.change24h, 2, { signed: true })
                : 'N/A'}
            </span>
          </div>
        </div>
      ))}
    </SelectorBaseMobileList>
  );
}
