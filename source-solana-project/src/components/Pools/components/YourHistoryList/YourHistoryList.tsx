import './YourHistoryList.scss';

import ExternalLink from '@/components/Common/Link/ExternalLink';
import { BottomTablePagination } from '@/components/Common/Pagination/BottomTablePagination';
import {
  Table,
  TableTd,
  TableTh,
  TableTheadTr,
  TableTr,
} from '@/components/Common/Table/Table';
import { TableScrollFadeContainer } from '@/components/Common/Table/TableScrollFade/TableScrollFade';
import { formatMarketName } from '@/components/TradeBoxNew/utils/formatMarketName';
import { GM_DECIMALS, USD_DECIMALS } from '@/config/constants';
import { GMX_SOLANA_TOKENS_RAW } from '@/config/program';
import {
  GM_GLV_HISTORY_PER_PAGE,
  GmGlvHistoryItem,
  GmGlvHistoryScope,
  useGmGlvHistoryData,
} from '@/hooks/statsHooks/useGmGlvHistoryData';
import externalIcon from '@/img/external.svg';
import { getGlvDisplayNameByTokenAddress } from '@/utils/glv/getGlvDisplayName';
import {
  formatAmount,
  formatTimestampNow,
  formatUsd,
} from '@/utils/legacy/format';
import { getTransactionUrl } from '@/utils/lib/explorerNew';
import { getIconUrlPath } from '@/utils/lib/icon';
import { useLocalizedMap } from '@/utils/lib/i18n';
import LoadingComponent from '@/utils/LoadingComponent';
import { useMarkets } from '@/components/Pools/Hooks/useMarkets';
import { BN } from '@coral-xyz/anchor';
import { msg, Trans } from '@lingui/macro';
import classNames from 'classnames';
import { useEffect, useMemo, useState } from 'react';
import { useMedia } from 'react-use';

const PRICE_DECIMALS = USD_DECIMALS - GM_DECIMALS;

type PoolType = 'GLV' | 'GM';

const HISTORY_LABELS = {
  CurrentGlv: msg`Current GLV`,
  CurrentGm: msg`Current GM`,
  AllGlvGm: msg`All GLV/GM`,
  Buy: msg`Buy`,
  Sell: msg`Sell`,
  Send: msg`Send`,
  Receive: msg`Receive`,
};

type LocalizedHistoryLabels = Record<keyof typeof HISTORY_LABELS, string>;

function getLocalizedHistoryAction(action: string, labels: LocalizedHistoryLabels): string {
  if (action === 'Buy' || action === 'Sell' || action === 'Send' || action === 'Receive') {
    return labels[action];
  }

  return action;
}

interface YourHistoryListProps {
  poolType: PoolType;
  poolTokenAddress?: string;
}

function formatHistoryAmount(amount: string | null | undefined): string {
  if (!amount) return '0.00';
  return formatAmount(new BN(amount), GM_DECIMALS, 2) || '0.00';
}

function formatHistoryPrice(price: string | null | undefined): string {
  if (!price) return '-';
  return formatAmount(new BN(price), PRICE_DECIMALS, 5) || '-';
}

function formatHistoryFee(
  action: string,
  fee: string | null | undefined
): string {
  if (action === 'Send' || action === 'Receive') return '-';
  if (!fee) return '$0.00';
  const feeBn = new BN(fee);
  if (feeBn.isZero()) return '$0.00';
  const formatted = formatUsd(feeBn, { displayDecimals: 2, showDollarSign: true });
  return formatted ? `-${formatted.replace(/^-/, '')}` : '-';
}

function getTokenDisplay(item: GmGlvHistoryItem, marketInfosMap: Map<string, any>) {
  const isGlv = item.assetType === 'GLV';
  const marketToken = item.marketToken || '';
  const marketInfo = marketToken ? marketInfosMap.get(marketToken) : undefined;
  const indexToken = marketInfo?.indexToken as string | undefined;
  const longToken = marketInfo?.longToken as string | undefined;
  const shortToken = marketInfo?.shortToken as string | undefined;

  const title = isGlv
    ? getGlvDisplayNameByTokenAddress(item.glvToken || item.token)
    : `GM:${formatMarketName(indexToken) || '—'}`;

  const subtitle = item.tokenPair ? `[${item.tokenPair}]` : '';

  const mainIconSymbol = isGlv
    ? 'GLV'
    : GMX_SOLANA_TOKENS_RAW[indexToken || '']?.displaySymbol || 'GM';
  const longSymbol = GMX_SOLANA_TOKENS_RAW[longToken || '']?.displaySymbol || '';
  const shortSymbol = GMX_SOLANA_TOKENS_RAW[shortToken || '']?.displaySymbol || '';

  return {
    title,
    subtitle,
    mainIconSymbol,
    longSymbol,
    shortSymbol,
    showPairIcons: !isGlv && Boolean(longSymbol && shortSymbol),
  };
}

