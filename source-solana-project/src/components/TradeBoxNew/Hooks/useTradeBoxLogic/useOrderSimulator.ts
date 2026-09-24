import { useEffect, useMemo, useRef } from 'react';
import { useAppStore } from '@/zustand/useAppStore';
import {
  getSimulateOrderByMarketIncrease,
  getSimulateOrderByLimitIncrease,
  getSimulateOrderByMarketSwap,
  getSimulateOrderByLimitSwap,
} from '@/components/TradeBoxNew/utils/getSimulateResult';
import {
  formatPriceUsd,
  formatUsdToKMB,
  formatRatePercentage,
} from '@/utils/legacy';
import { Position } from '@gmsol-labs/gmsol-sdk';
import { BN } from '@coral-xyz/anchor';
import { useShallow } from 'zustand/react/shallow';
import { GMX_SOLANA_TOKENS_RAW } from '@/config/program';
import { findPositionPDAWithKind } from 'gmsol';
import { GMX_SOLANA_STORE_ADDRESS, GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS } from '@/config/program';
import { translateAddress } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { useStoreProgram } from '@/contexts/anchor';
import { formatInput } from '../../utils/formatInput';
import { applySlippageToPrice } from '@/utils/tradebox/applySlippageToPrice';
import { USD_DECIMALS } from '@/config/constants';

const SIMULATION_DEBOUNCE_MS = 100;

function getActualDisplayDecimals(value: BN, referenceDecimals = USD_DECIMALS) {
  const base = new BN(10).pow(new BN(referenceDecimals));
  const fraction = value
    .abs()
    .mod(base)
    .toString()
    .padStart(referenceDecimals, '0')
    .replace(/0+$/, '');

  return fraction.length;
}

