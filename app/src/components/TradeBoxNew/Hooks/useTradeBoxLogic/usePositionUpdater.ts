import { useEffect } from 'react';
import { getGmw233Enabled } from '@/config/featureFlagEnable';
import { useAppStore } from '@/zustand/useAppStore';
import { useStoreProgram } from '@/contexts/anchor';
import { GMX_SOLANA_STORE_ADDRESS } from '@/config/program';
import { findPositionPDAWithKind } from 'gmsol';
import { translateAddress } from '@coral-xyz/anchor';
import { useShallow } from 'zustand/react/shallow';
import { PublicKey } from '@solana/web3.js';
import { Position } from '@gmsol-labs/gmsol-sdk';
import { getPositionStatus } from '../../utils/getSimulateResult';
import { correctLiquidationPriceFromMarketInfo } from '@/utils/position/correctLiquidationPrice';
import { isPendingMarketStateError } from '@/utils/position/isPendingMarketStateError';
import isEqual from 'lodash/isEqual';

export const usePositionUpdater = () => {
  const { marketDirection } = useAppStore(useShallow((state) => state.TradeboxNew));
  const { marketInfo, marketBase64Map, marketsState } = useAppStore(useShallow((state) => state.markets));
  const { collateralToken } = useAppStore(useShallow((state) => state.collateralTokens));
  const { positionMap, setPositionInfo } = useAppStore((state) => state.positionState);
  const { indexToken } = useAppStore(useShallow((state) => state.indexTokens));
  const { payerInfo } = useAppStore(useShallow((state) => state.payerSwapTokens));
  const storeProgram = useStoreProgram();

  useEffect(() => {
    if (!storeProgram || !payerInfo.connected || !marketInfo?.marketToken || !collateralToken) {
      setPositionInfo(null);
      return;
    }
    const storeAddress = GMX_SOLANA_STORE_ADDRESS
      ? translateAddress(GMX_SOLANA_STORE_ADDRESS)
      : undefined;
    if (!storeAddress) {
      setPositionInfo(null);
      return;
    }
    const positionKey = findPositionPDAWithKind(
      storeAddress,
      new PublicKey(payerInfo.address || '11111111111111111111111111111111'),
      new PublicKey(marketInfo.marketToken || '11111111111111111111111111111111'),
      new PublicKey(collateralToken || '11111111111111111111111111111111'),
      marketDirection === 'Long' ? 1 : 2
    )[0].toBase58();
    const positionStr = positionMap instanceof Map ? positionMap.get(positionKey) || '' : '';
    if (!positionStr) {
      setPositionInfo(null);
      return;
    }
    const encodedMarket = marketBase64Map.get(marketInfo.marketToken);
    if (!encodedMarket) {
      setPositionInfo(null);
      return;
    }

    const unitBuf = Buffer.from(positionStr, 'base64');
    const positionAccount = storeProgram.coder.accounts.decode(
      'position',
      unitBuf
    );
    const positionObj = Position.decode_from_base64(positionStr);
    try {
      const positionData = getPositionStatus(
        positionObj,
        marketInfo,
        marketBase64Map,
      );
      const correctedPositionData = getGmw233Enabled()
        ? correctLiquidationPriceFromMarketInfo(positionData, positionAccount, marketInfo, marketsState)
        : positionData;
      const positionInfo = { ...positionAccount, ...correctedPositionData };
      if (isEqual(positionInfo, useAppStore.getState().positionState.positionInfo)) {
        return;
      }
      setPositionInfo(positionInfo);
    } catch (error) {
      if (isPendingMarketStateError(error)) {
        // Do not expose stale borrowing/funding values while the market account
        // update for the newly confirmed position is still pending.
        setPositionInfo(null);
        return;
      }
      console.error('[tradebox] position status compute failed', error);
    }


  }, [
    indexToken,
    marketInfo?.marketToken,
    collateralToken,
    marketDirection,
    positionMap,
    payerInfo.connected,
    payerInfo.address,
    storeProgram,
    marketBase64Map,
    marketsState,
    setPositionInfo
  ]);
};
