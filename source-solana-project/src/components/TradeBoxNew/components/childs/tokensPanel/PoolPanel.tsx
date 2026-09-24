import React, { useEffect } from 'react';
import classNames from 'classnames';
import { BN } from '@coral-xyz/anchor';
import { useAppStore } from '@/zustand/useAppStore';
import { BN_ZERO } from '@/config/constants';
import { formatGmxSymbol } from '@/components/TradeBoxNew/utils/formatGmxSymbol';
import {
  formatRatePercentage,
  formatUsdToKMBWithoutUnit
} from '@/utils/legacy/format';
import './poolPanel.scss'
import { GMX_SOLANA_TOKENS_RAW } from '@/config/program';

interface PoolPanelProps {
  onSelect: (pool: any) => void;
  marketData: any[];
}

const PoolPanel: React.FC<PoolPanelProps> = ({ onSelect, marketData }) => {
  const {
    marketDirection,
  } = useAppStore(state => state.TradeboxNew);
  const {
    setMarketInfo,
    setHasPoolChange,
  } = useAppStore(state => state.markets);
  const {
    collateralToken,
    setCollateralToken,
    setHasCollateralChange,
  } = useAppStore(state => state.collateralTokens);

  const isLong = marketDirection === 'Long';
  const handleSelectPool = (pool: any) => {
    setMarketInfo(pool);
    onSelect(pool);
    setHasPoolChange(true);
  };
  return (
    <div className="!bg-fill-surface-base border-[0.5px] border-stroke-primary text-white mx-auto poolPanel">
      <div className="grid grid-cols-3 px-2 header text-[#A3A3A3]">
        <div className="text-left">POOL</div>
        <div className="text-left">{marketDirection === 'Long' ? 'LONG' : 'SHORT'} LIQ.</div>
        <div className="text-left">NET RATE</div>
        {/* <div className="text-left">IMPACT+FEES</div> */}
      </div>
      <div className="flex flex-col body">
        {marketData?.map((pool) => {
          // const poolName = pool.longToken === pool.shortToken
          //   ? formatGmxSymbol(pool.longToken)
          //   : `${formatGmxSymbol(pool.longToken)}-${formatGmxSymbol(pool.shortToken)}`;
          // const poolName = `${formatGmxSymbol(pool.longToken)}-${formatGmxSymbol(pool.shortToken)}`;
          const poolName = `${GMX_SOLANA_TOKENS_RAW[pool.longToken]?.symbol === 'WGMX' ? 'GMX' : GMX_SOLANA_TOKENS_RAW[pool.longToken]?.symbol}-${GMX_SOLANA_TOKENS_RAW[pool.shortToken]?.symbol === 'WGMX' ? 'GMX' : GMX_SOLANA_TOKENS_RAW[pool.shortToken]?.symbol}`;

          return (
            <div
              key={pool.marketToken}
              className={classNames(
                "grid grid-cols-3 gap-3 items-center hover:bg-fill-surface-hover rounded-lg p-2 cursor-pointer transition-colors duration-200 row",
                {
                  greyStyle: pool.isGrey
                }
              )}
              onClick={() => {
                setHasCollateralChange(false);
                handleSelectPool(pool)
                if (pool?.longToken === pool?.shortToken) {
                  if (pool?.longToken !== collateralToken) {
                    setCollateralToken(pool?.longToken);
                  }
                }
              }}
            >
              <div className="flex items-center">
                <span className="font-medium text-sm poolColunm">
                  {pool.isAuto ? (
                    <>
                      <span>{poolName}<span style={{ color: '#A3A3A3' }}>(AUTO)</span></span>
                    </>
                  ) : (
                    poolName
                  )}
                </span>
              </div>
              <div className="text-left text-sm" style={{ fontWeight: '400' }}>{formatUsdToKMBWithoutUnit(new BN(isLong ? pool.lpLong : pool.lpShort))}{pool.isGrey ? '1111' : null}</div>
              <div
                className={classNames('text-left text-sm', {
                  'text-green-400': new BN(isLong ? pool.longNetRatePerHour : pool.shortNetRatePerHour).gten(0),
                  'text-red-400': new BN(isLong ? pool.longNetRatePerHour : pool.shortNetRatePerHour).ltn(0),
                })}
              >
                {formatRatePercentage(
                  new BN(isLong ? pool.longNetRatePerHour : pool.shortNetRatePerHour) ?? BN_ZERO,
                  4,
                  {
                    signed: true,
                  }
                )}/1h
              </div>
              {/* <div className={classNames('text-left text-sm', {
                'text-green-400': pool?.impactFees && pool?.isGtZero,
                'text-red-400': pool?.impactFees && !pool?.isGtZero,
              })}>
                {pool?.impactFees}
              </div> */}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PoolPanel;