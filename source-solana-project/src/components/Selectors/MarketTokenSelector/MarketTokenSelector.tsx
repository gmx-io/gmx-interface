import { AprInfo } from '@/components/Common/AprInfo/AprInfo';
import SearchInput from '@/components/Common/Input/SearchInput';
import { Sorter } from '@/components/Common/Sorter/Sorter';
import { useSorterHandlers } from '@/components/Common/Sorter/useSorterHandlers';
import {
  Table,
  TableTd,
  TableTh,
  TableTheadTr,
  TableTr,
} from '@/components/Common/Table/Table';
import TokenIcon from '@/components/Common/TokenIcon/TokenIcon';
import { useFilterSortTokensInfo } from '@/components/Selectors/MarketTokenSelector/useFilterSortTokensInfo';
import {
  SELECTOR_BASE_MOBILE_THRESHOLD,
  SelectorBase,
  SelectorBaseDesktopRow,
  SelectorBaseMobileList,
  useSelectorClose,
} from '@/components/Common/SelectorBase/SelectorBase';
import { USD_DECIMALS } from '@/config/constants';
import { useSortedPoolsWithIndexToken } from '@/hooks/marketHooks/useSortedPoolsWithIndexToken';
import { GlvAndGmMarketsInfo, GlvOrMarketInfo } from '@/selectors/glv/types';
import { MarketsInfo, MarketTokensAPR } from '@/selectors/market/types';
import { TokenData, TokensData } from '@/selectors/token/types';
import { getGlvDisplayName } from '@/utils/glv/getGlvDisplayName';
import { getGlvMarketShortening } from '@/utils/glv/getGlvMarketShortening';
import { getGlvMarketSubtitle } from '@/utils/glv/getGlvMarketSubtitle';
import { getGlvMintableInfo } from '@/utils/glv/getGlvMintableInfo';
import { getGlvOrMarketAddress } from '@/utils/glv/getGlvOrMarketAddress';
import { getGlvSellableInfo } from '@/utils/glv/getGlvSellableInfo';
import { isGlvInfo } from '@/utils/glv/isGlvInfo';
import { getGmMintableMarketToken } from '@/utils/gm/getGmMintableMarketToken';
import { getGmSellableMarketToken } from '@/utils/gm/getGmSellableMarketToken';
import {
  formatAmountHuman,
  formatTokenAmount,
  formatUsd,
} from '@/utils/legacy/format';
import { getMarketIndexName } from '@/utils/market/getMarketIndexName';
import { getMarketPoolName } from '@/utils/market/getMarketPoolName';
import { getNormalizedTokenSymbol } from '@/utils/token/getNormalizedTokenSymbol';
import { BN } from '@coral-xyz/anchor';
import { t, Trans } from '@lingui/macro';
import { useCallback, useState } from 'react';
import { useMedia } from 'react-use';

export type SortField = 'buyable' | 'sellable' | 'apy' | 'unspecified';

type Props = {
  setSelectedMarketTokenOrGlvTokenAddress: (address?: string) => void;
  glvAndMarketsInfoData?: GlvAndGmMarketsInfo;
  marketsInfoData?: MarketsInfo;
  glvAndMarketTokensData?: TokensData;
  glvTokensApyData?: MarketTokensAPR;
  marketTokensAprData?: MarketTokensAPR;
  currentGlvOrMarketInfo?: GlvOrMarketInfo;
};