function openExplorerTx(txHash: string) {
  window.open(getTransactionUrl(txHash), '_blank', 'noopener,noreferrer');
}

export function YourHistoryList({
  poolType,
  poolTokenAddress,
}: YourHistoryListProps) {
  const [scope, setScope] = useState<GmGlvHistoryScope>('current');
  const [page, setPage] = useState(1);
  const { marketInfosMap } = useMarkets();
  const isMobile = useMedia('(max-width: 768px)');
  const historyLabels = useLocalizedMap(HISTORY_LABELS);

  useEffect(() => {
    setPage(1);
  }, [scope, poolTokenAddress, poolType]);

  const { items, totalCount, isLoading } = useGmGlvHistoryData({
    poolType,
    poolTokenAddress,
    scope,
    page,
  });

  const pageCount = Math.ceil(totalCount / GM_GLV_HISTORY_PER_PAGE);
  const currentLabel = poolType === 'GLV' ? historyLabels.CurrentGlv : historyLabels.CurrentGm;

  const scopeOptions = useMemo(
    () =>
      [
        { key: 'current' as const, label: currentLabel },
        { key: 'all' as const, label: historyLabels.AllGlvGm },
      ] as const,
    [currentLabel, historyLabels.AllGlvGm]
  );

  return (
    <div className="your-history-list">
      <div className="your-history-scope-tabs">
        {scopeOptions.map((option) => (
          <button
            key={option.key}
            type="button"
            className={classNames('scope-btn', {
              active: scope === option.key,
            })}
            onClick={() => setScope(option.key)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="your-history-table-wrapper relative min-h-[21.2rem]">
        {!isMobile && (
          <TableScrollFadeContainer>
            <Table className="your-history-table min-w-max">
              <thead>
                <TableTheadTr>
                  <TableTh className="text-[1.1rem] !font-[500] !text-[#A3A3A3]" style={{ paddingLeft: '2rem' }}>
                    <Trans>ACTION</Trans>
                  </TableTh>
                  <TableTh className="text-[1.1rem] !font-[500] !text-[#A3A3A3]">
                    <Trans>TOKEN</Trans>
                  </TableTh>
                  <TableTh className="text-[1.1rem] !font-[500] !text-[#A3A3A3]">
                    <Trans>AMOUNT</Trans>
                  </TableTh>
                  <TableTh className="text-[1.1rem] !font-[500] !text-[#A3A3A3]">
                    <Trans>PRICE</Trans>
                  </TableTh>
                  <TableTh
                    className="text-[1.1rem] !font-[500] !text-[#A3A3A3] text-right"
                    style={{ paddingRight: '2rem' }}
                  >
                    <Trans>FEES</Trans>
                  </TableTh>
                </TableTheadTr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const tokenDisplay = getTokenDisplay(item, marketInfosMap);
                  const isTransfer =
                    item.action === 'Send' || item.action === 'Receive';

                  return (
                    <TableTr
                      key={item.id}
                      bordered={false}
                      hoverable={false}
                      className={index % 2 === 0 ? 'row-dim' : 'row-dark'}
                    >
                      <TableTd style={{ paddingLeft: '2rem' }}>
                        <div className="action-cell">
                          <div className="action-main">
                            <span className="action-label">
                              {getLocalizedHistoryAction(item.action, historyLabels)}
                            </span>
                            {item.txHash && (
                              <ExternalLink
                                href={getTransactionUrl(item.txHash)}
                                className="inline-flex hover:opacity-80"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  openExplorerTx(item.txHash);
                                }}
                              >
                                <img
                                  src={externalIcon}
                                  alt="View in explorer"
                                  width={12}
                                  height={12}
                                />
                              </ExternalLink>
                            )}
                          </div>
                          <div className="action-time">
                            {formatTimestampNow(item.timestamp)}
                          </div>
                        </div>
                      </TableTd>
                      <TableTd>
                        <div className="token-cell">
                          <div className="token-symbol">
                            <img
                              className="token-icon"
                              src={getIconUrlPath(tokenDisplay.mainIconSymbol, 40)}
                              alt={tokenDisplay.title}
                              width={40}
                              height={40}
                            />
                            {tokenDisplay.showPairIcons && (
                              <div className="ls-img">
                                <img
                                  src={getIconUrlPath(tokenDisplay.longSymbol, 24)}
                                  alt={tokenDisplay.longSymbol}
                                  width={16}
                                  height={16}
                                />
                                <img
                                  src={getIconUrlPath(tokenDisplay.shortSymbol, 24)}
                                  alt={tokenDisplay.shortSymbol}
                                  width={16}
                                  height={16}
                                />
                              </div>
                            )}
                          </div>
                          <div className="token-info">
                            <p className="token-title">{tokenDisplay.title}</p>
                            {tokenDisplay.subtitle && (
                              <span className="token-subtitle">
                                {tokenDisplay.subtitle}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableTd>
                      <TableTd>
                        <span className="value-text">
                          {formatHistoryAmount(item.amount)}
                        </span>
                      </TableTd>
                      <TableTd>
                        <span className="value-text">
                          {isTransfer ? '-' : formatHistoryPrice(item.price)}
                        </span>
                      </TableTd>
                      <TableTd className="text-right" style={{ paddingRight: '2rem' }}>
                        <span className="value-text">
                          {formatHistoryFee(item.action, item.fee)}
                        </span>
                      </TableTd>
                    </TableTr>
                  );
                })}
              </tbody>
            </Table>
          </TableScrollFadeContainer>
        )}

        {isMobile && items.length > 0 && (
          <div className="your-history-mobile-card-list">
            {items.map((item) => (
              <YourHistoryMobileCard
                key={item.id}
                item={item}
                marketInfosMap={marketInfosMap}
              />
            ))}
          </div>
        )}

        {items.length === 0 && (
          <div
            className={classNames(
              'absolute inset-0 flex items-center justify-center',
              { 'top-[3.6rem]': !isMobile }
            )}
          >
            {isLoading ? (
              <LoadingComponent />
            ) : (
              <div className="text-[1.3rem] text-[#A3A3A3]">
                <Trans>No Buy/Sell history available</Trans>
              </div>
            )}
          </div>
        )}
      </div>

      {pageCount > 1 && (
        <BottomTablePagination
          page={page}
          pageCount={pageCount}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

function YourHistoryMobileCard({
  item,
  marketInfosMap,
}: {
  item: GmGlvHistoryItem;
  marketInfosMap: Map<string, any>;
}) {
  const historyLabels = useLocalizedMap(HISTORY_LABELS);
  const tokenDisplay = getTokenDisplay(item, marketInfosMap);
  const isTransfer = item.action === 'Send' || item.action === 'Receive';

  return (
    <div className="your-history-mobile-card">
      <div className="your-history-mobile-card-header">
        <div className="token-cell">
          <div className="token-symbol">
            <img
              className="token-icon"
              src={getIconUrlPath(tokenDisplay.mainIconSymbol, 40)}
              alt={tokenDisplay.title}
              width={40}
              height={40}
            />
            {tokenDisplay.showPairIcons && (
              <div className="ls-img">
                <img
                  src={getIconUrlPath(tokenDisplay.longSymbol, 24)}
                  alt={tokenDisplay.longSymbol}
                  width={16}
                  height={16}
                />
                <img
                  src={getIconUrlPath(tokenDisplay.shortSymbol, 24)}
                  alt={tokenDisplay.shortSymbol}
                  width={16}
                  height={16}
                />
              </div>
            )}
          </div>
          <div className="token-info">
            <p className="token-title">{tokenDisplay.title}</p>
            {tokenDisplay.subtitle && (
              <span className="token-subtitle">{tokenDisplay.subtitle}</span>
            )}
          </div>
        </div>

        <div className="action-cell">
          <div className="action-main">
            <span className="action-label">
              {getLocalizedHistoryAction(item.action, historyLabels)}
            </span>
            {item.txHash && (
              <ExternalLink
                href={getTransactionUrl(item.txHash)}
                className="inline-flex hover:opacity-80"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openExplorerTx(item.txHash);
                }}
              >
                <img
                  src={externalIcon}
                  alt="View in explorer"
                  width={12}
                  height={12}
                />
              </ExternalLink>
            )}
          </div>
          <div className="action-time">{formatTimestampNow(item.timestamp)}</div>
        </div>
      </div>

      <div className="your-history-mobile-card-divider" />

      <div className="your-history-mobile-card-rows">
        <div className="your-history-mobile-card-row">
          <span className="row-label">
            <Trans>AMOUNT</Trans>
          </span>
          <span className="row-value">{formatHistoryAmount(item.amount)}</span>
        </div>
        <div className="your-history-mobile-card-row">
          <span className="row-label">
            <Trans>PRICE</Trans>
          </span>
          <span className="row-value">
            {isTransfer ? '-' : formatHistoryPrice(item.price)}
          </span>
        </div>
        <div className="your-history-mobile-card-row">
          <span className="row-label">
            <Trans>FEES</Trans>
          </span>
          <span className="row-value">
            {formatHistoryFee(item.action, item.fee)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default YourHistoryList;