export const useOrderSimulator = () => {
  const simulationRequestIdRef = useRef(0);
  const {
    tradeMoney,
    payTokenNum,
    sizeNumber,
    limitPrice,
    marketType,
    marketDirection,
    slippage,
    setSimulationData,
    graphObj,
    priorityFees,
    setBtnDisabled,
    setBtnMessage,
    setLeverageHighTip,
    leverage,
  } = useAppStore(useShallow((state) => state.TradeboxNew));
  const { tokenPriceMap } = useAppStore(useShallow((state) => state.tickersState));
  const {
    marketInfo,
    marketBase64Map,
    marketsMap,
    markets,
  } = useAppStore(useShallow((state) => state.markets));
  const { collateralToken } = useAppStore(useShallow((state) => state.collateralTokens));
  const { indexTokenData } = useAppStore(useShallow((state) => state.indexTokens));
  const { selectSwapPayToken, selectSwapReceiveToken } = useAppStore(useShallow((state) => state.swap));
  const { positionMap } = useAppStore((state) => state.positionState);
  const { payerSwapList, payerSwapTokenInfo, payerInfo } = useAppStore(useShallow((state) => state.payerSwapTokens));
  const storeProgram = useStoreProgram();
  const payTokenPrice = useMemo(() => tokenPriceMap.get(payerSwapTokenInfo?.tokenAddress)?.minUnitPrice, [tokenPriceMap, payerSwapTokenInfo?.tokenAddress]);
  const currentPrice = useMemo(() => tokenPriceMap.get(indexTokenData?.indexToken)?.unitPrice, [tokenPriceMap, indexTokenData?.indexToken]);
  const simulationPriceKey = useMemo(() => {
    const tokenAddresses = [
      indexTokenData?.indexToken,
      payerSwapTokenInfo?.tokenAddress,
      marketInfo?.longToken,
      marketInfo?.shortToken,
      selectSwapPayToken?.tokenAddress,
      selectSwapReceiveToken?.tokenAddress,
    ].filter((tokenAddress): tokenAddress is string => Boolean(tokenAddress));

    return tokenAddresses
      .map((tokenAddress) => {
        const price = tokenPriceMap.get(tokenAddress);

        return [
          tokenAddress,
          price?.unitPrice,
          price?.minUnitPrice,
          price?.maxUnitPrice,
        ].join(':');
      })
      .join('|');
  }, [
    indexTokenData?.indexToken,
    marketInfo?.longToken,
    marketInfo?.shortToken,
    payerSwapTokenInfo?.tokenAddress,
    selectSwapPayToken?.tokenAddress,
    selectSwapReceiveToken?.tokenAddress,
    tokenPriceMap,
  ]);
  const isSwap = !(marketDirection === 'Long' || marketDirection === 'Short');
  const currentPositionStr = useMemo(() => {
    const storeAddress = GMX_SOLANA_STORE_ADDRESS
      ? translateAddress(GMX_SOLANA_STORE_ADDRESS)
      : undefined;
    if (!storeAddress || !payerInfo.address || !marketInfo?.marketToken || !collateralToken) {
      return '';
    }

    const positionKey = findPositionPDAWithKind(
      storeAddress,
      new PublicKey(payerInfo.address),
      new PublicKey(marketInfo.marketToken),
      new PublicKey(collateralToken),
      marketDirection === 'Long' ? 1 : 2
    )[0].toBase58();

    return positionMap instanceof Map ? positionMap.get(positionKey) || '' : '';
  }, [
    collateralToken,
    marketDirection,
    marketInfo?.marketToken,
    payerInfo.address,
    positionMap,
  ]);
  useEffect(() => {
    const requestId = simulationRequestIdRef.current + 1;
    simulationRequestIdRef.current = requestId;
    const isLatestRequest = () => requestId === simulationRequestIdRef.current;
    const fetchSimulation = async () => {
      const positionInfo = currentPositionStr ? Position.decode_from_base64(currentPositionStr) : null;
      if (tradeMoney && tradeMoney.gt(new BN(0))) {
        const newPayToken = payerSwapTokenInfo?.tokenAddress === 'So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH' ? 'So11111111111111111111111111111111111111112' : payerSwapTokenInfo?.tokenAddress;
        let acceptable_price = new BN(0);
        const isLong = marketDirection === 'Long';
        const acceptablePriceBase = marketType === 'Limit' ? limitPrice : currentPrice;
        if (isLong) {
          acceptable_price = applySlippageToPrice(
            slippage,
            new BN(acceptablePriceBase || 0),
            true,
            true
          );
        } else {
          acceptable_price = applySlippageToPrice(
            slippage,
            new BN(acceptablePriceBase || 0),
            true,
            false
          );
        }
        const leverageBn = formatInput(leverage, 1);
        const payTokenBalance = new BN(payerSwapTokenInfo?.amount || 0);                    
        const defaultMaxTradeMoney = payTokenBalance                                        
         .mul(new BN(payTokenPrice || '0'))                                                
       .mul(leverageBn)                                                                  
       .divn(10);
        const params = {
          marketToken: marketInfo.marketToken,
          graphObj,
          size: tradeMoney,
          _size: payTokenNum?.mul(new BN(payTokenPrice)),
          payToken: newPayToken,
          collateralToken,
          amount: payTokenNum,
          isLong,
          marketBase64Map,
          storeProgram,
          marketInfo,
          positionInfo,
          acceptable_price,
          triggerPrice: limitPrice,
          sizeUsd: tradeMoney,
          amountValue: payTokenNum?.mul(new BN(payTokenPrice)),
          baseCost: priorityFees,
          selectSwapReceiveToken,
          selectSwapPayToken,
          tokenPriceMap,
          marketsMap,
          markets,
          syncSize: payTokenNum?.mul(new BN(payTokenPrice))?.mul(leverageBn)?.divn(10),
          defaultMaxTradeMoney,
          payTokenBalance,
        }
        let result;
        try {
          if (!isSwap) {
            if (marketType === 'Market') {
              result = await getSimulateOrderByMarketIncrease(priorityFees, params);
              // console.log('result2222', result)
            }
            if (marketType === 'Limit') {
              result = await getSimulateOrderByLimitIncrease(params);
              // console.log('result', result)
            }
          } else {
            if (marketType === 'Market') {
              result = await getSimulateOrderByMarketSwap(params);
              console.log('Swap Market', result)
            }
            if (marketType === 'Limit') {
              const payToken = selectSwapPayToken?.tokenAddress === "So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH" ? 'So11111111111111111111111111111111111111112' : selectSwapPayToken?.tokenAddress || '';
              const collateralToken = selectSwapReceiveToken?.tokenAddress === "So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH" ? new PublicKey('So11111111111111111111111111111111111111112') : new PublicKey(selectSwapReceiveToken?.tokenAddress || '');
              const data = {
                ...params,
                outToken: collateralToken.toBase58(),
                payToken,
                collateralToken,
                size: selectSwapPayToken?.paySizeInUsd,
                payTokenNum: selectSwapPayToken?.payAmount,
                minOutputAmount: selectSwapReceiveToken?.receiveAmount,
              }
              result = await getSimulateOrderByLimitSwap('', priorityFees, data);
            }
            if (result) {
              if (isLatestRequest() && result?.msg) {
                setBtnDisabled(true);
                setBtnMessage(result?.msg);
              }
              let priceImpactValue = new BN(0);
              // let priceImpactAmount = new BN(0);
              let swapFeeAmount = new BN(0);
              const swapReports = result?.swapReports || [];
              swapReports?.forEach((item) => {
                const price_impact_value =
                  item?.result?.price_impact_value || new BN(0);
                const price_impact_amount =
                  item?.result?.price_impact_amount || new BN(0);
                const swap_fee_amount_for_pool =
                  item?.result?.token_in_fees?.fee_amount_for_pool ||
                  new BN(0);
                const swap_fee_amount_for_receiver =
                  item?.result?.token_in_fees
                    ?.fee_amount_for_receiver || new BN(0);
                priceImpactValue = priceImpactValue.add(price_impact_value);
                // priceImpactAmount = priceImpactAmount.add(price_impact_amount);
                swapFeeAmount = swapFeeAmount
                  .add(swap_fee_amount_for_pool)
                  .add(swap_fee_amount_for_receiver);
              });
              const swapFee = swapFeeAmount
                ?.mul(new BN(selectSwapPayToken?.minPrice || '0'))
                .neg();
              const priceImpactRateBN = priceImpactValue
                .mul(new BN(10).pow(new BN(20)))
                .div(selectSwapPayToken?.paySizeInUsd);
              const priceImpactRate = formatRatePercentage(
                priceImpactRateBN,
                3,
                { signed: true }
              );
              const swapFeeRateBN = swapFeeAmount
                .mul(new BN(10).pow(new BN(20)))
                .div(selectSwapPayToken?.payAmount)
                .neg();
              const swapFeeRate = formatRatePercentage(swapFeeRateBN, 3, {
                signed: true,
              });
              const data = {
                priceImpactRate: priceImpactRate,
                isLongFeesRate: swapFeeRate,
                // 'Swap Price Impact:': formatUsdToKMB(priceImpactValue),
                // 'Swap Fee': formatUsdToKMB(swapFee),
                Fees: formatUsdToKMB(priceImpactValue.add(swapFee)),
                ...result,
              };
              if (isLatestRequest()) {
                setSimulationData(data);
              }
              return;
            }
          }
          if (result) {
            const strList = ['model: liquidatable position: min collateral for leverage', 'model: invalid argument: insufficient collateral usd'];
            if (isLatestRequest()) {
              if (strList.includes(result)) {
                setLeverageHighTip(true);
              } else {
                setLeverageHighTip(false);
              }
              if (result?.msg) {
                setBtnDisabled(true);
                setBtnMessage(result?.msg);
              }
            }
            let isLongFeesRate;
            const longOpenInterest = marketInfo?.openInterestForLong;
            const shortOpenInterest = marketInfo?.openInterestForShort;
            if (longOpenInterest && shortOpenInterest) {
              isLongFeesRate = new BN(longOpenInterest).gt(
                new BN(shortOpenInterest)
              );
            }
            const sol_price = payerSwapList?.find(
              (item) => item.token === 'SOL'
            )?.minPrice;
            const payTokenDecimals =
              GMX_SOLANA_TOKENS_RAW[collateralToken]?.decimals;
            const indexDecimals =
              GMX_SOLANA_TOKENS_RAW[indexTokenData?.indexToken]?.decimals;
            const executionPrice =
              result?.reportData?.execution?.execution_price.toString() || '0';
            const liquidationPrice =
              result?.positionStatus?.liquidation_price?.toString() || '0';
            const executionPriceBn = new BN(executionPrice).mul(
              new BN(10).pow(new BN(indexDecimals))
            );
            // console.log('execution_price', result?.reportData?.execution?.execution_price.toString())
            const lqPrice = formatPriceUsd(
              new BN(liquidationPrice).mul(
                new BN(10).pow(new BN(indexDecimals))
              ),
              {
                isDisplayDecimals: GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(indexTokenData?.indexToken)
              }
            );
            const etPrice = formatPriceUsd(
              executionPriceBn,
              {
                isDisplayDecimals: GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(indexTokenData?.indexToken)
              }
            );
            const etPriceExtended = formatPriceUsd(
              executionPriceBn,
              {
                displayDecimals: getActualDisplayDecimals(executionPriceBn),
                isDisplayDecimals: true,
              }
            );
            const orderFee =
              result?.reportData?.fees?.order?.fee_value.toString();
            let swaPpriceImpactValue = new BN(0);
            let priceImpactAmount = new BN(0);
            let swapFeeAmount = new BN(0);
            result?.swapData?.forEach((item) => {
              const price_impact_value =
                item.swapData?.result?.price_impact_value || new BN(0);
              const price_impact_amount =
                item.swapData?.result?.price_impact_amount || new BN(0);
              const swap_fee_amount_for_pool =
                item.swapData?.result?.token_in_fees?.fee_amount_for_pool ||
                new BN(0);
              const swap_fee_amount_for_receiver =
                item.swapData?.result?.token_in_fees?.fee_amount_for_receiver ||
                new BN(0);
              swaPpriceImpactValue =
                swaPpriceImpactValue.add(price_impact_value);
              priceImpactAmount = priceImpactAmount.add(price_impact_amount);
              swapFeeAmount = swapFeeAmount
                .add(swap_fee_amount_for_pool)
                .add(swap_fee_amount_for_receiver);
            });
            const borrowingFeeAmount =
              result?.reportData?.fees?.borrowing?.fee_amount.toString();
            const fundingFeeAmount =
              result?.reportData?.fees?.funding?.amount.toString();
            const swapFee = swapFeeAmount?.mul(
              new BN(payerSwapTokenInfo?.minPrice || '0')
            );
            const borrowingFee = new BN(borrowingFeeAmount?.toString())?.mul(
              new BN(payerSwapTokenInfo?.minPrice || '0')
            );
            const fundingFee = new BN(fundingFeeAmount?.toString())?.mul(
              new BN(10).pow(new BN(payTokenDecimals))
            );
            const priceImpactValue =
              result?.reportData?.execution?.price_impact_value;
            const price_impact_value = formatUsdToKMB(priceImpactValue);
            const priceImpactRateBN = priceImpactValue
              .mul(new BN(10).pow(new BN(20)))
              .div(tradeMoney);
            const priceImpactRate = formatRatePercentage(priceImpactRateBN, 3, {
              signed: true,
            });
            const currentUnitPrice = limitPrice
              ? limitPrice
              : tokenPriceMap.get(indexTokenData?.indexToken)?.unitPrice;
            const acceptablePriceBn = applySlippageToPrice(
              slippage,
              new BN(currentUnitPrice),
              true,
              marketDirection === 'Long'
            );
            const BnFees = new BN(orderFee)
              .add(swapFee)
              .add(new BN(swaPpriceImpactValue))
              .add(borrowingFee)
              .add(fundingFee);
            const Fees = formatPriceUsd(BnFees);
            const data = {
              executionPrice: etPrice,
              executionPriceExtended: etPriceExtended,
              liquidationPrice: lqPrice,
              priceImpactRate: priceImpactRate,
              Fees: Fees,
              netWorkFee: '-',
              acceptablePriceBn,
              indexTokenDecimals: indexDecimals,
              price_impact_value,
              isLongFeesRate,
              ...result,
            };
            if (isLatestRequest()) {
              setSimulationData(data);
            }
          } else {
            if (isLatestRequest()) {
              setSimulationData({});
            }
          }
        } catch (error) {
          if (isLatestRequest()) {
            setSimulationData({});
          }
        }
      } else {
        if (isLatestRequest()) {
          setSimulationData({});
        }
      }
    };

    const timeoutId = window.setTimeout(fetchSimulation, SIMULATION_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    // tradeMoney,
    // marketType,
    // marketDirection,
    // slippage,
    // isSwap,
    // marketBase64Map,
    // collateralToken,
    // indexTokenData,
    // selectSwapPayToken,
    // payerSwapList,

    payTokenNum,
    sizeNumber,
    tradeMoney,
    graphObj,
    limitPrice,
    marketType,
    marketDirection,
    slippage,
    isSwap,
    // marketBase64Map,
    collateralToken,
    // indexTokenData,
    selectSwapPayToken,
    selectSwapReceiveToken,
    // payerSwapList,
    currentPositionStr,
    indexTokenData?.indexToken,
    marketInfo?.marketToken,
    payerSwapTokenInfo?.amount,
    payerSwapTokenInfo?.tokenAddress,
    priorityFees,
    simulationPriceKey,
  ]);
};