export default function MarketTokenSelector(props: Props) {
  const {
    setSelectedMarketTokenOrGlvTokenAddress,
    glvAndMarketsInfoData,
    marketsInfoData,
    glvAndMarketTokensData,
    marketTokensAprData,
    glvTokensApyData,
    currentGlvOrMarketInfo,
  } = props;

  const indexName =
    currentGlvOrMarketInfo && getMarketIndexName(currentGlvOrMarketInfo);
  const poolName =
    currentGlvOrMarketInfo && getMarketPoolName(currentGlvOrMarketInfo);

  const isGlv = currentGlvOrMarketInfo && isGlvInfo(currentGlvOrMarketInfo);

  const iconName = currentGlvOrMarketInfo?.isSpotOnly
    ? getNormalizedTokenSymbol(currentGlvOrMarketInfo.longToken.symbol) +
      getNormalizedTokenSymbol(currentGlvOrMarketInfo.shortToken.symbol)
    : isGlv
      ? currentGlvOrMarketInfo?.glvToken.symbol
      : currentGlvOrMarketInfo?.indexToken.symbol;

  const selectorLabel = (
    <div className="inline-flex items-center">
      {currentGlvOrMarketInfo ? (
        <>
          <TokenIcon
            symbol={iconName || ''}
            displaySize={30}
            importSize={40}
            badge={
              isGlv
                ? getGlvMarketShortening(
                    getGlvOrMarketAddress(currentGlvOrMarketInfo) ?? ''
                  )
                : ([
                    currentGlvOrMarketInfo.longToken.symbol,
                    currentGlvOrMarketInfo.shortToken.symbol,
                  ] as const)
            }
          />
          <div className="ml-16">
            <div className="text-body-medium flex items-center">
              {isGlv ? (
                <span>{getGlvDisplayName(currentGlvOrMarketInfo)}</span>
              ) : (
                <span>GM{indexName && `: ${indexName}`}</span>
              )}
              <span className="text-12 ml-3 text-gray-300 group-hover/selector-base:text-[color:inherit]">
                {poolName && `[${poolName}]`}
              </span>
            </div>
            <div className="text-12 text-gray-400 group-hover/selector-base:text-[color:inherit]">
              {isGlv
                ? getGlvMarketSubtitle(
                    getGlvOrMarketAddress(currentGlvOrMarketInfo) ?? ''
                  )
                : 'GMX Market Tokens'}
            </div>
          </div>
        </>
      ) : (
        '...'
      )}
    </div>
  );

  return (
    <SelectorBase
      label={selectorLabel}
      modalLabel={t`GMX Market Tokens`}
      popoverXOffset={-10}
      popoverYOffset={10}
      popoverPlacement="bottom-start"
      chevronClassName="!-mt-1 self-start"
      mobileModalContentPadding={true}
    >
      <MarketTokenSelectorInternal
        setSelectedMarketTokenOrGlvTokenAddress={
          setSelectedMarketTokenOrGlvTokenAddress
        }
        marketTokensAprData={marketTokensAprData}
        marketsInfoData={marketsInfoData}
        glvAndMarketsInfoData={glvAndMarketsInfoData}
        glvAndMarketTokensData={glvAndMarketTokensData}
        currentGlvOrMarketInfo={currentGlvOrMarketInfo}
        glvTokensApyData={glvTokensApyData}
      />
    </SelectorBase>
  );
}

function MarketTokenSelectorInternal(props: Props) {
  const {
    setSelectedMarketTokenOrGlvTokenAddress,
    glvAndMarketsInfoData,
    glvAndMarketTokensData,
    marketTokensAprData,
    glvTokensApyData,
    marketsInfoData,
  } = props;

  const isMobile = useMedia(`(max-width: ${SELECTOR_BASE_MOBILE_THRESHOLD}px)`);
  const isExtraSmall = useMedia('(max-width: 560px)');

  const { markets: sortedMarketsByIndexToken } = useSortedPoolsWithIndexToken(
    glvAndMarketsInfoData,
    glvAndMarketTokensData
  );

  const [searchKeyword, setSearchKeyword] = useState('');
  const { orderBy, direction, getSorterProps } = useSorterHandlers<SortField>();

  const handleSearchChange = (value: string) => {
    setSearchKeyword(value);
  };

  const sortedTokensInfo = useFilterSortTokensInfo({
    sortedMarketsByIndexToken,
    searchKeyword,
    marketsInfoData,
    glvAndMarketsInfoData,
    marketTokensAprData,
    glvTokensApyData,
    orderBy,
    direction,
    glvAndMarketTokensData,
  });

  const close = useSelectorClose();

  const handleSelectToken = useCallback(
    (marketTokenAddress: string) => {
      setSelectedMarketTokenOrGlvTokenAddress(marketTokenAddress);
      close();
    },
    [close, setSelectedMarketTokenOrGlvTokenAddress]
  );

  return (
    <>
      <div className={`${isMobile ? 'px-0 pt-0' : 'px-10 pt-10'}`}>
        <SearchInput
          className="*:!text-body-medium mb-0"
          value={searchKeyword}
          setValue={handleSearchChange}
          placeholder={t`Search Market`}
        />
      </div>

      {isMobile ? (
        <MarketTokenSelectorMobile
          sortedTokensInfo={sortedTokensInfo}
          handleSelectToken={handleSelectToken}
          isExtraSmall={isExtraSmall}
        />
      ) : (
        <MarketTokenSelectorDesktop
          sortedTokensInfo={sortedTokensInfo}
          getSorterProps={getSorterProps}
          handleSelectToken={handleSelectToken}
          isExtraSmall={isExtraSmall}
        />
      )}
    </>
  );
}

