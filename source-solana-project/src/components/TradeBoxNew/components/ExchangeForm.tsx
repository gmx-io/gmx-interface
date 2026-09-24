/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import { memo, useEffect, useMemo, useState } from 'react'
import PoolCallateralCom from './childs/PoolCallateralCom'
import MarketTypeCom from './childs/MarketTypeCom'
import PayLongSizeRateCom from './childs/PayLongSizeRateCom';
import ProfitLossGtCom from './childs/ProfitLossGtCom'
import ExchangeButton from './childs/ExchangeButton'
import { NoticeCard } from '@/components/NoticeCard';
import { getNoticeConfig } from '@/components/useNotice';
import SwapBox from './childs/SwapBox'
import { useAppStore } from '@/zustand/useAppStore'
import { useShallow } from 'zustand/react/shallow'
import { t } from '@lingui/macro';
import { useMultipMarketBase64 } from '@/components/TradeBoxNew/Hooks/useMultipMarketBase64';
import { getGmw379Enabled } from '@/config/featureFlagEnable';
import { BN } from '@coral-xyz/anchor';
import { GMX_SOLANA_TOKENS_RAW } from '@/config/program';
import { MarketInfo } from '@/selectors/market/types';
import { formatAmountFree } from '@/utils/legacy';
import { formatMarketName } from '../utils/formatMarketName';
import { getMarketDefaultLeverage } from '../utils/getMarketDefaultLeverage';
import { useWallet } from '@solana/wallet-adapter-react';

type MarketInfoWithImpactFee = MarketInfo & { impactFeesNum?: string };

const useGmw379MarketBase64 = getGmw379Enabled()
  ? () => undefined
  : useMultipMarketBase64;

