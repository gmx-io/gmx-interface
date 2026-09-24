import { useEffect } from 'react';
import { useAppStore } from '@/zustand/useAppStore';
import { BN } from '@coral-xyz/anchor';
import { useShallow } from 'zustand/react/shallow';
import { formatUsdToKMB, formatPercentage } from '@/utils/legacy';
import { getGmw399Enabled } from '@/config/featureFlagEnable';

const emptyTpsl = {
  tpGainMoney: '',
  slLossMoney: '',
  tpGainRate: '',
  slLossRate: '',
};

export const useTpslCalculator = () => {
  const {
    tradeMoney,
    marketDirection,
    leverage,
    sizeNumber,
    simulationData,
    marketType,
    limitPrice,
    payTokenNum,
  } = useAppStore(useShallow((state) => state.TradeboxNew));

  const {
    tpPrice,
    slPrice,
    enableTpsl,
    setTpsl,
  } = useAppStore(useShallow((state) => state.tpSlTokens));
  const { indexToken } = useAppStore(useShallow((state) => state.indexTokens));
  const { tokenPriceMap } = useAppStore(useShallow((state) => state.tickersState));
  const { payerSwapTokenInfo } = useAppStore(useShallow((state) => state.payerSwapTokens));

  useEffect(() => {
    (() => {
      if (!tradeMoney?.gt(new BN(0))) {
        return;
      }
      if (enableTpsl) {
        let execution_price = new BN(0);
        if (marketType === 'Limit') {
          execution_price = limitPrice;
        } else {
          execution_price =
            simulationData?.reportData?.execution?.execution_price;
        }
        const payTokenPrice = tokenPriceMap.get(payerSwapTokenInfo?.tokenAddress)?.unitPrice;
        if (getGmw399Enabled()) {
          if (
            payTokenNum == null ||
            sizeNumber == null ||
            payTokenPrice == null ||
            execution_price == null
          ) {
            setTpsl(emptyTpsl);
            return;
          }
        }
        const payMoney = new BN(payTokenPrice).mul(payTokenNum);
        if (!getGmw399Enabled() && execution_price === undefined) {
          setTpsl(emptyTpsl);
        } else {
          if (marketDirection === 'Long') {
            const tpGainMoney = tpPrice
              ? tpPrice?.sub(execution_price || new BN(0)).mul(sizeNumber)
              : new BN(0);
            const slLossMoney = slPrice
              ? slPrice?.sub(execution_price || new BN(0)).mul(sizeNumber)
              : new BN(0);
            const tpGainRate =
              tpGainMoney
                ?.mul(new BN(10000))
                .div(payMoney)

            const slLossRate =
              slLossMoney
                ?.mul(new BN(10000))
                .div(payMoney)
            const tpsl = {
              tpGainMoney: tpGainMoney?.gt(new BN(0))
                ? '+' + formatUsdToKMB(tpGainMoney)
                : formatUsdToKMB(tpGainMoney),
              slLossMoney: slLossMoney?.gt(new BN(0))
                ? '+' + formatUsdToKMB(slLossMoney)
                : formatUsdToKMB(slLossMoney),
              tpGainRate:
                tpGainRate?.gt(new BN(0))
                  ? (formatPercentage(Number(tpGainRate), 2) !== '-' ? ('+' + formatPercentage(Number(tpGainRate), 2)) : '< 0.10%')
                  : (formatPercentage(Number(tpGainRate), 2) !== '-' ? ('-' + formatPercentage(Number(tpGainRate), 2)) : '< 0.10%'),
              slLossRate:
                slLossRate?.gt(new BN(0))
                  ? (formatPercentage(Number(slLossRate), 2) !== '-' ? ('+' + formatPercentage(Number(slLossRate), 2)) : '< 0.10%')
                  : (formatPercentage(Number(slLossRate), 2) !== '-' ? ('-' + formatPercentage(Number(slLossRate), 2)) : '< 0.10%'),
            };
            setTpsl(tpsl);
          }
          if (marketDirection === 'Short') {
            const tpGainMoney = tpPrice
              ? execution_price
                ?.sub(tpPrice)
                .mul(sizeNumber) : new BN(0);
            const slLossMoney = slPrice
              ? execution_price
                ?.sub(slPrice)
                .mul(sizeNumber)
              : new BN(0);
            const tpGainRate =
              tpGainMoney
                ?.mul(new BN(10000))
                .div(payMoney)
            const slLossRate =
              slLossMoney
                ?.mul(new BN(10000))
                .div(payMoney)
            const tpsl = {
              tpGainMoney: tpGainMoney?.gt(new BN(0))
                ? '+' + formatUsdToKMB(tpGainMoney)
                : formatUsdToKMB(tpGainMoney),
              slLossMoney: slLossMoney?.gt(new BN(0))
                ? '+' + formatUsdToKMB(slLossMoney)
                : formatUsdToKMB(slLossMoney),
              tpGainRate:
                tpGainRate?.gt(new BN(0))
                  ? (formatPercentage(Number(tpGainRate), 2) !== '-' ? '+' + formatPercentage(Number(tpGainRate), 2) : `< 0.10%`)
                  : (formatPercentage(Number(tpGainRate), 2) !== '-' ? '-' + formatPercentage(Number(tpGainRate), 2) : `< 0.10%`),
              slLossRate:
                slLossRate?.gt(new BN(0))
                  ? (formatPercentage(Number(slLossRate), 2) !== '-' ? '+' + formatPercentage(Number(slLossRate), 2) : `< 0.10%`)
                  : (formatPercentage(Number(slLossRate), 2) !== '-' ? '-' + formatPercentage(Number(slLossRate), 2) : `< 0.10%`),
            };
            setTpsl(tpsl);
          }
        }

      } else {
        setTpsl(emptyTpsl);
      }
    })();
  }, getGmw399Enabled()
    ? [
      tradeMoney,
      tpPrice,
      slPrice,
      enableTpsl,
      leverage,
      sizeNumber,
      payTokenNum,
      simulationData,
      marketDirection,
      marketType,
      limitPrice,
      tokenPriceMap,
      payerSwapTokenInfo,
      indexToken,
      setTpsl,
    ]
    : [
      tradeMoney,
      tpPrice,
      slPrice,
      enableTpsl,
      leverage,
      sizeNumber,
      simulationData,
      marketDirection,
      indexToken,
      setTpsl,
    ]);
};