function MarketTokenSelectorDesktop({
  sortedTokensInfo,
  getSorterProps,
  handleSelectToken,
  isExtraSmall,
}: {
  sortedTokensInfo: ReturnType<typeof useFilterSortTokensInfo>;
  getSorterProps: ReturnType<
    typeof useSorterHandlers<SortField>
  >['getSorterProps'];
  handleSelectToken: (address: string) => void;
  isExtraSmall: boolean;
}) {
  return (
    <Table className="text-body-medium w-full">
      <thead>
        <TableTheadTr>
          <TableTh className="text-body-medium">
            <Trans>POOL</Trans>
          </TableTh>
          <TableTh className="text-body-medium">
            <Sorter {...getSorterProps('buyable')}>
              {isExtraSmall ? <Trans>BUY</Trans> : <Trans>BUYABLE</Trans>}
            </Sorter>
          </TableTh>
          <TableTh className="text-body-medium">
            <Sorter {...getSorterProps('sellable')}>
              {isExtraSmall ? <Trans>SELL</Trans> : <Trans>SELLABLE</Trans>}
            </Sorter>
          </TableTh>
          <TableTh className="text-body-medium">
            <Sorter {...getSorterProps('apy')}>
              <Trans>APY</Trans>
            </Sorter>
          </TableTh>
        </TableTheadTr>
      </thead>
      <tbody>
        {sortedTokensInfo.map((option) => (
          <MarketTokenListItemDesktop
            key={option.market.address.toBase58()}
            {...option}
            handleSelectToken={handleSelectToken}
          />
        ))}
        {sortedTokensInfo.length === 0 && (
          <TableTr hoverable={false} bordered={false}>
            <TableTd colSpan={6} className="text-body-medium text-gray-400">
              <Trans>No pools matched.</Trans>
            </TableTd>
          </TableTr>
        )}
      </tbody>
    </Table>
  );
}

function MarketTokenListItemDesktop({
  glvOrMarketInfo,
  market,
  handleSelectToken,
  mintableInfo,
  sellableInfo,
  indexName,
  poolName,
  apr,
}: {
  glvOrMarketInfo: GlvOrMarketInfo;
  market: TokenData;
  handleSelectToken: (address: string) => void;
  mintableInfo: ReturnType<
    typeof getGmMintableMarketToken | typeof getGlvMintableInfo
  >;
  sellableInfo: ReturnType<
    typeof getGmSellableMarketToken | typeof getGlvSellableInfo
  >;
  indexName?: string;
  poolName?: string;
  apr: BN | undefined;
}) {
  const { longToken, shortToken } = glvOrMarketInfo;
  const iconName = glvOrMarketInfo?.isSpotOnly
    ? getNormalizedTokenSymbol(longToken?.symbol ?? '') +
      getNormalizedTokenSymbol(shortToken?.symbol ?? '')
    : getNormalizedTokenSymbol(
        isGlvInfo(glvOrMarketInfo)
          ? (glvOrMarketInfo?.glvToken.symbol ?? '')
          : (glvOrMarketInfo?.indexToken.symbol ?? '')
      );

  const handleSelect = useCallback(
    () => handleSelectToken(market.address.toBase58()),
    [handleSelectToken, market.address]
  );

  const formattedMintableUsd = formatUsd(mintableInfo?.mintableUsd, {
    displayDecimals: 0,
    fallbackToZero: true,
  });

  const formattedSellableAmount = formatTokenAmount(
    sellableInfo?.totalAmount,
    market?.decimals,
    market?.symbol,
    {
      displayDecimals: 0,
      useCommas: true,
    }
  );

  return (
    <SelectorBaseDesktopRow
      onClick={handleSelect}
      className="hover:bg-dark-blue-100 active:bg-dark-blue-200"
    >
      <TableTd className="text-body-medium">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <TokenIcon
              symbol={iconName}
              displaySize={20}
              importSize={24}
              className="relative overflow-hidden rounded-full"
            />
            <span className="text-body-medium text-white">{indexName}</span>
          </div>
          {poolName && (
            <div className="text-body-small text-gray-300">[{poolName}]</div>
          )}
        </div>
      </TableTd>
      <TableTd className="text-body-medium">{formattedMintableUsd}</TableTd>
      <TableTd className="text-body-medium">{formattedSellableAmount}</TableTd>
      <TableTd className="text-body-medium">
        <AprInfo apr={apr} showTooltip={false} />
      </TableTd>
    </SelectorBaseDesktopRow>
  );
}

