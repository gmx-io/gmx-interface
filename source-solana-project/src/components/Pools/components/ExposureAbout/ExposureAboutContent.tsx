import {
  Table,
  TableTd,
  TableTh,
  TableTheadTr,
  TableTr,
} from '@/components/Common/Table/Table';
import { TableScrollFadeContainer } from '@/components/Common/Table/TableScrollFade/TableScrollFade';
import TokenIcon from '@/components/Common/TokenIcon/TokenIcon';
import { formatMarketName } from '@/components/TradeBoxNew/utils/formatMarketName';
import { getGmw291Enabled } from '@/config/featureFlagEnable';
import { GMX_SOLANA_TOKENS_RAW } from '@/config/program';
import { getNormalizedTokenSymbolGMX } from '@/utils/token/getNormalizedTokenSymbolGMX';
import LoadingComponent from '@/utils/LoadingComponent';
import { Trans } from '@lingui/macro';

export interface ExposureAboutContentProps {
  poolInfo: any;
  isPoolReady: boolean;
  isMobile: boolean;
  marketInfosMap: Map<string, any>;
}

export function ExposureAboutContent({
  poolInfo,
  isPoolReady,
  isMobile,
  marketInfosMap,
}: ExposureAboutContentProps) {
  const isGmw291Enabled = getGmw291Enabled();

  return (
    <div className="exposure-container">
      {/* Exposure to Backing Tokens */}
      <div className="exposure-section">
        <h3 className="section-title">
          <Trans>Exposure to Backing Tokens</Trans>
        </h3>
        {isGmw291Enabled && !isPoolReady ? (
          <div style={{ minHeight: '12rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LoadingComponent />
          </div>
        ) : (
          <Table className="tokens-table">
            <thead>
              <TableTheadTr>
                <TableTh
                  className="text-[11px] !font-[500] !text-[#A3A3A3]"
                  style={{ paddingLeft: '2rem' }}
                >
                  <Trans>COLLATERAL</Trans>
                </TableTh>
                <TableTh
                  className="text-[11px] !font-[500] !text-[#A3A3A3]"
                  style={{ paddingRight:  '2rem' }}
                >
                  <Trans>COMPOSITION</Trans>
                </TableTh>
              </TableTheadTr>
            </thead>
            <tbody>
              <TableTr
                bordered={false}
                hoverable={false}
                style={{ backgroundColor: '#1F1F1F' }}
              >
                <TableTd
                  className="text-[1.3rem] font-medium"
                  style={{ paddingLeft: '2rem' }}
                >
                  <div className="token-cell flex items-center gap-6">
                    <TokenIcon
                      symbol={
                        getNormalizedTokenSymbolGMX(GMX_SOLANA_TOKENS_RAW[poolInfo?.longToken || '']
                          ?.symbol || '')
                      }
                      displaySize={20}
                    />
                    <span className="token-symbol">
                      Long:{' '}
                      {getNormalizedTokenSymbolGMX(GMX_SOLANA_TOKENS_RAW[poolInfo?.longToken || '']
                        ?.symbol || '')}
                    </span>
                  </div>
                </TableTd>
                <TableTd
                  className="text-[1.3rem] font-medium"
                  style={{ paddingRight: '2rem' }}
                >
                  <span style={{ fontSize: "13px", fontWeight: 500 }}>
                    {poolInfo?.longToken !== poolInfo?.shortToken ? poolInfo?.longRate : 50}%
                  </span>
                </TableTd>
              </TableTr>
              <TableTr
                bordered={false}
                hoverable={false}
              >
                <TableTd
                  className="text-[1.3rem] font-medium"
                  style={{ paddingLeft:  '2rem' }}
                >
                  <div className="token-cell flex items-center gap-6">
                    <TokenIcon
                      symbol={
                        GMX_SOLANA_TOKENS_RAW[poolInfo?.shortToken || '']
                          ?.symbol || ''
                      }
                      displaySize={20}
                    />
                    <span className="token-symbol">
                      Short:{' '}
                      {GMX_SOLANA_TOKENS_RAW[poolInfo?.shortToken || '']
                        ?.symbol || ''}
                    </span>
                  </div>
                </TableTd>
                <TableTd
                  className="text-[1.3rem] font-medium"
                  style={{ paddingRight:  '2rem' }}
                >
                  <span style={{ fontSize: "13px", fontWeight: 500 }}>
                    {poolInfo?.shortToken !== poolInfo?.longToken ? poolInfo?.shortRate : 50}%
                  </span>
                </TableTd>
              </TableTr>
            </tbody>
          </Table>
        )}
      </div>

      {/* Exposure to Market Traders' PnL */}
      <div className="exposure-section">
        <h3 className="section-title">
          <Trans>Exposure to Market Traders&apos; PnL</Trans>
        </h3>
        {isGmw291Enabled && (!isPoolReady || !poolInfo?.markets?.length) ? (
          <div style={{ minHeight: '12rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LoadingComponent />
          </div>
        ) : (
          <TableScrollFadeContainer>
            <Table className="market-composition-table">
              <thead>
                <TableTheadTr>
                  <TableTh
                    className="text-[11px] !font-[500] !text-[#A3A3A3]"
                    style={{ paddingLeft:  '2rem' }}
                  >
                    <Trans>MARKET</Trans>
                  </TableTh>
                  <TableTh className="text-[11px] !font-[500] !text-[#A3A3A3]">
                    <Trans>TVL/CAP</Trans>
                  </TableTh>
                  <TableTh
                    className="text-[11px] !font-[500] !text-[#A3A3A3]"
                    style={{ paddingRight:  '2rem' }}
                  >
                    <Trans>COMPOSITION</Trans>
                  </TableTh>
                </TableTheadTr>
              </thead>
              <tbody>
                {poolInfo?.markets?.map((market: any, indexRow: number) => {
                  const matchedEntry = marketInfosMap.get(market.marketToken);
                  const indexToken = matchedEntry?.indexToken;

                  const rowBg =
                    indexRow % 2 === 0 ? '#1F1F1F' : '#181818';

                  return (
                    <TableTr
                      key={market.marketTokenName}
                      bordered={false}
                      hoverable={false}
                      style={{ backgroundColor: rowBg }}
                    >
                      <TableTd
                        className="text-[1.3rem] font-medium"
                        style={{ paddingLeft:  '2rem' }}
                      >
                        <div className="token-cell flex items-center gap-6">
                          <TokenIcon
                            symbol={GMX_SOLANA_TOKENS_RAW[indexToken]?.symbol}
                            displaySize={20}
                          />
                          <span className="market-name flex items-center">
                            {formatMarketName(market.indexToken)}
                          </span>
                        </div>
                      </TableTd>
                      <TableTd className="text-[1.3rem] font-medium">
                        <span className="whitespace-nowrap">
                          {market.tvlUsd} <span style={{ color: '#A3A3A3' }}>/</span> {market.cap}
                        </span>
                      </TableTd>
                      <TableTd
                        className="text-[1.3rem] font-medium"
                        style={{ paddingRight:  '2rem' }}
                      >
                        <span>{market?.composition || 0}%</span>
                      </TableTd>
                    </TableTr>
                  );
                })}
              </tbody>
            </Table>
          </TableScrollFadeContainer>
        )}
      </div>
    </div>
  );
}

export default ExposureAboutContent;