function ExchangeForm() {
  useGmw379MarketBase64();
  const {
    tradeMoney,
    marketDirection,
    leverageHighTip,
    marketType,
    setLeverage,
  } = useAppStore(useShallow((state) => state.TradeboxNew))

  const {
    collateralToken
  } = useAppStore(useShallow((state) => state.collateralTokens))

  const {
    marketInfo,
    marketInfos,
    marketImpactList,
    setMarketInfo,
  } = useAppStore(useShallow((state) => state.markets))

  const {
    positions,
  } = useAppStore(useShallow((state) => state.positionState))
  const positionsList = useMemo(() => Array.isArray(positions) ? positions : Object.values(positions || {}), [positions]);
  const {
    payerInfo,
    currentSolBalance,
    payerSwapTokenInfo,
    tokenBalancesLoaded,
  } = useAppStore(useShallow((state) => state.payerSwapTokens));

  const {
    indexToken,
  } = useAppStore(useShallow((state) => state.indexTokens))
  const {
    selectSwapPayToken,
    selectSwapReceiveToken,
  } = useAppStore(useShallow((state) => state.swap));
  const { bgColor, icon } = getNoticeConfig('info');
  const warningConfig = getNoticeConfig('warning');
  const [isShowImpactFeesTip, setIsShowImpactFeesTip] = useState(false);
  const [isShowImpactFeesTipByManual, setIsShowImpactFeesTipByManual] = useState(true);
  const [isShowPoolTip, setIsShowPoolTip] = useState(false);
  const [isShowPoolTipByManual, setIsShowPoolTipByManual] = useState(true);
  const [isShowLowSOLTip, setIsShowLowSOLTip] = useState(false);
  const [isShowLowSOLTipByManual, setIsShowLowSOLTipByManual] = useState(true);
  const [isShowPayAndCollateralTip, setIsShowPayAndCollateralTip] = useState(false);
  const [maxImpactFeesMarket, setMaxImpactFeesMarket] =
    useState<MarketInfoWithImpactFee>();
  const [impactFeesDifference, setImpactFeesDifference] = useState('');
  const [currentMarketInfo, setCurrentMarketInfo] = useState<MarketInfoWithImpactFee>();
  const isSwap = marketDirection === 'Swap';
  const getTokenName = (token: string) => {
    return GMX_SOLANA_TOKENS_RAW[token]?.symbol === 'WGMX' ? 'GMX' : GMX_SOLANA_TOKENS_RAW[token]?.symbol || token;
  }
  const iswraporUnwrap = (selectSwapPayToken?.tokenAddress === 'So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH' && selectSwapReceiveToken?.tokenAddress === 'So11111111111111111111111111111111111111112') ||
    (selectSwapPayToken?.tokenAddress === 'So11111111111111111111111111111111111111112' && selectSwapReceiveToken?.tokenAddress === 'So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH');

  const { connected } = useWallet();

  useEffect(() => {
    const name = formatMarketName(indexToken);
    setLeverage(localStorage.getItem(name || '') || getMarketDefaultLeverage(indexToken));
  }, [indexToken])

  useEffect(() => {
    if (indexToken) {
      setIsShowImpactFeesTip(false);
      setIsShowPoolTip(false);
      setIsShowLowSOLTip(false);
    }
  }, [indexToken])

  useEffect(() => {
    setIsShowImpactFeesTip(false);
    setIsShowPoolTip(false);
    setIsShowLowSOLTip(false);
  }, [marketDirection])

  useEffect(() => {
    setIsShowImpactFeesTip(false);
    setIsShowPoolTip(false);
    setIsShowLowSOLTip(false);
  }, [marketType])

  useEffect(() => {
    if (marketInfo?.marketToken) {
      setIsShowImpactFeesTip(false);
      setIsShowPoolTip(false);
      setIsShowImpactFeesTipByManual(true);
      setIsShowPoolTipByManual(true);
    }
  }, [marketInfo?.marketToken])

  useEffect(() => {
    if (payerSwapTokenInfo?.tokenAddress) {
      setIsShowLowSOLTipByManual(true);
    }
  }, [payerSwapTokenInfo?.tokenAddress])

  useEffect(() => {
    if (!payerSwapTokenInfo?.tokenAddress) {
      return
    }
    if (!collateralToken) {
      return
    }
    if (payerSwapTokenInfo?.tokenAddress !== collateralToken) {
      setIsShowPayAndCollateralTip(true);
      const payName = GMX_SOLANA_TOKENS_RAW[payerSwapTokenInfo?.tokenAddress]?.symbol
      const collateralName = GMX_SOLANA_TOKENS_RAW[collateralToken]?.symbol
      if ((payName === 'WSOL' || payName === 'SOL') && (collateralName === 'WSOL' || collateralName === 'SOL')) {
        setIsShowPayAndCollateralTip(false);
        return
      }
      setIsShowPayAndCollateralTip(true);
    } else {
      setIsShowPayAndCollateralTip(false);
    }
  }, [payerSwapTokenInfo?.tokenAddress, collateralToken])

  useEffect(() => {
    if (!isShowImpactFeesTipByManual) {
      return
    }
    if (marketInfo && marketImpactList && marketImpactList.length > 0) {
      const currentMarketToken = (marketInfo as any)?.marketToken;
      const currentMarketInfo = marketImpactList.find((market: any) => market.marketToken === currentMarketToken);
      if (!currentMarketInfo?.impactFeesNum) {
        return
      }
      const currentMarketImpactFees = new BN(JSON.parse(JSON.stringify(currentMarketInfo?.impactFeesNum || '0')));
      if (currentMarketImpactFees.isZero()) {
        setIsShowImpactFeesTip(false);
        return;
      }
      let maxImpactFees = null;
      let maxImpactFeesMarket: MarketInfoWithImpactFee | null = null;
      marketImpactList.forEach((market: any) => {
        const impactFees = new BN(market.impactFeesNum || '0');
        if (!impactFees?.isZero()) {
          if (!maxImpactFees || impactFees.gt(maxImpactFees)) {
            maxImpactFees = impactFees;
            maxImpactFeesMarket = market;
          }
        }
      });
      if (
        maxImpactFeesMarket &&
        currentMarketImpactFees.lt(maxImpactFees)
      ) {

        const difference = maxImpactFees
          .sub(currentMarketImpactFees)
          .abs()
          .mul(new BN(100))
        const differenceRate = formatAmountFree(difference, 20, 2);
        setImpactFeesDifference(differenceRate);
        setMaxImpactFeesMarket(maxImpactFeesMarket);
        if (differenceRate === '0') {
          return
        }
        setIsShowImpactFeesTip(true);
      } else {
        setIsShowImpactFeesTip(false);
      }
    }
  }, [tradeMoney, marketInfo, marketImpactList]);

  useEffect(() => {
    if (!isShowPoolTipByManual) {
      return
    }
    const position = positionsList.length ? positionsList.filter((pos: any) => (pos?.marketTokenAddress.toBase58() === (marketInfo as any)?.marketToken) && pos?.isLong === (marketDirection === 'Long')) : [];
    if (position?.length) {
      setIsShowPoolTip(false);
      return
    }
    const otherMarkets = marketInfos?.filter((market: any) => market.marketToken !== (marketInfo as any)?.marketToken)
    const maxSizePosition = positionsList.length > 0
      ? positionsList.reduce((max: any, current: any) => {
        if (current?.marketInfo?.indexToken !== indexToken) {
          return max;
        }

        if (!max || !max.sizeInUsd) return current;
        if (!current || !current.sizeInUsd) return max;

        return max.sizeInUsd.gt(current.sizeInUsd) ? max : current;
      }, null)
      : null;
    if (!maxSizePosition && maxSizePosition?.marketInfo?.indexToken !== indexToken) {
      return
    }
    const selectedPosition = otherMarkets?.find(i => (i?.marketToken === maxSizePosition?.marketTokenAddress?.toBase58() && maxSizePosition?.isLong === (marketDirection === 'Long')))
    if (!selectedPosition) {
      return
    }
    setCurrentMarketInfo(selectedPosition as any);
    setIsShowPoolTip(true);
    // otherMarkets.forEach((market: any) => {
    //   const position = positions?.length > 0 ? positions?.filter((pos: any) => (pos?.marketTokenAddress.toBase58() === market?.marketToken) && pos?.isLong === (marketDirection === 'Long')) : [];
    //   if (position[0]?.marketTokenAddress?.toBase58()) {
    //     setIsShowPoolTip(true);
    //     setCurrentMarketInfo(position[0]?.marketInfo);
    //   }
    // })
  }, [marketInfos, positionsList])

  useEffect(() => {
    if (!isShowLowSOLTipByManual) {
      return
    }
    if (tokenBalancesLoaded && currentSolBalance && new BN(currentSolBalance).lte(new BN(50000000))) {
      setIsShowLowSOLTip(true);
    } else {
      setIsShowLowSOLTip(false);
    }
  }, [currentSolBalance, tokenBalancesLoaded, tradeMoney])
  return (
    <div className='tradeBox-exchangeForm'>
      {
        (marketDirection === 'Long' || marketDirection === 'Short') && <>
          <PoolCallateralCom />
        </>
      }
      <MarketTypeCom />
      {
        (marketDirection === 'Long' || marketDirection === 'Short') && <>
          <PayLongSizeRateCom />
        </>
      }
      {
        marketDirection === 'Swap' && <SwapBox />
      }
      {
        (marketDirection === 'Long' || marketDirection === 'Short') && <>
          <ProfitLossGtCom />
        </>
      }
      {/* <LeverageHighTip isVisible={leverageHighTip} onClose={() => setLeverageHighTip(false)} /> */}
      <div style={{ margin: '0 1.2rem' }}>
        {isShowImpactFeesTip && !isSwap && !iswraporUnwrap &&
          <NoticeCard
            type="info"
            cardType="notice"
            title={t`Save ${impactFeesDifference}% in price impact and fees by`}
            description={t`switching to the ${getTokenName((maxImpactFeesMarket as any)?.longToken || '') + '-' + getTokenName((maxImpactFeesMarket as any)?.shortToken || '')} pool >`}
            onLinkClick={() => {
              setIsShowImpactFeesTip(false);
              setMarketInfo(maxImpactFeesMarket as any);
            }}
            onClose={() => { setIsShowImpactFeesTip(false); setIsShowImpactFeesTipByManual(false) }}
            bgColor={bgColor}
            icon={icon}
          />
        }
      </div>


      <div style={{ margin: '0 1.2rem' }}>
        {isShowPoolTip && !isSwap && !iswraporUnwrap &&
          <NoticeCard
            type="info"
            cardType="notice"
            title={t`You have an existing position in the ${getTokenName((currentMarketInfo as any)?.longToken || '') + '-' + getTokenName((currentMarketInfo as any)?.shortToken || '')} market pool`}
            description={t`switching to the ${getTokenName((currentMarketInfo as any)?.longToken || '') + '-' + getTokenName((currentMarketInfo as any)?.shortToken || '')} pool >`}
            onLinkClick={() => { setIsShowPoolTip(false); setMarketInfo(currentMarketInfo as any) }}
            onClose={() => { setIsShowPoolTip(false); setIsShowPoolTipByManual(false) }}
            bgColor={bgColor}
            icon={icon}
          />
        }
      </div>

      <div style={{ margin: '0 1.2rem' }}>
        {isShowLowSOLTip && payerInfo?.connected && !isSwap && !iswraporUnwrap &&
          < NoticeCard
            type="info"
            cardType="notice"
            title={t`Low SOL balance — may fail to close position later. Get some more SOL before opening.`}
            onClose={() => { setIsShowLowSOLTip(false); setIsShowLowSOLTipByManual(false) }}
            bgColor={bgColor}
            icon={icon}
          />
        }
      </div>

      <div style={{ margin: '0 1.2rem' }}>
        {payerInfo?.connected && (selectSwapPayToken?.tokenAddress === 'So11111111111111111111111111111111111111112' && selectSwapReceiveToken?.tokenAddress === 'So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH') &&
          <NoticeCard
            type="info"
            cardType="notice"
            title={t`You can only unwrap your entire WSOL balance. Click Max to unwrap all, or leave empty to cancel.`}
            bgColor={bgColor}
            icon={icon}
          />
        }
      </div>

      <div style={{ margin: '0 1.2rem' }}>
        {
          tradeMoney?.gt(new BN(0)) && leverageHighTip && (
            <NoticeCard
              type="warning"
              cardType="notice"
              title={t`Collateral may be insufficient after fees. Reduce leverage or add margin to avoid immediate liquidation.`}
              bgColor={warningConfig?.bgColor}
              icon={warningConfig?.icon}
            />
          )
        }
      </div>

      <div style={{ margin: '0 1.2rem' }}>
        {connected && !isSwap && !iswraporUnwrap && isShowPayAndCollateralTip &&
          <NoticeCard
            type="info"
            cardType="notice"
            title={t`Note: You are paying with ${GMX_SOLANA_TOKENS_RAW[payerSwapTokenInfo?.tokenAddress]?.symbol === 'WGMX' ? 'GMX' : GMX_SOLANA_TOKENS_RAW[payerSwapTokenInfo?.tokenAddress]?.symbol}, which will be automatically swapped to ${GMX_SOLANA_TOKENS_RAW[collateralToken]?.symbol === 'WGMX' ? 'GMX' : GMX_SOLANA_TOKENS_RAW[collateralToken]?.symbol} as collateral.`}
            bgColor={bgColor}
            icon={icon}
            onClose={() => { setIsShowPayAndCollateralTip(false); }}
          />
        }
      </div>
      <ExchangeButton />
    </div>
  )
}

export default memo(ExchangeForm);