function MarketTokenSelectorMobile({
  sortedTokensInfo,
  handleSelectToken,
  isExtraSmall,
}: {
  sortedTokensInfo: ReturnType<typeof useFilterSortTokensInfo>;
  handleSelectToken: (address: string) => void;
  isExtraSmall: boolean;
}) {
  const close = useSelectorClose();

  const handleSelect = (marketAddress: string) => {
    handleSelectToken(marketAddress);
    close();
  };

  const gridColsClass = isExtraSmall
    ? 'grid-cols-[3fr_1fr_1fr]'
    : 'grid-cols-[3fr_1fr_1fr_1fr]';

  return (
    <div className="animate-slide-up">
      <SelectorBaseMobileList>
        <div
          className={`text-body-medium mt-5 grid h-[30px] ${gridColsClass} items-center gap-2 px-5 text-slate-300`}
        >
          <div className="text-left">
            <Trans>MARKET</Trans>
          </div>
          <div className="text-left">
            <Trans>BUY</Trans>
          </div>
          {!isExtraSmall && (
            <div className="text-right">
              <Trans>SELL</Trans>
            </div>
          )}
          <div className="text-right">
            <Trans>APY</Trans>
          </div>
        </div>

        {sortedTokensInfo.map((option) => {
          const {
            market,
            glvOrMarketInfo,
            mintableInfo,
            sellableInfo,
            indexName,
            poolName,
            apr,
          } = option;
          const { longToken, shortToken } = glvOrMarketInfo;

          const iconName = glvOrMarketInfo?.isSpotOnly
            ? getNormalizedTokenSymbol(longToken?.symbol ?? '') +
              getNormalizedTokenSymbol(shortToken?.symbol ?? '')
            : getNormalizedTokenSymbol(
                isGlvInfo(glvOrMarketInfo)
                  ? (glvOrMarketInfo?.glvToken.symbol ?? '')
                  : (glvOrMarketInfo?.indexToken.symbol ?? '')
              );

          const formattedMintableUsd = formatAmountHuman(
            mintableInfo?.mintableUsd,
            USD_DECIMALS,
            true
          );

          const formattedSellableAmount = formatAmountHuman(
            sellableInfo?.totalAmount,
            market?.decimals,
            true
          );

          return (
            <div
              key={market.address.toBase58()}
              className={`text-body-medium hover:bg-dark-blue-100 active:bg-dark-blue-200 rounded-4 grid cursor-pointer ${gridColsClass} items-center gap-2 p-5`}
              onClick={() => handleSelect(market.address.toBase58())}
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
                  <TokenIcon
                    symbol={iconName}
                    displaySize={20}
                    importSize={24}
                    className="relative overflow-hidden rounded-full"
                  />
                  <span className="overflow-hidden text-ellipsis font-medium">
                    {indexName}
                  </span>
                </div>
                {poolName && (
                  <div className="text-body-small text-gray-300 text-slate-300">
                    [{poolName}]
                  </div>
                )}
              </div>
              <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                {formattedMintableUsd}
              </div>
              {!isExtraSmall && (
                <div className="overflow-hidden text-ellipsis whitespace-nowrap text-right">
                  {formattedSellableAmount}
                </div>
              )}
              <div className="text-right">
                <AprInfo apr={apr} showTooltip={false} />
              </div>
            </div>
          );
        })}
      </SelectorBaseMobileList>
    </div>
  );
}
