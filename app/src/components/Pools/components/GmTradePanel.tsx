/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import { getGmw291Enabled, getGmw272Enabled } from '@/config/featureFlagEnable';
import React, { useEffect, useMemo, useState } from 'react';

import { Trans, t } from '@lingui/macro';
import Tab from '@/components/Common/Tab/Tab';
import BuyInputSection from '@/components/Common/Input/BuyInputSection';
import { ExchangeInfo } from '@/components/Exchange/ExchangeInfo';
import CellSkeleton from '@/components/Common/Skeleton/CellSkeleton';
import ExchangeInfoRow from '@/components/Exchange/ExchangeInfoRow';
import TooltipWithPortal from '@/components/Common/Tooltip/TooltipWithPortal';
import TokenIcon from '@/components/Common/TokenIcon/TokenIcon';
import InfoSvg from '@/components/TradeBoxNew/assets/Info.svg';
import { BN } from '@coral-xyz/anchor';
import { useMarkets } from '../Hooks/useMarkets';
import { usePriorityFees } from '../Hooks/usePriorityFees';
import TokenSelectDrawer from '@/components/Pools/components/TokenSelectDrawer';
import { getGraphObj } from '@/components/TradeBoxNew/utils/getRpcOrSdkParams';
import { usePayer } from '@/components/TradeBoxNew/Hooks/usePayer';
import { getBalanceMap } from '../utils/getBalanceMap';
import { formatMarketName } from '@/components/TradeBoxNew/utils/formatMarketName';
import { isUSMarketOpen, isMetalMarketOpen, isCommodityMarketOpen } from '@/components/TradeBoxNew/utils/isUSMarketOpen';
import {
  formatAmount,
  formatToKMBWithoutUsd,
  formatPercentage,
  formatAmountWithOutReg,
  formatUsd,
  formatParseUsdToBN,
} from '@/utils/legacy';
import {
  decodeDepositReport,
  decodeWithdrawReport,
} from '@/components/Pools/utils/analyze';
import { getNormalizedTokenSymbolGMX } from '@/utils/token/getNormalizedTokenSymbolGMX';
import { GMX_SOLANA_TOKENS_RAW } from '@/config/program';
import IconChevronDown from '@/img/trade/chevron-down.svg?react';
import { useTokenPriceMap } from '../Hooks/useTokenPriceMap';
import { usePayerSwapList } from '../Hooks/usePayerSwapList';
import { useTokenBalances } from '../Hooks/useTokenBalances';
import { useMultipMarketBase64 } from '@/components/Pools/Hooks/useMultipMarketBase64';
import { formatInput } from '@/components/TradeBoxNew/utils/formatInput';
import { useComputeUnits } from '@/hooks/utilsHooks/useComputeUnits';
import ExchangeButton from '@/components/Pools/components/ExchangeButton';
import { useAppStore } from '@/zustand/useAppStore';
import { useMedia } from 'react-use';
import './ButtonInput.scss'
import { BN_ZERO } from '@solana/spl-governance';
import { applySlippageToMinOut } from '@/utils/tradebox/applySlippageToMinOut';

type OperationType = 'Buy' | 'Sell' | 'Shift';
type ModeType = 'Single' | 'Pair';
type PoolType = 'GLV' | 'GM';

const bnZero = new BN(0);

function divOrZero(
  value: BN | undefined,
  divisor: BN | number | string | undefined | null,
  mainnetFallbackDivisor = 0
) {
  const divisorBn = new BN(divisor || mainnetFallbackDivisor);

  return value && divisorBn.gt(bnZero) ? value.div(divisorBn) : bnZero;
}

interface GmTradePanelProps {
  localizedOperationLabels: Record<string, React.ReactNode>;
  operation: OperationType;
  operationClassNames: Record<string, any>;
  onOperationChange: (op: OperationType) => void;

  localizedModeLabels: Record<string, React.ReactNode> | string[];
  poolType: PoolType;

  isExecutionDetailsOpen: boolean;
  onToggleExecutionDetails: (data: any) => void;
  poolData: any;
  setDetailPoolInfo: (poolInfo: any) => void;
  onToggleMobileTrade?: () => void;
  onGlvTokenSelected?: (token: any) => void;
  availableOperations?: string[];
  isMobileTradeOpen?: boolean;
}

const GmTradePanel: React.FC<GmTradePanelProps> = ({
  localizedOperationLabels,
  operation,
  operationClassNames,
  onOperationChange,
  localizedModeLabels,
  poolType,
  poolData,
  setDetailPoolInfo,
  onToggleMobileTrade,
  onGlvTokenSelected,
  availableOperations,

}) => {
  const isGmw291Enabled = getGmw291Enabled();
  const { gmListData, glvListData, glvPriceMap } = useAppStore((state) => state.pools);
  const isGmw272Enabled = getGmw272Enabled();
  const slippage = useAppStore((state) => state.TradeboxNew.slippage);
  const { balanceMap } = getBalanceMap();
  const payerSwapList = usePayerSwapList();
  const { tokenPriceMap } = useTokenPriceMap();
  const { allMarketInfos, marketInfosMap } = useMarkets();
  const marketBase64Map = useMultipMarketBase64();
  const { address, connected } = usePayer();
  const priorityFees = usePriorityFees();
  const { computeUnits, computeUnitPrice } = useComputeUnits();
  const computeUnitPriceNum = useMemo(
    () =>
      new BN(computeUnits).mul(new BN(computeUnitPrice)).div(new BN(1000000)),
    [computeUnits, computeUnitPrice]
  );
  const baseFeeNum = useMemo(() => new BN(5000), []);
  const totalFeeNum = computeUnitPriceNum.add(baseFeeNum);
  const netWorkFeeBn = useMemo(
    () =>
      totalFeeNum.mul(
        new BN(
          tokenPriceMap['So11111111111111111111111111111111111111112']
            ?.unitPrice || new BN(0)
        )
      ),
    [totalFeeNum, tokenPriceMap]
  );
  const netWorkFee = useMemo(
    () => formatAmount(netWorkFeeBn, 20, 4),
    [netWorkFeeBn]
  );
  const isScreen1024 = useMedia('(max-width: 1024px)');
  const [poolInfo, setPoolInfo] = useState<any>(poolData);
  const [hasChangePay, setHasChangePay] = useState<boolean>(false);
  const [hasChangePool, setHasChangePool] = useState<boolean>(false);
  const [btnMessage, setBtnMessage] = useState<string>('Enter an amount');
  const [btnDisabled, setBtnDisabled] = useState<boolean>(true);
  const [usMarketLocked, setUsMarketLocked] = useState<boolean>(false);
  const [simulatorData, setSimulatorData] = useState<any>({});
  const [gmBuyPairDepositParams, setGmBuyPairDepositParams] = useState<{}>({});
  const [gmBuySingleDepositParams, setGmBuySingleDepositParams] = useState<{}>(
    {}
  );
  const [graph, setGraph] = useState<any>(null);
  const [mode, setMode] = useState<ModeType>('Single');
  const [selectType, setSelectType] = useState<string>('pay');
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [tokenSelectTitle, setTokenSelectTitle] = useState<string>('Pay');
  const [tokenSelectTokens, setTokenSelectTokens] = useState<any[]>([]);
  const [payInfo, setPayInfo] = useState<any>(tokenSelectTokens[0] || {});
  const [gmPoolInfo, setGmPoolInfo] = useState<any>();
  const [gmPoolList, setGmPoolList] = useState<any[]>([]);
  const [gmBuySinglePayAmount, setGmBuySinglePayAmount] = useState<string>('');
  const [gmBuySinglePayAmountBN, setGmBuySinglePayAmountBN] = useState<BN>(
    new BN(0)
  );
  const [needSubFees, setNeedSubFees] = useState<BN>(new BN(0));
  const [hasGmSinglePayChange, setHasGmSinglePayChange] =
    useState<boolean>(false);
  const [gmBuySingleTradeMoney, setGmBuySingleTradeMoney] = useState<BN>(
    new BN(0)
  );
  const [gmBuySingleReceiveAmount, setGmBuySingleReceiveAmount] =
    useState<string>('');
  const [gmBuySingleReceiveAmountBN, setGmBuySingleReceiveAmountBN] =
    useState<BN>(new BN(0));
  const [hasGmBuyPairPayChange, setHasGmBuyPairPayChange] =
    useState<boolean>(false);
  const [buyPairLong, setBuyPairLong] = useState<any>(null);
  const [buyPairShort, setBuyPairShort] = useState<any>(null);
  const [pairTradeMoneyLong, setPairTradeMoneyLong] = useState<BN>(new BN(0));
  const [pairTradeMoneyShort, setPairTradeMoneyShort] = useState<BN>(new BN(0));
  const [pairTradeMoney, setPairTradeMoney] = useState<BN>(new BN(0));
  const [buyPairLongAmount, setBuyPairLongAmount] = useState<string>('');
  const [buyPairLongAmountBN, setBuyPairLongAmountBN] = useState<BN>(new BN(0));
  const [buyPairShortAmount, setBuyPairShortAmount] = useState<string>('');
  const [buyPairShortAmountBN, setBuyPairShortAmountBN] = useState<BN>(
    new BN(0)
  );
  const [pairReceiveAmount, setPairReceiveAmount] = useState<string>('');
  const [pairReceiveAmountBN, setPairReceiveAmountBN] = useState<BN>(new BN(0));
  const [hasChangeBuyPairLong, setHasChangeBuyPairLong] =
    useState<boolean>(false);
  // sell
  const [hasChangeSellReceiveLong, setHasChangeSellReceiveLong] = useState<boolean>(false);
  const [hasChangeSellReceiveShort, setHasChangeSellReceiveShort] = useState<boolean>(false);
  const [sellPayAmount, setSellPayAmount] = useState<string>('');
  const [sellPayAmountBN, setSellPayAmountBN] = useState<BN>(new BN(0));
  const [sellReceiveLongAmount, setSellReceiveLongAmount] =
    useState<string>('');
  const [sellReceiveShortAmount, setSellReceiveShortAmount] =
    useState<string>('');
  const [sellReceiveLongAmountBN, setSellReceiveLongAmountBN] = useState<BN>(
    new BN(0)
  );
  const [sellReceiveShortAmountBN, setSellReceiveShortAmountBN] = useState<BN>(
    new BN(0)
  );
  const [sellSimulatorParams, setSellSimulatorParams] = useState<{}>({});
  const [sellTradeMoney, setSellTradeMoney] = useState<BN>(new BN(0));
  const [sellLongTradeMoney, setSellLongTradeMoney] = useState<BN>(new BN(0));
  const [sellShortTradeMoney, setSellShortTradeMoney] = useState<BN>(new BN(0));

  // shift
  const [shiftPayAmount, setShiftPayAmount] = useState<string>('');
  const [shiftPayAmountBN, setShiftPayAmountBN] = useState<BN>(new BN(0));
  const [shiftReceiveAmount, setShiftReceiveAmount] = useState<string>('');
  const [shiftReceiveAmountBN, setShiftReceiveAmountBN] = useState<BN>(
    new BN(0)
  );
  const [shiftSimulatorParams, setShiftSimulatorParams] = useState<{}>({});
  const [shiftReceiveInfo, setShiftReceiveInfo] = useState<any>({});
  const [shiftTradeMoney, setShiftTradeMoney] = useState<BN>(new BN(0));
  const [hasChangeShiftPool, setHasChangeShiftPool] = useState<boolean>(false);
  const wrapToWsol = (token: string) => {
    if (token === 'So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH') {
      return 'So11111111111111111111111111111111111111112';
    }
  };
  const isBuySingle = operation === 'Buy' && mode === 'Single';
  const isBuyPair = operation === 'Buy' && mode === 'Pair';
  const isSell = operation === 'Sell';
  const isShift = operation === 'Shift';
  const poolPayTokenAddresses = useMemo(
    () =>
      Array.from(
        new Set([poolInfo?.longToken, poolInfo?.shortToken].filter(Boolean))
      ),
    [poolInfo?.longToken, poolInfo?.shortToken]
  );
  const poolPayTokenBalances = useTokenBalances(
    poolPayTokenAddresses,
    poolPayTokenAddresses
  );
  const capUsdByCalcBn = new BN(sessionStorage.getItem('capUsdByCalc') || '0');
  const gmSellableAmountUsd = new BN(sessionStorage.getItem('gmSellableAmountUsd') || '0');
  const gmBuyableAmountText = useMemo(() => {
    const tvlUsdBn = new BN(poolData?.tvlUsdBnStr?.toString() || '0');
    const marketPriceBn = new BN(poolData?.marketPrice?.toString() || '0');
    const marketDecimals = poolData?.marketDecimals || 0;
    const buyableUsdBn = capUsdByCalcBn.gt(tvlUsdBn)
      ? capUsdByCalcBn.sub(tvlUsdBn)
      : new BN(0);
    const buyableAmountBn = marketPriceBn.gt(new BN(0))
      ? buyableUsdBn.div(marketPriceBn).mul(new BN(10).pow(new BN(marketDecimals)))
      : new BN(0);

    return `${formatToKMBWithoutUsd(buyableAmountBn, marketDecimals, { displayDecimals: 2 })} GM`;
  }, [capUsdByCalcBn, poolData?.tvlUsdBnStr, poolData?.marketPrice, poolData?.marketDecimals]);
  const gmBuyableUsdText = useMemo(() => {
    const tvlUsdBn = new BN(poolData?.tvlUsdBnStr?.toString() || '0');
    const buyableUsdBn = capUsdByCalcBn.gt(tvlUsdBn)
      ? capUsdByCalcBn.sub(tvlUsdBn)
      : new BN(0);
    return `($${formatToKMBWithoutUsd(buyableUsdBn, 20, { displayDecimals: 2 })})`;
  }, [capUsdByCalcBn, poolData?.tvlUsdBnStr]);
  const gmSellableAmountText = useMemo(() => {
    const marketPriceBn = new BN(poolData?.marketPrice?.toString() || '0');
    const marketDecimals = poolData?.marketDecimals || 0;
    const sellableAmountBn = marketPriceBn.gt(new BN(0))
      ? gmSellableAmountUsd.div(marketPriceBn).mul(new BN(10).pow(new BN(marketDecimals)))
      : new BN(0);

    return `${formatToKMBWithoutUsd(sellableAmountBn, marketDecimals, { displayDecimals: 2 })} GM`;
  }, [gmSellableAmountUsd, poolData?.marketPrice, poolData?.marketDecimals]);
  const gmSellableUsdText = useMemo(
    () => `($${formatToKMBWithoutUsd(gmSellableAmountUsd, 20, { displayDecimals: 2 })})`,
    [gmSellableAmountUsd]
  );
  useEffect(() => {
    if (usMarketLocked) {
      setBtnDisabled(true);
      setBtnMessage(t`Market Is Not Open`);
      return;
    }
    if (!connected) {
      setBtnDisabled(false);
      setBtnMessage(t`Connect Wallet`);
    } else {
      setBtnDisabled(true);
      setBtnMessage(t`Enter an amount`);
    }
  }, [connected, usMarketLocked]);
  useEffect(() => {
    const marketInfo = marketInfosMap.get(poolInfo?.marketToken);
    if (isShift) {
      if (marketInfo?.closed || shiftReceiveInfo?.closed) {
        setUsMarketLocked(true);
        setBtnDisabled(true);
        setBtnMessage(t`Market Is Not Open`);
      } else {
        setUsMarketLocked(false);
      }
      return;
    }
    if (marketInfo?.closed) {
      setUsMarketLocked(true);
      setBtnDisabled(true);
      setBtnMessage(t`Market Is Not Open`);
    } else {
      setUsMarketLocked(false);
    }
  }, [shiftReceiveInfo, isShift, marketInfosMap]);

  // refresh amount
  useEffect(() => {
    if (hasGmSinglePayChange) {
      const marketPrice =
        marketInfosMap?.get(poolInfo?.marketToken)?.marketPrice || 0;
      const receiveAmount = divOrZero(
        gmBuySingleTradeMoney?.mul(new BN(10).pow(new BN(poolInfo?.marketDecimals || 0))),
        marketPrice
      );
      setGmBuySingleReceiveAmount(
        receiveAmount?.gt(new BN(0))
          ? formatAmount(receiveAmount, poolInfo?.marketDecimals, 4)
          : ''
      );
      setGmBuySingleReceiveAmountBN(receiveAmount);
    } else {
      const payPrice = new BN(payInfo?.price || 0);
      if (payPrice?.gt(new BN(0))) {
        const payAmountBN = gmBuySingleTradeMoney?.div(payPrice);
        setGmBuySinglePayAmountBN(payAmountBN);
        setGmBuySinglePayAmount(
          payAmountBN?.gt(new BN(0))
            ? formatAmount(payAmountBN, payInfo?.decimals, 4)
            : ''
        );
      }
    }
  }, [setHasGmSinglePayChange, allMarketInfos]);

  useEffect(() => {
    if (hasGmBuyPairPayChange) {
      const marketPrice =
        marketInfosMap?.get(poolInfo?.marketToken)?.marketPrice || 0;
      const receiveAmount = divOrZero(
        pairTradeMoney?.mul(new BN(10).pow(new BN(poolInfo?.marketDecimals || 0))),
        marketPrice
      );
      setPairReceiveAmount(
        receiveAmount?.gt(new BN(0))
          ? formatAmount(receiveAmount, poolInfo?.marketDecimals, 4)
          : ''
      );
      setPairReceiveAmountBN(receiveAmount);
    } else {
      if (
        buyPairLongAmountBN.eq(new BN(0)) &&
        buyPairShortAmountBN.eq(new BN(0))
      ) {
        const halfTradeMoney = pairTradeMoney.div(new BN(2));
        const payLongAmount = new BN(buyPairLong?.price || 0).gt(new BN(0))
          ? divOrZero(halfTradeMoney, buyPairLong?.price)
          : new BN(0);
        const payShortAmount = new BN(buyPairShort?.price || 0).gt(new BN(0))
          ? divOrZero(halfTradeMoney, buyPairShort?.price)
          : new BN(0);
        setPairTradeMoneyLong(halfTradeMoney);
        setBuyPairLongAmount(
          payLongAmount?.gt(new BN(0))
            ? formatAmount(payLongAmount, buyPairLong?.decimals || 0, 4).toString()
            : ''
        );
        setPairTradeMoneyShort(halfTradeMoney);
        setBuyPairShortAmount(
          payShortAmount?.gt(new BN(0))
            ? formatAmount(
              payShortAmount,
              buyPairShort?.decimals || 0,
              4
            ).toString()
            : ''
        );
      } else if (
        buyPairLongAmountBN.eq(new BN(0)) &&
        buyPairShortAmountBN.gt(new BN(0))
      ) {
        const payShortAmount = new BN(buyPairShort?.price || 0).gt(new BN(0))
          ? divOrZero(pairTradeMoney, buyPairShort?.price)
          : new BN(0);
        setPairTradeMoneyShort(pairTradeMoney);
        setBuyPairShortAmount(
          payShortAmount?.gt(new BN(0))
            ? formatAmount(
              payShortAmount,
              buyPairShort?.decimals || 0,
              4
            ).toString()
            : ''
        );
      } else if (
        buyPairLongAmountBN.gt(new BN(0)) &&
        buyPairShortAmountBN.eq(new BN(0))
      ) {
        const payLongAmount = new BN(buyPairLong?.price || 0).gt(new BN(0))
          ? divOrZero(pairTradeMoney, buyPairLong?.price)
          : new BN(0);
        setPairTradeMoneyLong(pairTradeMoney);
        setBuyPairLongAmount(
          payLongAmount?.gt(new BN(0))
            ? formatAmount(payLongAmount, buyPairLong?.decimals || 0, 4).toString()
            : ''
        );
      } else if (
        buyPairLongAmountBN.gt(new BN(0)) &&
        buyPairShortAmountBN.gt(new BN(0))
      ) {
        const ratioDenominator = buyPairShortAmountBN.mul(new BN(buyPairShort?.price || 0));
        const ratio = divOrZero(
          buyPairLongAmountBN.mul(new BN(buyPairLong?.price || 0)),
          ratioDenominator
        );
        const payShortMoney = new BN(buyPairShort?.price || 0).gt(new BN(0)) && ratio.gt(bnZero)
          ? pairTradeMoney.div(ratio.add(new BN(1)))
          : new BN(0);
        const payLongMoney = pairTradeMoney.sub(payShortMoney);
        const payLongAmount = new BN(buyPairLong?.price || 0).gt(new BN(0))
          ? divOrZero(payLongMoney, buyPairLong?.price)
          : new BN(0);
        const payShortAmount = new BN(buyPairShort?.price || 0).gt(new BN(0))
          ? divOrZero(payShortMoney, buyPairShort?.price)
          : new BN(0);
        setPairTradeMoneyLong(payLongMoney);
        setBuyPairLongAmount(
          payLongAmount?.gt(new BN(0))
            ? formatAmount(payLongAmount, buyPairLong?.decimals || 0, 4).toString()
            : ''
        );
        setPairTradeMoneyShort(payShortMoney);
        setBuyPairShortAmount(
          payShortAmount?.gt(new BN(0))
            ? formatAmount(
              payShortAmount,
              buyPairShort?.decimals || 0,
              4
            ).toString()
            : ''
        );
      }
    }
  }, [hasGmBuyPairPayChange, allMarketInfos]);

  // init all gms
  useEffect(() => {
    if (!isShift) {
      return;
    }
    if (allMarketInfos?.length > 0) {
      const list = allMarketInfos
        ?.map((item: any) => {
          if (
            item?.longToken === poolInfo?.longToken &&
            item?.shortToken === poolInfo?.shortToken
          ) {
            const amt = balanceMap?.get(item.marketToken) || new BN(0);
            const priceBN = new BN(item?.marketPrice || 0);
            const mdec = new BN(item?.marketDecimals || 0);
            const scale = new BN(10).pow(mdec);
            const valueBN = amt.mul(priceBN).div(scale);
            return {
              ...item,
              tokenName: GMX_SOLANA_TOKENS_RAW[item?.indexToken]?.symbol || '',
              tokenAddress: item.marketToken,
              price: item?.marketPrice,
              amount: amt,
              decimals: GMX_SOLANA_TOKENS_RAW[item.marketToken]?.decimals || 0,
              type: 'gm',
              showName: [
                (GMX_SOLANA_TOKENS_RAW[item.longToken]?.symbol === 'WGMX' ? 'GMX' : GMX_SOLANA_TOKENS_RAW[item.longToken]?.symbol) +
                '-' +
                GMX_SOLANA_TOKENS_RAW[item.shortToken]?.symbol,
              ],
              valueBN,
              value: valueBN.toString(),
            };
          }
        })?.filter((item: any) => item)?.sort((a: any, b: any) => {
          const cmp = b.valueBN.cmp(a.valueBN);
          if (cmp !== 0) return cmp;
          const aSym = (GMX_SOLANA_TOKENS_RAW[a.indexToken]?.symbol || '').toString();
          const bSym = (GMX_SOLANA_TOKENS_RAW[b.indexToken]?.symbol || '').toString();
          return aSym.localeCompare(bSym);
        });
      const glvList = glvListData?.filter((item: any) => item?.longToken === poolInfo?.longToken && item?.shortToken === poolInfo?.shortToken)?.map((item: any) => {
        const amount = balanceMap?.get(item.glvToken) || new BN(0);
        const glvPrice = glvPriceMap.get(item?.glvToken) || new BN(0);
        const valueBN = amount.mul(glvPrice);
        return {
          ...item,
          marketToken: item.glvToken,
          tokenName: item.glvToken,
          isNotGm: true,
          showName: [
            (GMX_SOLANA_TOKENS_RAW[item.longToken]?.symbol === 'WGMX' ? 'GMX' : GMX_SOLANA_TOKENS_RAW[item.longToken]?.symbol) +
            '-' +
            GMX_SOLANA_TOKENS_RAW[item.shortToken]?.symbol,
          ],
          valueBN,
          amount,
        };
      });
      const newList = list?.concat(glvList);
      const gmPList = newList.sort((a: any, b: any) => {
        const cmp = b.valueBN.cmp(a.valueBN);
        if (cmp !== 0) return cmp;
        const aSym = (GMX_SOLANA_TOKENS_RAW[a.indexToken]?.symbol || '').toString();
        const bSym = (GMX_SOLANA_TOKENS_RAW[b.indexToken]?.symbol || '').toString();
        return aSym.localeCompare(bSym);
      });
      setGmPoolList(gmPList);
      if (!hasChangeShiftPool) {
        setShiftReceiveInfo(list?.filter(i => i.marketToken !== poolInfo?.marketToken)[0]);
      }
    }
  }, [allMarketInfos, operation]);
  // init glv buy pair
  useEffect(() => {
    const short = tokenSelectTokens.find(
      (item: any) => item.type === 'shortToken'
    );
    setBuyPairShort(short);
    if (!hasChangeBuyPairLong) {
      const long = tokenSelectTokens.find(
        (item: any) => item.type === 'longToken'
      );
      const wrap = tokenSelectTokens.find(
        (item: any) => item.type === 'wrapToken'
      );
      let pick = long;
      if (wrap && long) {
        if (!connected) {
          pick = wrap;
        } else {
          const la = new BN(long?.amount || 0);
          const wa = new BN(wrap?.amount || 0);
          pick = wa.gt(la) ? wrap : la.gt(wa) ? long : wrap;
        }
      } else if (wrap && !long) {
        pick = wrap;
      }
      setBuyPairLong(pick);
    }
  }, [operation, mode, tokenSelectTokens, connected, hasChangeBuyPairLong]);

  // buy single tradeMoney
  useEffect(() => {
    if (usMarketLocked) return;
    if (gmBuySingleTradeMoney?.gt(new BN(0))) {
      const tvlAllUsd = new BN(poolData?.tvlUsdBnStr?.toString()).add(gmBuySingleTradeMoney);
      console.log('tvlAllUsd', tvlAllUsd.toString())
      console.log('capUsdByCalcBn', capUsdByCalcBn.toString())
      if (tvlAllUsd?.gte(capUsdByCalcBn)) {
        setBtnDisabled(true);
        setBtnMessage(t`GM TVL Cap Reached`);
        return
      }
      setBtnDisabled(false);
      setBtnMessage('Buy GM');
    }
  }, [gmBuySingleTradeMoney, usMarketLocked, poolData?.tvlUsdBnStr]);

  // buy pair tradeMoney
  useEffect(() => {
    if (usMarketLocked) return;
    if (pairTradeMoney?.gt(new BN(0))) {
      const tvlAllUsd = new BN(poolData?.tvlUsdBnStr?.toString()).add(pairTradeMoney);
      if (tvlAllUsd?.gte(capUsdByCalcBn)) {
        setBtnDisabled(true);
        setBtnMessage(t`GM TVL Cap Reached`);
        return
      }
      setBtnDisabled(false);
      setBtnMessage('Buy GM');
    }
  }, [pairTradeMoney, usMarketLocked, poolData?.tvlUsdBnStr]);

  // buy sell tradeMoney
  useEffect(() => {
    if (usMarketLocked) return;
    const availableGm = new BN((balanceMap?.get(poolInfo?.marketToken) as any) || 0);
    if (sellPayAmountBN.gt(availableGm)) {
      setBtnDisabled(true);
      setBtnMessage(t`Insufficient balance`);
      return
    }
    if (sellTradeMoney?.gt(new BN(0)) && sellTradeMoney?.lte(gmSellableAmountUsd)) {
      setBtnDisabled(false);
      setBtnMessage('Sell GM');
    } else if (sellTradeMoney?.gt(gmSellableAmountUsd)) {
      setBtnDisabled(true);
      setBtnMessage(t`Exceeds Sellable Amount`);
    }
  }, [sellTradeMoney, usMarketLocked]);

  // buy shift tradeMoney
  useEffect(() => {
    if (usMarketLocked) return;
    if (shiftTradeMoney?.gt(new BN(0))) {
      setBtnDisabled(false);
      setBtnMessage('Shift GM');
    }
  }, [shiftTradeMoney, usMarketLocked]);

  useEffect(() => {
    resetGmUI();
    setSimulatorData({});
    setGmBuySingleDepositParams({});
    setGmBuyPairDepositParams({});
    setSellSimulatorParams({});
    setShiftSimulatorParams({});
  }, [operation]);

  useEffect(() => {
    if (usMarketLocked) return;
    let over = false;
    if (operation === 'Buy' && mode === 'Single') {
      const available = new BN((payInfo)?.amount || 0);
      if (gmBuySinglePayAmountBN.gt(available)) over = true;
    }
    if (operation === 'Buy' && mode === 'Pair') {
      const availLong = new BN((buyPairLong)?.amount || 0);
      const availShort = new BN((buyPairShort)?.amount || 0);
      if (buyPairLongAmountBN.gt(availLong) || buyPairShortAmountBN.gt(availShort)) over = true;
    }
    // if (operation === 'Sell') {
    // const availableGm = new BN((balanceMap?.get(poolInfo?.marketToken) as any) || 0);
    // if (sellPayAmountBN.gt(availableGm)) over = true;
    // }
    if (operation === 'Shift') {
      const availableGm = new BN((balanceMap?.get(poolInfo?.marketToken) as any) || 0);
      if (shiftPayAmountBN.gt(availableGm)) over = true;
    }
    if (over) {
      setBtnDisabled(true);
      setBtnMessage(t`Insufficient balance`);
    }
  }, [
    operation,
    mode,
    gmBuySinglePayAmountBN,
    buyPairLongAmountBN,
    buyPairShortAmountBN,
    sellPayAmountBN,
    shiftPayAmountBN,
    payInfo,
    buyPairLong,
    buyPairShort,
    balanceMap,
    poolInfo,
    usMarketLocked,
  ]);

  useEffect(() => {
    if (usMarketLocked) {
      setBtnDisabled(true);
      setBtnMessage(t`Market Is Not Open`);
    }
  }, [usMarketLocked]);

  useEffect(() => {
    if (usMarketLocked) return;
    if (operation === 'Buy' && mode === 'Single' && hasGmSinglePayChange) {
      const empty = !gmBuySinglePayAmount || gmBuySinglePayAmount.trim() === '';
      if (empty || gmBuySinglePayAmountBN.eq(new BN(0))) {
        setBtnDisabled(true);
        setBtnMessage(t`Enter an amount`);
        return;
      }
    }
    if (operation === 'Buy' && mode === 'Pair') {
      const longEmpty = !buyPairLongAmount || buyPairLongAmount.trim() === '';
      const shortEmpty = !buyPairShortAmount || buyPairShortAmount.trim() === '';
      if (longEmpty && shortEmpty) {
        setBtnDisabled(true);
        setBtnMessage(t`Enter an amount`);
        return;
      }
    }
    if (operation === 'Sell') {
      const empty = !sellPayAmount || sellPayAmount.trim() === '';
      if (empty || sellPayAmountBN.eq(new BN(0))) {
        setBtnDisabled(true);
        setBtnMessage(t`Enter an amount`);
        return;
      }
    }
    if (operation === 'Shift') {
      const empty = !shiftPayAmount || shiftPayAmount.trim() === '';
      if (empty || shiftPayAmountBN.eq(new BN(0))) {
        setBtnDisabled(true);
        setBtnMessage(t`Enter an amount`);
      }
    }
  }, [
    usMarketLocked,
    operation,
    mode,
    hasGmSinglePayChange,
    gmBuySinglePayAmount,
    gmBuySinglePayAmountBN,
    buyPairLongAmount,
    buyPairShortAmount,
    sellPayAmount,
    sellPayAmountBN,
    shiftPayAmount,
    shiftPayAmountBN,
  ]);

  const resetGmUI = () => {
    // single
    setGmBuySinglePayAmount('');
    setGmBuySinglePayAmountBN(new BN(0));
    setGmBuySingleReceiveAmount('');
    setGmBuySingleReceiveAmountBN(new BN(0));
    setGmBuySingleTradeMoney(new BN(0));

    // pair
    setBuyPairLongAmount('');
    setBuyPairLongAmountBN(new BN(0));
    setBuyPairShortAmount('');
    setBuyPairShortAmountBN(new BN(0));
    setPairTradeMoneyLong(new BN(0));
    setPairTradeMoneyShort(new BN(0));
    setPairTradeMoney(new BN(0));
    setPairReceiveAmount('');
    setPairReceiveAmountBN(new BN(0));

    // sell
    setSellPayAmount('');
    setSellPayAmountBN(new BN(0));
    setSellReceiveLongAmount('');
    setSellReceiveLongAmountBN(new BN(0));
    setSellReceiveShortAmount('');
    setSellReceiveShortAmountBN(new BN(0));
    setSellTradeMoney(new BN(0));
    setSellLongTradeMoney(new BN(0));
    setSellShortTradeMoney(new BN(0));

    // shift
    setShiftPayAmount('');
    setShiftPayAmountBN(new BN(0));
    setShiftReceiveAmount('');
    setShiftReceiveAmountBN(new BN(0));
    setShiftTradeMoney(new BN(0));

    setBtnDisabled(true);
    setBtnMessage(t`Enter an amount`);
  };

  // init graph
  useEffect(() => {
    void (async () => {
      if (!allMarketInfos?.length || !priorityFees || !marketBase64Map) {
        return;
      }
      const graph = await getGraphObj(
        allMarketInfos,
        new BN(0),
        marketBase64Map,
        priorityFees
      );
      if (!graph) {
        return;
      }
      setGraph(graph);
    })();
  }, [allMarketInfos, priorityFees, marketBase64Map]);

  // init simulator
  useEffect(() => {
    if (!graph) {
      return;
    }
    const simulator = graph?.to_simulator();
    if (!simulator) {
      return;
    }
    let depositSimulationOutput: any = {};
    let depositParams;
    let withDrawalParams;
    let shiftParams;
    if (isBuySingle) {
      if (payInfo?.type === 'longToken' || payInfo?.type === 'wrapToken') {
        depositParams = {
          market_token: gmPoolInfo?.marketToken,
          receiver: address,
          long_pay_token: wrapToWsol(payInfo?.tokenAddress),
          long_pay_amount: BigInt(gmBuySinglePayAmountBN.toString()) || 0n,
          min_receive_amount: BigInt(applySlippageToMinOut(slippage, gmBuySingleReceiveAmountBN).toString()) || 0n,
          skip_unwrap_native_on_receive: true,
          short_pay_token: poolInfo.shortToken,
          short_pay_amount: 0n,
          long_swap_path: [],
          short_swap_path: [],
        };
      } else if (payInfo?.type === 'shortToken') {
        depositParams = {
          market_token: gmPoolInfo?.marketToken,
          receiver: address,
          short_pay_token: payInfo?.tokenAddress,
          short_pay_amount: BigInt(gmBuySinglePayAmountBN.toString()) || 0n,
          min_receive_amount: BigInt(applySlippageToMinOut(slippage, gmBuySingleReceiveAmountBN).toString()) || 0n,
          skip_unwrap_native_on_receive: true,
          long_pay_token: poolInfo.longToken,
          long_pay_amount: 0n,
          long_swap_path: [],
          short_swap_path: [],
        };
      }
      setGmBuySingleDepositParams(depositParams);
    }

    if (isBuyPair) {
      depositParams = {
        market_token: gmPoolInfo?.marketToken,
        receiver: address,
        long_pay_token: wrapToWsol(payInfo?.type === 'wrapToken' ? payInfo?.tokenAddress : poolInfo.longToken),
        long_pay_amount: !pairReceiveAmountBN?.eq(BN_ZERO) ? BigInt(buyPairLongAmountBN.toString()) : 0n,
        skip_unwrap_native_on_receive: true,
        short_pay_token: poolInfo.shortToken,
        short_pay_amount: !pairReceiveAmountBN?.eq(BN_ZERO) ? BigInt(buyPairShortAmountBN.toString()) : 0n,
        min_receive_amount: BigInt(applySlippageToMinOut(slippage, pairReceiveAmountBN).toString()) || 0n,
        long_swap_path: [],
        short_swap_path: [],
      };
      console.log('depositParams', depositParams)
      setGmBuyPairDepositParams(depositParams);
    }

    if (isSell) {
      withDrawalParams = {
        market_token: gmPoolInfo?.marketToken,
        market_token_amount: BigInt(sellPayAmountBN.toString()) || 0n,
      };
      setSellSimulatorParams(withDrawalParams);
    }

    if (isShift) {
      shiftParams = {
        from_market_token: poolInfo?.marketToken,
        to_market_token: shiftReceiveInfo?.marketToken,
        from_market_token_amount: BigInt(shiftPayAmountBN.toString()) || 0n,
      };
      setShiftSimulatorParams(shiftParams);
      try {
        const res = simulator?.simulate_shift({
          params: shiftParams,
        });
        const depositReport = res?.deposit_report();
        const withdrawReport = res?.withdraw_report();
        const depositReportBuf = Buffer.from(depositReport, 'base64');
        const withdrawReportBuf = Buffer.from(withdrawReport, 'base64');
        const depositRes = decodeDepositReport(depositReportBuf);
        const withdrawRes = decodeWithdrawReport(withdrawReportBuf);
        console.log('depositRes', depositRes);
        console.log('withdrawRes', withdrawRes);
        const priceImpact = depositRes?.price_impact;
        const longPrice = tokenPriceMap[poolInfo?.longToken]?.unitPrice;
        const shortPrice = tokenPriceMap[poolInfo?.shortToken]?.unitPrice;
        const longFees = depositRes?.fees[0]?.fee_amount_for_pool
          ?.add(depositRes?.fees[0]?.fee_amount_for_receiver)
          ?.mul(new BN(longPrice));
        const shortFees = depositRes?.fees[1]?.fee_amount_for_pool
          ?.add(depositRes?.fees[1]?.fee_amount_for_receiver)
          ?.mul(new BN(shortPrice));
        const allFees = longFees?.add(shortFees);
        const _priceImpactRate = shiftTradeMoney?.gt(new BN(0))
          ? priceImpact?.mul(new BN(10000))?.div(shiftTradeMoney)
          : new BN(0);
        const priceImpactRate = _priceImpactRate.eq(new BN(0))
          ? '0.00%'
          : formatPercentage(Number(_priceImpactRate), 2);
        console.log('priceImpact', priceImpactRate?.toString());
        console.log('allFees', allFees?.toString());
        const long_token_amount =
          withdrawRes?.long_token_fees?.fee_amount_for_pool.add(
            withdrawRes?.long_token_fees?.fee_amount_for_receiver
          );
        const short_token_amount =
          withdrawRes?.short_token_fees?.fee_amount_for_pool.add(
            withdrawRes?.short_token_fees?.fee_amount_for_receiver
          );
        const withdrawAllFees = long_token_amount
          .mul(new BN(tokenPriceMap[poolInfo?.longToken]?.unitPrice || 0))
          .add(
            short_token_amount.mul(
              new BN(tokenPriceMap[poolInfo?.shortToken]?.unitPrice || 0)
            )
          );
        const _feesRate = shiftTradeMoney?.gt(new BN(0))
          ? allFees?.mul(new BN(10000)).div(shiftTradeMoney)
          : new BN(0);
        const feesRate = _feesRate
          ? formatPercentage(Number(_feesRate), 2)
          : '0.00%';
        console.log('withdrawAllFees', withdrawAllFees);
        setSimulatorData({
          allFees,
          feesRate,
          priceImpact,
          priceImpactRate,
          _priceImpactRate: '0.00%',
        });
        return;
      } catch (error) {
        console.log('error', error);
      }
    }

    try {
      if (isSell) {
        depositSimulationOutput = simulator.simulate_withdrawal({
          params: withDrawalParams,
        });

        if (!depositSimulationOutput || !depositSimulationOutput.report) {
          setSimulatorData({
            allFees: undefined,
            feesRate: '0.00%',
            priceImpact: undefined,
            priceImpactRate: '0.00%',
            _priceImpactRate: '0.00%',
          });
          setNeedSubFees(new BN(0));
          return;
        }

        const reportBuf = Buffer.from(
          depositSimulationOutput?.report(),
          'base64'
        );
        const withdrawReport = decodeWithdrawReport(reportBuf);
        const long_token_amount =
          withdrawReport?.long_token_fees?.fee_amount_for_pool.add(
            withdrawReport?.long_token_fees?.fee_amount_for_receiver
          );
        const short_token_amount =
          withdrawReport?.short_token_fees?.fee_amount_for_pool.add(
            withdrawReport?.short_token_fees?.fee_amount_for_receiver
          )
        const longMoney = long_token_amount
          .mul(new BN(tokenPriceMap[poolInfo?.longToken]?.unitPrice || 0))
        const shortMoney = short_token_amount
          .mul(new BN(tokenPriceMap[poolInfo?.shortToken]?.unitPrice || 0))
        const allFees = longMoney?.add(shortMoney);
        setNeedSubFees(allFees);
        const _feesRate = sellTradeMoney?.gt(new BN(0))
          ? allFees?.mul(new BN(10000)).div(sellTradeMoney)
          : new BN(0);
        const feesRate = _feesRate
          ? formatPercentage(Number(_feesRate), 2)
          : '0.00%';
        setSimulatorData({
          allFees,
          feesRate,
          priceImpact: new BN(0),
          priceImpactRate: new BN(0),
          _priceImpactRate: '0.00%',
        });
        return;
      } else {
        depositSimulationOutput = simulator.simulate_deposit({
          params: depositParams,
        });
      }
    } catch (error) {
      console.error(error);
    }
    if (!depositSimulationOutput || !depositSimulationOutput.report) {
      setSimulatorData({
        allFees: undefined,
        feesRate: '0.00%',
        priceImpact: undefined,
        priceImpactRate: '0.00%',
        _priceImpactRate: '0.00%',
      });
      setNeedSubFees(new BN(0));
      return;
    }
    const reportBuf = Buffer.from(depositSimulationOutput?.report(), 'base64');
    const res = decodeDepositReport(reportBuf);
    const priceImpact = res?.price_impact;
    const longPrice = tokenPriceMap[poolInfo?.longToken]?.unitPrice;
    const shortPrice = tokenPriceMap[poolInfo?.shortToken]?.unitPrice;
    const longFees = res?.fees[0]?.fee_amount_for_pool
      ?.add(res?.fees[0]?.fee_amount_for_receiver)
      ?.mul(new BN(longPrice));
    const shortFees = res?.fees[1]?.fee_amount_for_pool
      ?.add(res?.fees[1]?.fee_amount_for_receiver)
      ?.mul(new BN(shortPrice));
    const allFees = longFees?.add(shortFees);
    const needSubFees = priceImpact?.sub(allFees);
    setNeedSubFees(needSubFees);
    if (isBuySingle) {
      const _feesRate = gmBuySingleTradeMoney?.gt(new BN(0))
        ? allFees?.mul(new BN(10000)).div(gmBuySingleTradeMoney)
        : new BN(0);
      const feesRate = _feesRate
        ? (formatPercentage(Number(_feesRate), 2) === '-' ? '0.00%' : formatPercentage(Number(_feesRate), 2))
        : '0.00%';
      const _priceImpactRate = gmBuySingleTradeMoney?.gt(new BN(0))
        ? priceImpact?.mul(new BN(10000))?.div(gmBuySingleTradeMoney)
        : new BN(0);
      const priceImpactRate = _priceImpactRate.eq(new BN(0))
        ? '0.00%'
        : formatPercentage(Number(_priceImpactRate), 2);
      console.log('data', {
        allFees,
        feesRate,
        priceImpact,
        priceImpactRate,
        _priceImpactRate,
      })
      setSimulatorData({
        allFees,
        feesRate,
        priceImpact,
        priceImpactRate,
        _priceImpactRate,
      });
    }

    if (isBuyPair) {
      const _feesRate = pairTradeMoney?.gt(new BN(0))
        ? allFees?.mul(new BN(10000)).div(pairTradeMoney)
        : new BN(0);
      const feesRate = _feesRate
        ? formatPercentage(Number(_feesRate), 2)
        : '0.00%';
      const _priceImpactRate = pairTradeMoney?.gt(new BN(0))
        ? priceImpact?.mul(new BN(10000))?.div(pairTradeMoney)
        : new BN(0);
      const priceImpactRate = _priceImpactRate.eq(new BN(0))
        ? '0.00%'
        : formatPercentage(Number(_priceImpactRate), 2);
      console.log('pair', {
        allFees,
        feesRate,
        priceImpact,
        priceImpactRate,
        _priceImpactRate,
      })
      setSimulatorData({
        allFees,
        feesRate,
        priceImpact,
        priceImpactRate,
        _priceImpactRate,
      });
    }
  }, [gmBuySinglePayAmount, gmBuySingleReceiveAmount, buyPairLongAmount, buyPairShortAmount, pairReceiveAmount, sellPayAmount, sellReceiveLongAmount, sellReceiveShortAmount, shiftPayAmount, shiftReceiveAmount, slippage]);

  // init balance list
  useEffect(() => {
    const longToken = poolInfo?.longToken;
    const shortToken = poolInfo?.shortToken;
    const indexToken = poolInfo?.indexToken;
    const marketToken = poolInfo?.marketToken;
    const wsolAddress = 'So11111111111111111111111111111111111111112';
    const wpumpAddress = 'HTHR6CbWSqrVCB83onNwKKH1W3qpGoKbpqvs9sgK7PEC';

    let longOrShortTokens =
      payerSwapList?.filter(
        (item: any) =>
          item.tokenAddress === longToken || item.tokenAddress === shortToken
      ) || [];

    if (longToken === wsolAddress || shortToken === wsolAddress) {
      const solAliasAddress = Object.entries(GMX_SOLANA_TOKENS_RAW).find(
        ([addr, meta]) =>
          (meta as any)?.wrappedAddress === wsolAddress &&
          (meta as any)?.symbol === 'SOL' &&
          !(meta as any)?.isSynthetic
      )?.[0];

      const solItem = payerSwapList?.find(
        (it: any) =>
          it.tokenAddress === solAliasAddress ||
          GMX_SOLANA_TOKENS_RAW[it.tokenAddress]?.symbol === 'SOL'
      );
      if (
        solItem &&
        !longOrShortTokens.some(
          (it: any) => it.tokenAddress === solItem.tokenAddress
        )
      ) {
        longOrShortTokens = [
          ...longOrShortTokens,
          { ...solItem, type: 'wrapToken' },
        ];
      }
    }

    if (longToken === wpumpAddress || shortToken === wpumpAddress) {
      const pumpAliasAddress = Object.entries(GMX_SOLANA_TOKENS_RAW).find(
        ([addr, meta]) =>
          (meta as any)?.wrappedAddress === wpumpAddress &&
          (meta as any)?.symbol === 'PUMP'
      )?.[0];
      const pumpItem = payerSwapList?.find(
        (it: any) =>
          it.tokenAddress === pumpAliasAddress ||
          GMX_SOLANA_TOKENS_RAW[it.tokenAddress]?.symbol === 'PUMP'
      );
      if (
        pumpItem &&
        !longOrShortTokens.some(
          (it: any) => it.tokenAddress === pumpItem.tokenAddress
        )
      ) {
        longOrShortTokens = [
          ...longOrShortTokens,
          { ...pumpItem, type: 'wrapToken' },
        ];
      }
    }
    const missingPoolTokens = [longToken, shortToken]
      .filter(Boolean)
      .filter((tokenAddress, index, tokenAddresses) => tokenAddresses.indexOf(tokenAddress) === index)
      .filter(
        (tokenAddress) =>
          !longOrShortTokens.some(
            (item: any) => item.tokenAddress === tokenAddress
          )
      )
      .map((tokenAddress) => {
        const tokenMeta = GMX_SOLANA_TOKENS_RAW[tokenAddress];
        const price = new BN(tokenPriceMap[tokenAddress]?.unitPrice || 0);
        const amount = poolPayTokenBalances[tokenAddress] || new BN(0);

        if (!tokenMeta) {
          return undefined;
        }

        return {
          tokenAddress,
          tokenName: tokenMeta.symbol,
          amount: amount.toString(),
          value: amount.mul(price).toString(),
          decimals: tokenMeta.decimals,
          price,
          unitPrice: formatUsd(
            formatParseUsdToBN('1', tokenMeta.decimals).mul(price),
            {
              displayPlus: false,
              signed: false,
              showDollarSign: false,
              showUseCommas: false,
            }
          ),
          payAmount: new BN(0),
          paySizeInUsd: new BN(0),
          limitAmount: new BN(0),
        };
      })
      .filter(Boolean);
    longOrShortTokens = [...longOrShortTokens, ...missingPoolTokens];
    const longOrShortTokenAddresses = longOrShortTokens
      ?.map((item: any) => {
        return {
          type:
            item?.type === 'wrapToken'
              ? 'wrapToken'
              : item?.tokenAddress === longToken
                ? 'longToken'
                : 'shortToken',
          ...item,
          price: tokenPriceMap[item.tokenAddress]?.unitPrice || 0,
          amount: new BN(item.amount || 0),
          isNotGm: true,
        };
      })
      .sort((a, b) => {
        const valueA = new BN(a.amount || 0)?.mul(new BN(tokenPriceMap[a.tokenAddress]?.unitPrice || 0));
        const valueB = new BN(b.amount || 0)?.mul(new BN(tokenPriceMap[b.tokenAddress]?.unitPrice || 0));
        return valueB.sub(valueA).isNeg() ? -1 : 1;
      });
    const gmPoolList = allMarketInfos?.filter(
      (item: any) => item?.indexToken === indexToken
    );
    const new_gmPoolList = gmPoolList?.map((item: any) => {
      return {
        ...item,
        tokenName:
          GMX_SOLANA_TOKENS_RAW[longToken]?.symbol ||
          '' + '-' + GMX_SOLANA_TOKENS_RAW[shortToken]?.symbol ||
          '',
        tokenAddress: item.marketToken,
        price: item?.marketPrice,
        amount: balanceMap?.get(item.marketToken) || new BN(0),
        decimals: GMX_SOLANA_TOKENS_RAW[item.marketToken]?.decimals || 0,
        type: 'pool',
        value: balanceMap
          ?.get(item.marketToken)
          ?.mul(new BN(item?.marketPrice))
          ?.div(new BN(10).pow(new BN(20)))
          ?.toString(),
      };
    })?.sort((a, b) => {

      const valueA = a.value ? new BN(a.value) : new BN(0);
      const valueB = b.value ? new BN(b.value) : new BN(0);

      if (valueA.gt(new BN(0)) || valueB.gt(new BN(0))) {
        return valueB.sub(valueA).isNeg() ? -1 : valueB.sub(valueA).isZero() ? 0 : 1;
      }

      const supplyA = new BN(a.supply || 0);
      const supplyB = new BN(b.supply || 0);
      return supplyB.sub(supplyA).isNeg() ? -1 : supplyB.sub(supplyA).isZero() ? 0 : 1;
    });
    if (!isShift) {
      setGmPoolList(new_gmPoolList);
    }
    if (!hasChangePay) {
      setPayInfo(longOrShortTokenAddresses[0]);
    }
    if (!hasChangePool) {
      setGmPoolInfo(
        new_gmPoolList?.find(
          (item: any) => item.marketToken === poolInfo?.marketToken
        )
      );
    }
    setTokenSelectTokens(longOrShortTokenAddresses);
  }, [payerSwapList, balanceMap, poolType, marketInfosMap, poolInfo, poolPayTokenBalances]);

  useEffect(() => {
    if (hasChangeSellReceiveLong || hasChangeSellReceiveShort) {
      return
    }
    if (!isSell) {
      return
    }
    if (poolInfo?.longToken !== poolInfo?.shortToken) {
      const tradeMoneyAfterFee = sellTradeMoney?.sub(needSubFees);
      const sellLongTradeMoney = tradeMoneyAfterFee
        ?.mul(new BN(poolInfo?.longRate * 100 || 5000))
        .div(new BN(10000));
      const sellShortTradeMoney = tradeMoneyAfterFee?.sub(sellLongTradeMoney);
      setSellLongTradeMoney(sellLongTradeMoney);
      setSellShortTradeMoney(sellShortTradeMoney);
      const sellReceiveLongAmountBN =
        sellLongTradeMoney?.div(
          new BN(buyPairLong?.price || 1)
        );
      const sellReceiveShortAmountBN =
        sellShortTradeMoney?.div(
          new BN(buyPairShort?.price || 1)
        );
      setSellReceiveLongAmountBN(sellReceiveLongAmountBN);
      setSellReceiveShortAmountBN(sellReceiveShortAmountBN);
      setSellReceiveLongAmount(
        sellReceiveLongAmountBN?.gt(new BN(0))
          ? formatAmount(
            sellReceiveLongAmountBN,
            buyPairLong?.decimals,
            4
          ).toString()
          : ''
      );
      setSellReceiveShortAmount(
        sellReceiveShortAmountBN?.gt(new BN(0))
          ? formatAmount(
            sellReceiveShortAmountBN,
            buyPairShort?.decimals,
            4
          ).toString()
          : ''
      );
    } else {
      const sellLongTradeMoney = sellTradeMoney?.sub(needSubFees);
      setSellLongTradeMoney(sellLongTradeMoney);
      const sellReceiveLongAmountBN =
        sellLongTradeMoney?.div(
          new BN(buyPairLong?.price || 1)
        );
      setSellReceiveLongAmountBN(sellReceiveLongAmountBN);
      setSellReceiveLongAmount(
        sellReceiveLongAmountBN?.gt(new BN(0))
          ? formatAmount(
            sellReceiveLongAmountBN,
            buyPairLong?.decimals,
            4
          ).toString()
          : ''
      );
    }
  }, [needSubFees, sellTradeMoney, isSell])

  useEffect(() => {
    if (poolInfo?.longToken === poolInfo?.shortToken) {
      if (hasChangeSellReceiveLong) {
        const longTradeMoney = sellLongTradeMoney;
        const tradeMoney =
          longTradeMoney?.add(needSubFees);
        setSellTradeMoney(tradeMoney);
        const sellPayAmountBN = divOrZero(
          tradeMoney?.mul(new BN(10).pow(new BN(poolInfo?.marketDecimals))),
          poolInfo?.marketPrice,
          1
        );
        setSellPayAmountBN(sellPayAmountBN);
        console.log('buyPairLong', buyPairLong)
        setSellPayAmount(
          sellPayAmountBN?.gt(new BN(0))
            ? formatAmount(
              sellPayAmountBN,
              poolInfo?.marketDecimals,
              4
            ).toString()
            : ''
        );
        return;
      }
      const tradeMoney = sellLongTradeMoney?.add(needSubFees);
      setSellTradeMoney(tradeMoney);
      const sellReceiveLongAmountBN =
        tradeMoney?.div(
          new BN(buyPairLong?.price || 1)
        );
      setSellReceiveLongAmountBN(sellReceiveLongAmountBN);
      setSellReceiveLongAmount(
        sellReceiveLongAmountBN?.gt(new BN(0))
          ? formatAmount(
            sellReceiveLongAmountBN,
            buyPairLong?.decimals,
            4
          ).toString()
          : ''
      );
    } else {
      if (hasChangeSellReceiveLong) {
        const longTradeMoney = sellLongTradeMoney;
        const shortTradeMoney = longTradeMoney
          ?.mul(new BN(poolInfo?.shortRate * 100 || 5000))
          .div(new BN(10000))
          ?.div(new BN(poolInfo?.longRate * 100 || 5000))
          .mul(new BN(10000));
        setSellShortTradeMoney(shortTradeMoney);
        const shortAmountBN = shortTradeMoney?.div(
          new BN(buyPairShort?.price || 1)
        );
        setSellReceiveShortAmountBN(shortAmountBN);
        setSellReceiveShortAmount(
          shortAmountBN?.gt(new BN(0))
            ? formatAmount(
              shortAmountBN,
              buyPairShort?.decimals,
              4
            ).toString()
            : ''
        );
        const tradeMoney =
          longTradeMoney?.add(shortTradeMoney).add(needSubFees);
        setSellTradeMoney(tradeMoney);
        const sellPayAmountBN = divOrZero(
          tradeMoney?.mul(new BN(10).pow(new BN(poolInfo?.marketDecimals))),
          poolInfo?.marketPrice,
          1
        );
        setSellPayAmountBN(sellPayAmountBN);
        setSellPayAmount(
          sellPayAmountBN?.gt(new BN(0))
            ? formatAmount(
              sellPayAmountBN,
              buyPairLong?.decimals,
              4
            ).toString()
            : ''
        );
      }
      if (hasChangeSellReceiveShort) {
        const shortTradeMoney = sellShortTradeMoney;
        const longTradeMoney = shortTradeMoney
          ?.mul(new BN(poolInfo?.longRate * 100 || 5000))
          .div(new BN(10000))
          ?.div(new BN(poolInfo?.shortRate * 100 || 5000))
          .mul(new BN(10000));
        setSellLongTradeMoney(longTradeMoney);
        const longAmountBN = longTradeMoney?.div(
          new BN(buyPairLong?.price || 1)
        );
        setSellReceiveLongAmountBN(longAmountBN);
        setSellReceiveLongAmount(
          longAmountBN?.gt(new BN(0))
            ? formatAmount(
              longAmountBN,
              buyPairLong?.decimals,
              4
            ).toString()
            : ''
        );
        const tradeMoney =
          longTradeMoney?.add(shortTradeMoney).add(needSubFees);
        setSellTradeMoney(tradeMoney);
        const sellPayAmountBN = divOrZero(
          tradeMoney?.mul(new BN(10).pow(new BN(poolInfo?.marketDecimals))),
          poolInfo?.marketPrice,
          1
        );
        setSellPayAmountBN(sellPayAmountBN);
        setSellPayAmount(
          sellPayAmountBN?.gt(new BN(0))
            ? formatAmount(
              sellPayAmountBN,
              buyPairLong?.decimals,
              4
            ).toString()
            : ''
        );
      }
    }
  }, [needSubFees, hasChangeSellReceiveLong, hasChangeSellReceiveShort])
  return (
    <div className="glv-detail-right">
      <div className="trade-box">
        <div className="trade-box-content">

          {!isScreen1024 ? (
            <Tab
              options={availableOperations || ['Buy', 'Sell']}
              optionLabels={localizedOperationLabels}
              option={operation}
              optionClassnames={operationClassNames}
              onChange={(op) => onOperationChange(op as OperationType)}
              className="operation-tabs h-[4rem] border-b-[1px] border-b-[#535353]"
            />
          ) : (
            <div className="mobile-operation-header">
              <Tab
                options={availableOperations || ['Buy', 'Sell']}
                optionLabels={localizedOperationLabels}
                option={operation}
                optionClassnames={operationClassNames}
                onChange={(op) => onOperationChange(op as OperationType)}
                className="operation-tabs h-[4rem]"
                style={{ borderTopLeftRadius: '0', borderTopRightRadius: '0' }}
              />
              <button
                className="footer-expand-button"
                onClick={onToggleMobileTrade}
              >
                <IconChevronDown />
              </button>
            </div>
          )}

          {operation === 'Buy' && (
            <div className="mode-tabs">
              <div className="trade-type-tabs">
                {(poolInfo?.longToken === poolInfo?.shortToken
                  ? ['Single']
                  : ['Single', 'Pair']
                ).map((tab) => (
                  <div
                    key={tab}
                    className={`trade-type-tab ${mode === tab ? 'trade-type-tab-selected' : ''}`}
                    onClick={() => setMode(tab as ModeType)}
                  >
                    {localizedModeLabels[tab]}
                  </div>
                ))}
              </div>
            </div>
          )}
          {operation === 'Sell' && (
            <div className="mode-tabs">
              <div className="trade-type-tabs">
                {(poolInfo?.longToken === poolInfo?.shortToken ? ['Single'] : ['Pair']).map((tab) => (
                  <div
                    key={tab}
                    className={`trade-type-tab trade-type-tab-selected`}
                  >
                    {localizedModeLabels[tab]}
                  </div>
                ))}
              </div>
            </div>
          )}

          {operation === 'Shift' && (
            <div className="mode-tabs">
              <div className="trade-type-tabs">
                {['Single'].map((tab) => (
                  <div
                    key={tab}
                    className={`trade-type-tab trade-type-tab-selected`}
                  >
                    {localizedModeLabels[tab]}
                  </div>
                ))}
              </div>
            </div>
          )}

          {operation === 'Buy' && (
            <>
              <form className="trade-form">
                {mode === 'Single' && (
                  <>
                    <div className='px-[1.2rem] pt-[1.2rem]'>
                      <BuyInputSection
                        topLeftLabel={t`Pay`}
                        topLeftValue={
                          '$' + formatAmount(gmBuySingleTradeMoney, 20, 2)
                        }
                        topRightLabel={t`Balance`}
                        topRightValue={
                          payInfo?.amount
                            ? formatAmount(
                              tokenSelectTokens?.find((item) => item?.tokenAddress === payInfo?.tokenAddress)?.amount || 0,
                              payInfo?.decimals,
                              4
                            )
                            : '-'
                        }
                        showMaxButton={true}
                        onClickMax={() => {
                          const payAmountBN = payInfo?.tokenName === 'SOL' ?
                            (new BN(payInfo?.amount)?.sub(new BN(0.05 * 10 ** payInfo?.decimals))?.lte(new BN(0)) ? new BN(0)
                              : new BN(payInfo?.amount)?.sub(new BN(0.05 * 10 ** payInfo?.decimals)))
                            : new BN(payInfo?.amount || 0)
                          setHasGmSinglePayChange(true);
                          setGmBuySinglePayAmount(
                            payInfo?.amount
                              ? formatAmount(
                                payAmountBN,
                                payInfo?.decimals,
                                4
                              )
                              : ''
                          );
                          setGmBuySinglePayAmountBN(payAmountBN);
                          const tradeMoney = payInfo?.amount
                            ? payAmountBN.mul(
                              new BN(payInfo?.price || 0)
                            )
                            : new BN(0);
                          setGmBuySingleTradeMoney(tradeMoney);
                          const receiveAmount = divOrZero(
                            tradeMoney?.add(needSubFees)?.mul(
                              new BN(10).pow(
                                new BN(poolInfo?.marketDecimals || 0)
                              )
                            ),
                            poolInfo?.marketPrice,
                            1
                          );
                          setGmBuySingleReceiveAmount(
                            receiveAmount?.gt(new BN(0))
                              ? formatAmount(
                                receiveAmount,
                                poolInfo?.marketDecimals,
                                4
                              )
                              : ''
                          );
                          setGmBuySingleReceiveAmountBN(receiveAmount);
                        }}
                        inputValue={gmBuySinglePayAmount}
                        onInputValueChange={(e) => {
                          const value = e.target.value;
                          setGmBuySinglePayAmount(value);
                          setHasGmSinglePayChange(true);
                          const valueBN = new BN(
                            formatInput(value, payInfo?.decimals)
                          );
                          setGmBuySinglePayAmountBN(valueBN);
                          const tradeMoney = valueBN.mul(
                            new BN(payInfo?.price || 0)
                          );
                          setGmBuySingleTradeMoney(tradeMoney);
                          const receiveAmount = divOrZero(
                            tradeMoney?.add(needSubFees)?.mul(
                              new BN(10).pow(
                                new BN(poolInfo?.marketDecimals || 0)
                              )
                            ),
                            poolInfo?.marketPrice,
                            1
                          );
                          setGmBuySingleReceiveAmount(
                            receiveAmount?.gt(new BN(0))
                              ? formatAmount(
                                receiveAmount,
                                poolInfo?.marketDecimals,
                                4
                              )
                              : ''
                          );
                          setGmBuySingleReceiveAmountBN(receiveAmount);
                        }}
                      >
                        <div
                          className="token-selector"
                          onClick={() => {
                            if (tokenSelectTokens?.length === 1) {
                              return;
                            }
                            setSelectType('pay');
                            setTokenSelectTitle('Pay');
                            setIsPanelOpen(true);
                          }}
                        >
                          <TokenIcon
                            symbol={getNormalizedTokenSymbolGMX(payInfo?.tokenName || '-')}
                            displaySize={20}
                          />
                          <span className="token-label">
                            {getNormalizedTokenSymbolGMX(payInfo?.tokenName || '-')}{' '}
                          </span>
                          {tokenSelectTokens?.length > 1 && (
                            <IconChevronDown
                              fill=""
                              className="h-[1.6rem] w-[1.6rem]"
                            />
                          )}
                        </div>
                      </BuyInputSection>
                      <BuyInputSection
                        topLeftLabel={t`Receive`}
                        topLeftValue={
                          '$' + formatAmountWithOutReg(needSubFees?.eq(BN_ZERO) ? gmBuySingleTradeMoney : gmBuySingleTradeMoney?.add(needSubFees), 20, 2)
                        }
                        topRightLabel={t`Balance`}
                        topRightValue={
                          balanceMap?.get(poolInfo?.marketToken)
                            ? formatAmount(
                              new BN(balanceMap?.get(poolInfo?.marketToken) || 0),
                              poolInfo?.marketDecimals,
                              2
                            )
                            : '-'
                        }
                        inputValue={gmBuySingleReceiveAmount}
                        onInputValueChange={(e) => {
                          const value = e.target.value;
                          // if (!value) {
                          //   setNeedSubFees(new BN(0));
                          // }
                          setGmBuySingleReceiveAmount(value);
                          setHasGmSinglePayChange(false);
                          const valueBN = new BN(
                            formatInput(value, poolInfo?.marketDecimals)
                          );
                          setGmBuySingleReceiveAmountBN(valueBN);
                          const tradeMoney = valueBN.mul(
                            new BN(poolInfo?.marketPrice || 0)
                          )?.div(
                            new BN(10).pow(
                              new BN(poolInfo?.marketDecimals || 0)
                            )
                          );
                          setGmBuySingleTradeMoney(tradeMoney);
                          const payAmount = divOrZero(tradeMoney, payInfo?.price);
                          setGmBuySinglePayAmount(
                            payAmount?.gt(new BN(0))
                              ? formatAmount(payAmount, payInfo?.decimals, 4)
                              : ''
                          );
                          setGmBuySinglePayAmountBN(payAmount);

                        }}
                      >
                        <div className="receive-token">
                          <TokenIcon
                            symbol={getNormalizedTokenSymbolGMX(poolInfo?.poolName || '-')}
                            displaySize={20}
                          />
                          <span className="token-label">
                            {poolType}: {formatMarketName(poolInfo?.indexToken)}
                          </span>
                        </div>
                      </BuyInputSection>
                    </div>
                  </>
                )}

                {mode === 'Pair' && (
                  <>
                    <div className='px-[1.2rem] pt-[1.2rem]'>
                      <BuyInputSection
                        topLeftLabel={`Pay`}
                        topLeftValue={
                          '$' + formatAmount(pairTradeMoneyLong, 20, 2)
                        }
                        topRightLabel={t`Balance`}
                        topRightValue={
                          buyPairLong?.amount
                            ? formatAmount(
                              tokenSelectTokens?.find((item) => item?.tokenAddress === buyPairLong?.tokenAddress)?.amount || 0,
                              buyPairLong?.decimals,
                              4
                            )
                            : '-'
                        }
                        showMaxButton={true}
                        onClickMax={() => {
                          const payAmountBN = buyPairLong?.tokenName === 'SOL' ?
                            (new BN(buyPairLong?.amount)?.sub(new BN(0.05 * 10 ** buyPairLong?.decimals))?.lte(new BN(0)) ? new BN(0)
                              : new BN(buyPairLong?.amount)?.sub(new BN(0.05 * 10 ** buyPairLong?.decimals)))
                            : new BN(buyPairLong?.amount || 0)
                          setBuyPairLongAmount(
                            buyPairLong?.amount
                              ? formatAmount(
                                payAmountBN,
                                buyPairLong?.decimals,
                                4
                              )
                              : ''
                          );
                          setBuyPairLongAmountBN(payAmountBN);
                          const tradeMoney = buyPairLong?.amount
                            ? payAmountBN.mul(
                              new BN(buyPairLong?.price || 0)
                            )
                            : new BN(0);
                          setPairTradeMoneyLong(tradeMoney);
                          const tradeMoneyAll =
                            tradeMoney?.add(pairTradeMoneyShort);
                          setPairTradeMoney(tradeMoneyAll);
                          const receiveAmountBN = divOrZero(
                            tradeMoneyAll?.mul(
                              new BN(10).pow(
                                new BN(poolInfo?.marketDecimals || 0)
                              )
                            ),
                            poolInfo?.marketPrice
                          );
                          setPairReceiveAmountBN(receiveAmountBN);
                          setPairReceiveAmount(
                            receiveAmountBN?.gt(new BN(0))
                              ? formatAmount(
                                receiveAmountBN,
                                poolInfo?.marketDecimals || 0,
                                4
                              ).toString()
                              : ''
                          );

                        }}
                        inputValue={buyPairLongAmount}
                        onInputValueChange={(e) => {
                          const value = e.target.value;
                          setHasGmBuyPairPayChange(true);
                          setBuyPairLongAmount(value);
                          const buyPairLongAmountBN = formatInput(
                            value,
                            buyPairLong?.decimals || 0
                          );
                          setBuyPairLongAmountBN(buyPairLongAmountBN);
                          const currentTradeMoney = buyPairLongAmountBN?.mul(
                            new BN(buyPairLong?.price || 0)
                          );
                          setPairTradeMoneyLong(currentTradeMoney);
                          const tradeMoney =
                            currentTradeMoney?.add(pairTradeMoneyShort);
                          setPairTradeMoney(tradeMoney);
                          const receiveAmountBN = divOrZero(
                            tradeMoney?.mul(
                              new BN(10).pow(
                                new BN(poolInfo?.marketDecimals || 0)
                              )
                            ),
                            poolInfo?.marketPrice
                          );
                          setPairReceiveAmountBN(receiveAmountBN);
                          setPairReceiveAmount(
                            receiveAmountBN?.gt(new BN(0))
                              ? formatAmount(
                                receiveAmountBN,
                                poolInfo?.marketDecimals || 0,
                                4
                              ).toString()
                              : ''
                          );
                        }}
                      >
                        {
                          (buyPairLong?.tokenName === 'SOL' ||
                            buyPairLong?.tokenName === 'WSOL' ||
                            buyPairLong?.tokenName === 'PUMP' ||
                            buyPairLong?.tokenName === 'WPUMP') ?
                            <div
                              className="token-selector"
                              onClick={() => {
                                setSelectType('pay');
                                setTokenSelectTitle('Pay');
                                setIsPanelOpen(true);
                              }}
                            >
                              <TokenIcon
                                symbol={getNormalizedTokenSymbolGMX(buyPairLong?.tokenName || '-')}
                                displaySize={20}
                              />
                              <span className="token-label">
                                {getNormalizedTokenSymbolGMX(buyPairLong?.tokenName || '-')}{' '}
                              </span>
                              <IconChevronDown
                                fill=""
                                className="h-[1.6rem] w-[1.6rem]"
                              />
                            </div> :
                            <>
                              <TokenIcon
                                symbol={getNormalizedTokenSymbolGMX(buyPairLong?.tokenName || '-')}
                                displaySize={20}
                              />
                              <span className="token-label">
                                {getNormalizedTokenSymbolGMX(buyPairLong?.tokenName || '-')}{' '}
                              </span>
                            </>
                        }

                      </BuyInputSection>
                      <BuyInputSection
                        topLeftLabel={`Pay`}
                        topLeftValue={
                          '$' + formatAmount(pairTradeMoneyShort, 20, 2)
                        }
                        topRightLabel={t`Balance`}
                        topRightValue={
                          buyPairShort?.amount
                            ? formatAmount(
                              new BN(buyPairShort?.amount || 0),
                              buyPairShort?.decimals,
                              4
                            )
                            : '-'
                        }
                        showMaxButton={true}
                        onClickMax={() => {
                          const payAmountBN = new BN(buyPairShort?.amount || 0)
                          setBuyPairShortAmount(
                            buyPairShort?.amount
                              ? formatAmount(
                                payAmountBN,
                                buyPairShort?.decimals,
                                4
                              )
                              : ''
                          );
                          setBuyPairShortAmountBN(payAmountBN);
                          const tradeMoney = buyPairShort?.amount
                            ? payAmountBN.mul(
                              new BN(buyPairShort?.price || 0)
                            )
                            : new BN(0);
                          setPairTradeMoneyShort(tradeMoney);
                          const tradeMoneyAll =
                            tradeMoney?.add(pairTradeMoneyLong);
                          setPairTradeMoney(tradeMoneyAll);
                          const receiveAmountBN = divOrZero(
                            tradeMoneyAll?.mul(
                              new BN(10).pow(
                                new BN(poolInfo?.marketDecimals || 0)
                              )
                            ),
                            poolInfo?.marketPrice
                          );
                          setPairReceiveAmountBN(receiveAmountBN);
                          setPairReceiveAmount(
                            receiveAmountBN?.gt(new BN(0))
                              ? formatAmount(
                                receiveAmountBN,
                                poolInfo?.marketDecimals || 0,
                                4
                              ).toString()
                              : ''
                          );

                        }}
                        inputValue={buyPairShortAmount}
                        onInputValueChange={(e) => {
                          const value = e.target.value;
                          setHasGmBuyPairPayChange(true);
                          setBuyPairShortAmount(value);
                          const buyPairShortAmountBN = formatInput(
                            value,
                            buyPairShort?.decimals || 0
                          );
                          setBuyPairShortAmountBN(buyPairShortAmountBN);
                          const currentTradeMoney = buyPairShortAmountBN?.mul(
                            new BN(buyPairShort?.price || 0)
                          );
                          const tradeMoney =
                            currentTradeMoney?.add(pairTradeMoneyLong);
                          setPairTradeMoney(tradeMoney);
                          setPairTradeMoneyShort(currentTradeMoney);
                          const receiveAmountBN = divOrZero(
                            tradeMoney?.mul(
                              new BN(10).pow(
                                new BN(poolInfo?.marketDecimals || 0)
                              )
                            ),
                            poolInfo?.marketPrice
                          );
                          setPairReceiveAmountBN(receiveAmountBN);
                          setPairReceiveAmount(
                            receiveAmountBN?.gt(new BN(0))
                              ? formatAmount(
                                receiveAmountBN,
                                poolInfo?.marketDecimals || 0,
                                4
                              ).toString()
                              : ''
                          );
                        }}
                      >
                        <TokenIcon
                          symbol={buyPairShort?.tokenName || '-'}
                          displaySize={20}
                        />
                        <span className="token-label">
                          {getNormalizedTokenSymbolGMX(buyPairShort?.tokenName || '-')}{' '}
                        </span>
                      </BuyInputSection>
                      <BuyInputSection
                        topLeftLabel={t`Receive`}
                        topLeftValue={'$' + formatAmount(needSubFees?.eq(BN_ZERO) ? pairTradeMoney : pairTradeMoney?.add(needSubFees), 20, 2)}
                        topRightLabel={t`Balance`}
                        topRightValue={
                          balanceMap?.get(poolInfo?.marketToken)
                            ? formatAmount(
                              new BN(balanceMap?.get(poolInfo?.marketToken) || 0),
                              poolInfo?.marketDecimals,
                              2
                            )
                            : '-'
                        }
                        inputValue={pairReceiveAmount}
                        onInputValueChange={(e) => {
                          const value = e.target.value;
                          setHasGmBuyPairPayChange(false);
                          setPairReceiveAmount(value);
                          const receiveAmountBN = formatInput(
                            value,
                            poolInfo?.marketDecimals || 0
                          );
                          setPairReceiveAmountBN(receiveAmountBN);
                          const tradeMoney = receiveAmountBN
                            ?.mul(new BN(poolInfo?.marketPrice || 0))
                            .div(
                              new BN(10).pow(
                                new BN(poolInfo?.marketDecimals || 0)
                              )
                            );
                          setPairTradeMoney(tradeMoney);
                          if (tradeMoney?.gt(new BN(0))) {
                            if (
                              buyPairLongAmountBN.eq(new BN(0)) &&
                              buyPairShortAmountBN.eq(new BN(0))
                            ) {
                              const halfTradeMoney = tradeMoney.div(new BN(2));
                              const payLongAmount = halfTradeMoney?.div(
                                new BN(buyPairLong?.price || 0)
                              );
                              const payShortAmount = halfTradeMoney?.div(
                                new BN(buyPairShort?.price || 0)
                              );
                              setPairTradeMoneyLong(halfTradeMoney);
                              setBuyPairLongAmount(
                                payLongAmount?.gt(new BN(0))
                                  ? formatAmount(
                                    payLongAmount,
                                    buyPairLong?.decimals || 0,
                                    4
                                  ).toString()
                                  : ''
                              );
                              setBuyPairLongAmountBN(payLongAmount);
                              setPairTradeMoneyShort(halfTradeMoney);
                              setBuyPairShortAmount(
                                payShortAmount?.gt(new BN(0))
                                  ? formatAmount(
                                    payShortAmount,
                                    buyPairShort?.decimals || 0,
                                    4
                                  ).toString()
                                  : ''
                              );
                            } else if (
                              buyPairLongAmountBN.eq(new BN(0)) &&
                              buyPairShortAmountBN.gt(new BN(0))
                            ) {
                              const payShortAmount = tradeMoney?.div(
                                new BN(buyPairShort?.price || 0)
                              );
                              setPairTradeMoneyShort(tradeMoney);
                              setBuyPairShortAmount(
                                payShortAmount?.gt(new BN(0))
                                  ? formatAmount(
                                    payShortAmount,
                                    buyPairShort?.decimals || 0,
                                    4
                                  ).toString()
                                  : ''
                              );
                              setBuyPairShortAmountBN(payShortAmount);
                            } else if (
                              buyPairLongAmountBN.gt(new BN(0)) &&
                              buyPairShortAmountBN.eq(new BN(0))
                            ) {
                              const payLongAmount = tradeMoney?.div(
                                new BN(buyPairLong?.price || 0)
                              );
                              setPairTradeMoneyLong(tradeMoney);
                              setBuyPairLongAmount(
                                payLongAmount?.gt(new BN(0))
                                  ? formatAmount(
                                    payLongAmount,
                                    buyPairLong?.decimals || 0,
                                    4
                                  ).toString()
                                  : ''
                              );
                              setBuyPairLongAmountBN(payLongAmount);
                            } else if (
                              buyPairLongAmountBN.gt(new BN(0)) &&
                              buyPairShortAmountBN.gt(new BN(0))
                            ) {
                              const ratio = buyPairLongAmountBN
                                .mul(new BN(buyPairLong?.price || 0))
                                .div(
                                  buyPairShortAmountBN.mul(
                                    new BN(buyPairShort?.price || 0)
                                  )
                                );
                              const payShortMoney = tradeMoney.div(
                                ratio.add(new BN(1))
                              );
                              const payLongMoney = tradeMoney.sub(payShortMoney);
                              const payLongAmount = payLongMoney?.div(
                                new BN(buyPairLong?.price || 0)
                              );
                              const payShortAmount = payShortMoney?.div(
                                new BN(buyPairShort?.price || 0)
                              );
                              setPairTradeMoneyLong(payLongMoney);
                              setBuyPairLongAmount(
                                payLongAmount?.gt(new BN(0))
                                  ? formatAmount(
                                    payLongAmount,
                                    buyPairLong?.decimals || 0,
                                    4
                                  ).toString()
                                  : ''
                              );
                              setBuyPairLongAmountBN(payLongAmount);
                              setPairTradeMoneyShort(payShortMoney);
                              setBuyPairShortAmount(
                                payShortAmount?.gt(new BN(0))
                                  ? formatAmount(
                                    payShortAmount,
                                    buyPairShort?.decimals || 0,
                                    4
                                  ).toString()
                                  : ''
                              );
                              setBuyPairShortAmountBN(payShortAmount);
                            }
                          }
                        }}
                      // staticInput={true}
                      >
                        <div className="receive-token">
                          <TokenIcon
                            symbol={poolInfo?.poolName}
                            displaySize={20}
                          />
                          <span className="token-label">
                            {poolType}: {formatMarketName(poolInfo?.indexToken)}
                          </span>
                        </div>
                      </BuyInputSection>
                    </div>
                  </>
                )}
              </form>
            </>
          )}

          {operation === 'Sell' && (
            <>
              <form className="trade-form">
                {
                  <>
                    <div className='px-[1.2rem] pt-[1.2rem]'>
                      <BuyInputSection
                        topLeftLabel={t`Pay`}
                        topLeftValue={'$' + formatAmount(sellTradeMoney, 20, 2)}
                        topRightLabel={t`Balance`}
                        topRightValue={
                          balanceMap?.get(poolInfo?.marketToken)
                            ? formatAmount(
                              new BN(
                                balanceMap?.get(poolInfo?.marketToken) || 0
                              ),
                              poolInfo?.marketDecimals || 0,
                              2
                            )
                            : '-'
                        }
                        showMaxButton={true}
                        onClickMax={() => {
                          const sellPayAmountBN = new BN(
                            balanceMap?.get(poolInfo?.marketToken) || 0
                          );
                          setSellPayAmount(
                            formatAmount(
                              sellPayAmountBN,
                              poolInfo?.marketDecimals || 0,
                              2
                            )
                          );
                          setSellPayAmountBN(sellPayAmountBN);
                          const tradeMoney = sellPayAmountBN
                            ?.mul(new BN(poolInfo?.marketPrice || new BN(0)))
                            .div(
                              new BN(10).pow(
                                new BN(poolInfo?.marketDecimals || 0)
                              )
                            );
                          setSellTradeMoney(tradeMoney);
                          setHasChangeSellReceiveLong(false);
                          setHasChangeSellReceiveShort(false);
                        }}
                        inputValue={sellPayAmount}
                        onInputValueChange={(e) => {
                          const value = e.target.value;
                          setSellPayAmount(value);
                          const sellPayAmountBN = formatInput(
                            value,
                            poolInfo?.marketDecimals || 0
                          );
                          setSellPayAmountBN(sellPayAmountBN);
                          const tradeMoney = sellPayAmountBN
                            ?.mul(new BN(poolInfo?.marketPrice || new BN(0)))
                            .div(
                              new BN(10).pow(
                                new BN(poolInfo?.marketDecimals || 0)
                              )
                            );
                          setSellTradeMoney(tradeMoney);
                          setHasChangeSellReceiveLong(false);
                          setHasChangeSellReceiveShort(false);
                        }}
                      >
                        <div className="receive-token">
                          <TokenIcon
                            symbol={getNormalizedTokenSymbolGMX(poolInfo?.poolName || '-')}
                            displaySize={20}
                          />
                          <span className="token-label">
                            {poolType}: {formatMarketName(poolInfo?.indexToken)}
                          </span>
                        </div>
                      </BuyInputSection>
                      {poolInfo?.longToken !== poolInfo?.shortToken && (
                        <>
                          <BuyInputSection
                            topLeftLabel={t`Receive`}
                            topLeftValue={
                              '$' + formatAmount(sellLongTradeMoney, 20, 2)
                            }
                            topRightLabel={t`Balance`}
                            topRightValue={
                              buyPairLong?.amount
                                ? formatAmount(
                                  GMX_SOLANA_TOKENS_RAW[poolInfo?.longToken]?.symbol === 'WSOL' ?
                                    tokenSelectTokens?.find((item) => item?.tokenAddress === 'So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH')?.amount || 0 :
                                    buyPairLong?.amount || 0,
                                  buyPairLong?.decimals,
                                  4
                                )
                                : '-'
                            }
                            inputValue={sellReceiveLongAmount}
                            onInputValueChange={(e) => {
                              const value = e.target.value;
                              setSellReceiveLongAmount(value);
                              console.log('value', value);
                              const sellReceiveLongAmountBN = formatInput(
                                value,
                                buyPairLong?.decimals || 0
                              );
                              setSellReceiveLongAmountBN(sellReceiveLongAmountBN);
                              const longTradeMoney = sellReceiveLongAmountBN?.mul(
                                new BN(buyPairLong?.price || 1)
                              );
                              setSellLongTradeMoney(longTradeMoney);
                              setHasChangeSellReceiveLong(true);
                              setHasChangeSellReceiveShort(false);
                              // const shortTradeMoney = longTradeMoney
                              //   ?.mul(new BN(poolInfo?.shortRate * 100 || 5000))
                              //   .div(new BN(10000))
                              //   ?.div(new BN(poolInfo?.longRate * 100 || 5000))
                              //   .mul(new BN(10000));
                              // setSellShortTradeMoney(shortTradeMoney);
                              // const shortAmountBN = shortTradeMoney?.div(
                              //   new BN(buyPairShort?.price || 1)
                              // );
                              // setSellReceiveShortAmountBN(shortAmountBN);
                              // setSellReceiveShortAmount(
                              //   shortAmountBN?.gt(new BN(0))
                              //     ? formatAmount(
                              //       shortAmountBN,
                              //       buyPairShort?.decimals,
                              //       4
                              //     ).toString()
                              //     : ''
                              // );
                              // const tradeMoney =
                              //   longTradeMoney?.add(shortTradeMoney);
                              // setSellTradeMoney(tradeMoney);
                              // const sellPayAmountBN = tradeMoney?.mul(new BN(10).pow(new BN(poolInfo?.marketDecimals)))?.div(
                              //   new BN(poolInfo?.marketPrice || 1)
                              // );
                              // setSellPayAmountBN(sellPayAmountBN);
                              // setSellPayAmount(
                              //   sellPayAmountBN?.gt(new BN(0))
                              //     ? formatAmount(
                              //       sellPayAmountBN,
                              //       buyPairLong?.decimals,
                              //       4
                              //     ).toString()
                              //     : ''
                              // );
                            }}
                          >
                            <TokenIcon
                              symbol={
                                getNormalizedTokenSymbolGMX(GMX_SOLANA_TOKENS_RAW[poolInfo?.longToken]?.symbol)
                              }
                              displaySize={20}
                            />
                            <span className="token-label !text-[1.4rem]">
                              {GMX_SOLANA_TOKENS_RAW[poolInfo?.longToken]?.symbol === 'WSOL' ? 'SOL' : getNormalizedTokenSymbolGMX(GMX_SOLANA_TOKENS_RAW[poolInfo?.longToken]?.symbol)}{' '}
                            </span>
                          </BuyInputSection>
                          <BuyInputSection
                            topLeftLabel={t`Receive`}
                            topLeftValue={
                              '$' + formatAmount(sellShortTradeMoney, 20, 2)
                            }
                            topRightLabel={t`Balance`}
                            topRightValue={
                              buyPairShort?.amount
                                ? formatAmount(
                                  new BN(buyPairShort?.amount || 0),
                                  buyPairShort?.decimals,
                                  4
                                )
                                : '-'
                            }
                            inputValue={sellReceiveShortAmount}
                            onInputValueChange={(e) => {
                              const value = e.target.value;
                              setSellReceiveShortAmount(value);
                              const sellReceiveShortAmountBN = formatInput(
                                value,
                                buyPairShort?.decimals || 0
                              );
                              setSellReceiveShortAmountBN(
                                sellReceiveShortAmountBN
                              );
                              const shortTradeMoney =
                                sellReceiveShortAmountBN?.mul(
                                  new BN(buyPairShort?.price || 1)
                                );
                              setSellShortTradeMoney(shortTradeMoney);
                              setHasChangeSellReceiveShort(true);
                              setHasChangeSellReceiveLong(false);
                              // const longTradeMoney = shortTradeMoney
                              //   ?.mul(new BN(poolInfo?.longRate * 100 || 5000))
                              //   .div(new BN(10000))
                              //   ?.div(new BN(poolInfo?.shortRate * 100 || 5000))
                              //   .mul(new BN(10000));
                              // setSellLongTradeMoney(longTradeMoney);
                              // const longAmountBN = longTradeMoney?.div(
                              //   new BN(buyPairLong?.price || 1)
                              // );
                              // setSellReceiveLongAmountBN(longAmountBN);
                              // setSellReceiveLongAmount(
                              //   longAmountBN?.gt(new BN(0))
                              //     ? formatAmount(
                              //       longAmountBN,
                              //       buyPairLong?.decimals,
                              //       4
                              //     ).toString()
                              //     : ''
                              // );
                              // const tradeMoney =
                              //   longTradeMoney?.add(shortTradeMoney);
                              // setSellTradeMoney(tradeMoney);
                              // const sellPayAmountBN = tradeMoney?.mul(new BN(10).pow(new BN(poolInfo?.marketDecimals)))?.div(
                              //   new BN(poolInfo?.marketPrice || 1)
                              // );
                              // setSellPayAmountBN(sellPayAmountBN);
                              // setSellPayAmount(
                              //   sellPayAmountBN?.gt(new BN(0))
                              //     ? formatAmount(
                              //       sellPayAmountBN,
                              //       buyPairLong?.decimals,
                              //       4
                              //     ).toString()
                              //     : ''
                              // );
                            }}
                          >
                            <TokenIcon
                              symbol={
                                getNormalizedTokenSymbolGMX(GMX_SOLANA_TOKENS_RAW[poolInfo?.shortToken]
                                  ?.symbol || '-')
                              }
                              displaySize={20}
                            />
                            <span className="token-label !text-[1.4rem]">
                              {
                                getNormalizedTokenSymbolGMX(GMX_SOLANA_TOKENS_RAW[poolInfo?.shortToken]
                                  ?.symbol || '-')
                              }{' '}
                            </span>
                          </BuyInputSection>
                        </>
                      )}

                      {poolInfo?.longToken === poolInfo?.shortToken && (
                        <>
                          <BuyInputSection
                            topLeftLabel={t`Receive`}
                            topLeftValue={
                              '$' + formatAmount(sellLongTradeMoney, 20, 2)
                            }
                            topRightLabel={t`Balance`}
                            topRightValue={
                              buyPairLong?.amount
                                ? formatAmount(
                                  new BN(buyPairLong?.amount || 0),
                                  buyPairLong?.decimals,
                                  4
                                )
                                : '-'
                            }
                            inputValue={sellReceiveLongAmount}
                            onInputValueChange={(e) => {
                              const value = e.target.value;
                              setSellReceiveLongAmount(value);
                              const sellReceiveLongAmountBN = formatInput(
                                value,
                                buyPairLong?.decimals || 0
                              );
                              setSellReceiveLongAmountBN(sellReceiveLongAmountBN);
                              const longTradeMoney = sellReceiveLongAmountBN?.mul(
                                new BN(buyPairLong?.price || 1)
                              );
                              setSellLongTradeMoney(longTradeMoney);
                              setHasChangeSellReceiveLong(true);
                              setHasChangeSellReceiveShort(false);
                            }}
                          >
                            <TokenIcon
                              symbol={
                                GMX_SOLANA_TOKENS_RAW[poolInfo?.longToken]?.symbol
                              }
                              displaySize={20}
                            />
                            <span className="token-label !text-[1.4rem]">
                              {GMX_SOLANA_TOKENS_RAW[poolInfo?.longToken]?.symbol}{' '}
                            </span>
                          </BuyInputSection>
                        </>
                      )}
                    </div>
                  </>
                }
              </form>
            </>
          )}
          {!isShift && (
            <div className="pool-selector-section ">
              <div className="pool-selector-label">
                <Trans>Pool</Trans>
              </div>
              <div
                className="pool-selector-value"
                onClick={() => {
                  if (gmPoolList?.length <= 1) {
                    return;
                  }
                  setSelectType('market');
                  setTokenSelectTitle('Pool');
                  setIsPanelOpen(true);
                }}
              >
                <span>
                  {getNormalizedTokenSymbolGMX(GMX_SOLANA_TOKENS_RAW[gmPoolInfo?.longToken]?.symbol) +
                    '-' +
                    GMX_SOLANA_TOKENS_RAW[gmPoolInfo?.shortToken]?.symbol}
                </span>
                {gmPoolList?.length > 1 && (
                  <>
                    <IconChevronDown
                      fill=""
                      className="h-[1.6rem] w-[1.6rem]"
                    />
                  </>
                )}
              </div>
            </div>
          )}
          {operation === 'Shift' && (
            <form className="trade-form">
              <div className='px-[1.2rem] pt-[1.2rem]'>
                <BuyInputSection
                  topLeftLabel={t`Pay`}
                  topLeftValue={'$' + formatAmount(shiftTradeMoney, 20, 2)}
                  topRightLabel={t`Balance`}
                  topRightValue={
                    balanceMap?.get(poolInfo?.marketToken)
                      ? formatAmount(
                        new BN(balanceMap?.get(poolInfo?.marketToken) || 0),
                        poolInfo?.decimals,
                        2
                      )
                      : '-'
                  }
                  showMaxButton={true}
                  onClickMax={() => {
                    const shiftPayAmountBN = new BN(
                      balanceMap?.get(poolInfo?.marketToken) || 0
                    );
                    setShiftPayAmount(
                      formatAmount(
                        shiftPayAmountBN,
                        poolInfo?.marketDecimals || 0,
                        2
                      )
                    );
                    setShiftPayAmountBN(shiftPayAmountBN);
                    const tradeMoney = shiftPayAmountBN
                      ?.mul(new BN(poolInfo?.marketPrice || new BN(0)))
                      .div(new BN(10).pow(new BN(poolInfo?.marketDecimals || 0)));
                    setShiftTradeMoney(tradeMoney);
                    console.log('shiftReceiveInfo', shiftReceiveInfo)
                    const receiveAmountBN = divOrZero(
                      tradeMoney?.mul(
                        new BN(10).pow(
                          new BN(shiftReceiveInfo?.marketDecimals || 0)
                        )
                      ),
                      shiftReceiveInfo?.marketPrice
                    );
                    setShiftReceiveAmount(
                      receiveAmountBN?.gt(new BN(0))
                        ? formatAmount(
                          receiveAmountBN,
                          shiftReceiveInfo?.marketDecimals,
                          4
                        ).toString() : ''
                    );
                    setShiftReceiveAmountBN(receiveAmountBN);
                  }}
                  inputValue={shiftPayAmount}
                  onInputValueChange={(e) => {
                    const value = e.target.value;
                    setShiftPayAmount(value);
                    const shiftPayAmountBN = formatInput(
                      value,
                      poolInfo?.marketDecimals || 0
                    );
                    setShiftPayAmountBN(shiftPayAmountBN);
                    const tradeMoney = shiftPayAmountBN
                      ?.mul(new BN(poolInfo?.marketPrice || new BN(0)))
                      .div(new BN(10).pow(new BN(poolInfo?.marketDecimals || 0)));
                    setShiftTradeMoney(tradeMoney);
                    console.log('shiftReceiveInfo', shiftReceiveInfo)
                    const receiveAmountBN = divOrZero(
                      tradeMoney?.mul(
                        new BN(10).pow(
                          new BN(shiftReceiveInfo?.marketDecimals || 0)
                        )
                      ),
                      shiftReceiveInfo?.marketPrice
                    );
                    setShiftReceiveAmount(
                      receiveAmountBN?.gt(new BN(0))
                        ? formatAmount(
                          receiveAmountBN,
                          shiftReceiveInfo?.marketDecimals,
                          4
                        ).toString() : ''
                    );
                    setShiftReceiveAmountBN(receiveAmountBN);
                  }}
                >
                  <div className="receive-token">
                    <TokenIcon symbol={poolInfo?.poolName} displaySize={20} />
                    <span className="token-label">
                      {poolType}: {formatMarketName(poolInfo?.indexToken)}
                    </span>
                  </div>
                </BuyInputSection>

                <BuyInputSection
                  topLeftLabel={t`Receive`}
                  topLeftValue={'$' + formatAmount(shiftTradeMoney, 20, 2)}
                  topRightLabel={t`Balance`}
                  topRightValue={
                    balanceMap?.get(shiftReceiveInfo?.marketToken)
                      ? formatAmount(
                        new BN(
                          balanceMap?.get(shiftReceiveInfo?.marketToken) || 0
                        ),
                        shiftReceiveInfo?.marketDecimals || 0,
                        2
                      )
                      : '-'
                  }
                  inputValue={shiftReceiveAmount}
                  onInputValueChange={(e) => {
                    const value = e.target.value;
                    setShiftReceiveAmount(value);
                    const shiftReceiveAmountBN = formatInput(
                      value,
                      shiftReceiveInfo?.marketDecimals || 0
                    );
                    setShiftReceiveAmountBN(shiftReceiveAmountBN);
                    const tradeMoney = shiftReceiveAmountBN
                      ?.mul(new BN(shiftReceiveInfo?.marketPrice || new BN(0)))
                      .div(
                        new BN(10).pow(
                          new BN(shiftReceiveInfo?.marketDecimals || 0)
                        )
                      );
                    setShiftTradeMoney(tradeMoney);
                    const payAmountBN = divOrZero(
                      tradeMoney?.mul(new BN(10).pow(new BN(poolInfo?.marketDecimals || 0))),
                      poolInfo?.marketPrice
                    );
                    setShiftPayAmountBN(payAmountBN);
                    setShiftPayAmount(
                      payAmountBN?.gt(new BN(0))
                        ? formatAmount(
                          payAmountBN,
                          poolInfo?.marketDecimals,
                          4
                        ).toString() : ''
                    );
                  }}
                >
                  <div
                    className="receive-token"
                    onClick={() => {
                      setSelectType('market');
                      setTokenSelectTitle('Receive');
                      setIsPanelOpen(true);
                    }}
                  >
                    <TokenIcon
                      symbol={shiftReceiveInfo?.tokenName}
                      displaySize={20}
                    />
                    <span className="token-label">
                      {poolType}: {formatMarketName(shiftReceiveInfo?.indexToken)}
                    </span>
                    <IconChevronDown fill="" className="h-[1.6rem] w-[1.6rem]" />
                  </div>
                </BuyInputSection>
              </div>
            </form>
          )}

          {/* Submit Button */}
          <div
            className="submit-button-container"
            style={{ marginBottom: '1.2rem' }}
          >
            <ExchangeButton
              params={{
                isSell,
                isShift,
                isBuyPair,
                isBuySingle,
                btnDisabled,
                btnMessage,
                ...(isGmw272Enabled ? { isMarketNotOpen: usMarketLocked } : {}),
                poolInfo,
                payInfo,
                buyPairLong,
                gmBuySingleDepositParams,
                gmBuyPairDepositParams,
                sellSimulatorParams,
                shiftSimulatorParams,
                onSuccess: resetGmUI,
                onError: resetGmUI,
              }}
            />
          </div>
        </div>
        {/* Price Impact / Fees */}
        {operation === 'Buy' && (
          <div className="price-impact-fees">
            <ExchangeInfo className="trade-info">
              <ExchangeInfo.Group>
                <ExchangeInfoRow
                  label={t`Price Impact / Fees`}
                  value={
                    <div className="fees-value">
                      <TooltipWithPortal
                        handle={
                          <Trans>
                            <span className="fee-percentage" >
                              <span className={`${simulatorData?.priceImpact?.gt(new BN(0)) ? 'text-green-500' : (simulatorData?.priceImpact?.lt(new BN(0)) ? 'text-red-500' : '')}`}>
                                {
                                  simulatorData?.priceImpact ?
                                    (simulatorData?.priceImpact?.lte(new BN(0)) ?
                                      (simulatorData?.priceImpactRate === '0.00%' ? '0.00%' : '-' + simulatorData?.priceImpactRate)
                                      : (simulatorData?.priceImpactRate === '0.00%' ? '0.00%' : '+' + simulatorData?.priceImpactRate)) : '0.00%'
                                }
                              </span>
                              <span style={{ color: '#A3A3A3' }}>/</span>
                              -{simulatorData?.feesRate || '0.00%'}
                            </span>
                          </Trans>
                        }
                        renderContent={() => (
                          <div className="priceImpactContent">
                            <p>
                              <span><Trans>Price Impact:</Trans></span>
                              <span className={`${simulatorData?.priceImpact?.gt(new BN(0)) ? 'text-green-500' : simulatorData?.priceImpact?.lt(new BN(0)) ? 'text-red-500' : ''}`}>
                                {simulatorData?.priceImpact
                                  ? (simulatorData?.priceImpact?.abs()?.gte(new BN(1).mul(new BN(10).pow(new BN(18)))) ?
                                    formatUsd(simulatorData?.priceImpact) : (simulatorData?.priceImpact?.abs()?.gt(new BN(0)) ? '<-$0.01' : '$0.00'))
                                  : '$0.00'}
                              </span>
                            </p>
                            <p>
                              ({
                                simulatorData?.priceImpact ? (simulatorData?.priceImpactRate || '0.00%') : '0.00% '
                              } <Trans>of buy amount</Trans>)
                            </p>
                            <p className="buyFee">
                              <span><Trans>Buy Fee:</Trans></span>
                              <span className={`${simulatorData?.allFees && !simulatorData?.allFees?.eq(new BN(0)) ? 'text-red-500' : ''}`}>
                                {simulatorData?.allFees && !simulatorData?.allFees?.eq(BN_ZERO)
                                  ? (simulatorData?.allFees?.gte(new BN(1).mul(new BN(10).pow(new BN(18)))) ?
                                    '-' + formatUsd(simulatorData?.allFees) : '<-$0.01')
                                  : '$0.00'}
                                {/* {simulatorData?.allFees
                                  ? '-$' + formatAmountFree(
                                    simulatorData?.allFees,
                                    20,
                                    2
                                  )
                                  : '$0.00'} */}
                              </span>
                            </p>
                            <p>
                              ({simulatorData?.feesRate || '0.00%'} <Trans>of buy amount</Trans>)
                            </p>
                          </div>
                        )}
                      />
                    </div>
                  }
                />

                {/* Network Fee */}
                <ExchangeInfoRow
                  label={
                    <>
                      <span>{t`Network Fee`}</span>
                      <TooltipWithPortal
                        className="TradeFeesRow-tooltip"
                        style={{ marginTop: '-0.4rem' }}
                        handle={
                          <img
                            src={InfoSvg}
                            alt=""
                            className="typeOptions-setting-info positive"
                            style={{ marginLeft: '0.4rem' }}
                          />
                        }
                        position="top-end"
                        renderContent={() => (
                          <div>
                            <p>
                              {t`Maximum network fee paid to the network. This fee is a blockchain cost not specific to GMTrade, and it does not impact your collateral.`}
                            </p>
                          </div>
                        )}
                      />
                    </>
                  }
                  value={`-$${netWorkFee || '0.00'}`}
                />
                <ExchangeInfoRow
                  label={t`Buyable`}
                  value={
                    !isGmw291Enabled || capUsdByCalcBn.gt(new BN(0)) ? (
                      <>
                        <span style={{ color: '#fff' }}>{gmBuyableAmountText}</span>{' '}
                        <span style={{ color: '#A3A3A3' }}>{gmBuyableUsdText}</span>
                      </>
                    ) : <CellSkeleton width={130} height={14} />
                  }
                />
              </ExchangeInfo.Group>
            </ExchangeInfo>
          </div>
        )}
        {isSell && (
          <div className="price-impact-fees">
            <ExchangeInfo className="trade-info">
              <ExchangeInfo.Group>
                <ExchangeInfoRow
                  label={t`Price Impact / Fees`}
                  value={
                    <div className="fees-value">
                      <TooltipWithPortal
                        handle={
                          <Trans>
                            <span className="fee-percentage">
                              {
                                simulatorData?.priceImpact ?
                                  (simulatorData?.priceImpact?.eq(new BN(0)) ?
                                    '0.00%'
                                    : simulatorData?.priceImpactRate) : '0.00%'
                              }
                              <span style={{ color: '#A3A3A3' }}>/</span>
                              {simulatorData?.feesRate ? (simulatorData?.feesRate !== '-' ? simulatorData?.feesRate : '0.00%') : '0.00%'}
                            </span>
                          </Trans>
                        }
                        renderContent={() => (
                          <div className="priceImpactContent">
                            <p>
                              <span><Trans>Sell Fee:</Trans></span>
                              <span className='text-red-500'>
                                {simulatorData?.allFees
                                  ? (simulatorData?.allFees?.gte(new BN(1).mul(new BN(10).pow(new BN(18)))) ? '-' + formatUsd(simulatorData?.allFees) :
                                    simulatorData?.allFees?.gt(new BN(0)) ? '<-$0.01' : '$0.00')
                                  : '$0.00'}
                                {/* {simulatorData?.allFees
                                  ? formatUsd(simulatorData?.allFees, { displayDecimals: 5 })
                                  : '$0.00'} */}
                              </span>
                            </p>
                            <p>
                              ({simulatorData?.feesRate ? (simulatorData?.feesRate !== '-' ? simulatorData?.feesRate : '0.00%') : '0.00%'} <Trans>of sell amount</Trans>)
                            </p>
                          </div>
                        )}
                      />
                    </div>
                  }
                />

                {/* Network Fee */}
                <ExchangeInfoRow
                  label={
                    <>
                      <span>{t`Network Fee`}</span>
                      <TooltipWithPortal
                        className="TradeFeesRow-tooltip"
                        style={{ marginTop: '-0.4rem' }}
                        handle={
                          <img
                            src={InfoSvg}
                            alt=""
                            className="typeOptions-setting-info positive"
                            style={{ marginLeft: '0.4rem' }}
                          />
                        }
                        position="top-end"
                        renderContent={() => (
                          <div>
                            <p>
                              {t`Maximum network fee paid to the network. This fee is a blockchain cost not specific to GMTrade, and it does not impact your collateral.`}
                            </p>
                          </div>
                        )}
                      />
                    </>
                  }
                  value={`-$${netWorkFee || '0.00'}`}
                />
                <ExchangeInfoRow
                  label={t`Sellable`}
                  value={
                    <>
                      <span style={{ color: '#fff' }}>{gmSellableAmountText}</span>{' '}
                      <span style={{ color: '#A3A3A3' }}>{gmSellableUsdText}</span>
                    </>
                  }
                />
              </ExchangeInfo.Group>
            </ExchangeInfo>
          </div>
        )}

        {isShift && (
          <div className="price-impact-fees">
            <ExchangeInfo className="trade-info">
              <ExchangeInfo.Group>
                <ExchangeInfoRow
                  label={t`Price Impact / Fees`}
                  value={
                    <div className="fees-value">
                      <TooltipWithPortal
                        handle={
                          <Trans>
                            <span className="fee-percentage">
                              {simulatorData?.priceImpactRate || '0.00%'}
                              <span style={{ color: '#A3A3A3' }}>/</span>
                              {simulatorData?.feesRate === '-' ? '0.00%' : simulatorData?.feesRate || '0.00%'}
                            </span>
                          </Trans>
                        }
                        renderContent={() => (
                          <div className="priceImpactContent">
                            <p>
                              <span><Trans>Price Impact:</Trans></span>
                              <span className={`${(simulatorData?.priceImpact && simulatorData?.priceImpact?.gt(new BN(0))) ? 'text-green-500' : (simulatorData?.priceImpact && simulatorData?.priceImpact?.lt(new BN(0))) ? 'text-red-500' : ''}`}>
                                {simulatorData?.priceImpact
                                  ? (simulatorData?.priceImpact?.abs()?.gte(new BN(1).mul(new BN(10).pow(new BN(18)))) ?
                                    formatUsd(simulatorData?.priceImpact) : (simulatorData?.priceImpact?.abs()?.gt(new BN(0)) ? '<-$0.01' : '$0.00'))
                                  : '$0.00'}
                              </span>
                            </p>
                            <p>
                              ({simulatorData?.priceImpactRate || '0.00%'} <Trans>of buy amount</Trans>)
                            </p>
                            <p className="buyFee">
                              <span><Trans>Shift Fee:</Trans></span>
                              <span className={`${simulatorData?.allFees && !simulatorData?.allFees?.eq(new BN(0)) ? 'text-red-500' : ''}`}>
                                {simulatorData?.allFees && !simulatorData?.allFees?.eq(BN_ZERO)
                                  ? (simulatorData?.allFees?.gte(new BN(1).mul(new BN(10).pow(new BN(18)))) ?
                                    '-' + formatUsd(simulatorData?.allFees) : '<-$0.01')
                                  : '$0.00'}
                                {/* {simulatorData?.allFees ?
                                  (simulatorData?.allFees && simulatorData?.allFees?.eq(new BN(0)) ? '$0.00' : '$' + formatAmountFree(
                                    simulatorData?.allFees,
                                    20,
                                    2
                                  ))
                                  : '$0.00'} */}
                              </span>
                            </p>
                            <p>
                              ({
                                simulatorData?.priceImpact ?
                                  (simulatorData?.priceImpact?.lte(new BN(0)) ?
                                    (simulatorData?.priceImpactRate === '0.00%' ? '0.00%' : '-' + simulatorData?.priceImpactRate || '0.00%')
                                    : (simulatorData?.priceImpactRate === '0.00%' ? '0.00%' : '+' + simulatorData?.priceImpactRate || '0.00%')) : '0.00% '
                              } <Trans>of buy amount</Trans>)
                            </p>
                          </div>
                        )}
                      />
                    </div>
                  }
                />

                {/* Network Fee */}
                <ExchangeInfoRow
                  label={
                    <>
                      <span>{t`Network Fee`}</span>
                      <TooltipWithPortal
                        className="TradeFeesRow-tooltip"
                        style={{ marginTop: '-0.4rem' }}
                        handle={
                          <img
                            src={InfoSvg}
                            alt=""
                            className="typeOptions-setting-info positive"
                            style={{ marginLeft: '0.4rem' }}
                          />
                        }
                        position="top-end"
                        renderContent={() => (
                          <div>
                            <p>
                              {t`Maximum network fee paid to the network. This fee is a blockchain cost not specific to GMTrade, and it does not impact your collateral.`}
                            </p>
                          </div>
                        )}
                      />
                    </>
                  }
                  value={`-$${netWorkFee || '0.00'}`}
                />
              </ExchangeInfo.Group>
            </ExchangeInfo>
          </div>
        )}
      </div>
      <TokenSelectDrawer
        isShift={isShift}
        glvListData={glvListData}
        key={selectType}
        isOpen={isPanelOpen}
        selectType={selectType}
        title={tokenSelectTitle}
        payerSwapTokens={
          isBuyPair &&
            (buyPairLong?.tokenName === 'SOL' ||
              buyPairLong?.tokenName === 'WSOL' ||
              buyPairLong?.tokenName === 'PUMP' ||
              buyPairLong?.tokenName === 'WPUMP')
            ? tokenSelectTokens
              ?.filter((it: any) => it?.type === 'longToken' || it?.type === 'wrapToken')
              ?.sort((a: any, b: any) => {
                if (!connected) {
                  const aw = a?.type === 'wrapToken' ? 1 : 0;
                  const bw = b?.type === 'wrapToken' ? 1 : 0;
                  if (aw !== bw) return bw - aw;
                }
                const aAmt = new BN(a?.amount || 0);
                const bAmt = new BN(b?.amount || 0);
                const cmp = bAmt.cmp(aAmt);
                if (cmp !== 0) return cmp;
                const aw = a?.type === 'wrapToken' ? 1 : 0;
                const bw = b?.type === 'wrapToken' ? 1 : 0;
                return bw - aw;
              })
            : tokenSelectTokens
        }
        sortedTokens={isShift ? (gmPoolList || [])?.filter(i => i?.marketToken !== poolInfo?.marketToken) : gmPoolList}
        onClose={() => setIsPanelOpen(false)}
        onSelectToken={(token) => {
          if (!token) {
            return;
          }
          if (selectType === 'pay') {
            const payPrice = new BN(token?.price || 0);
            const gmBuySinglePayAmountBN = formatInput(gmBuySinglePayAmount, token?.decimals);
            setGmBuySinglePayAmountBN(gmBuySinglePayAmountBN);
            const tradeMoney = payPrice.mul(gmBuySinglePayAmountBN);
            setGmBuySingleTradeMoney(tradeMoney);
            const receiveAmountBN = divOrZero(
              tradeMoney?.mul(new BN(10).pow(new BN(poolInfo?.marketDecimals || 0))),
              poolInfo?.marketPrice
            );
            setGmBuySingleReceiveAmount(
              receiveAmountBN?.gt(new BN(0))
                ? formatAmount(receiveAmountBN, poolInfo?.marketDecimals, 4)
                : ''
            );
            setGmBuySingleReceiveAmountBN(receiveAmountBN);
            setHasChangePay(true);
            setPayInfo(token);
            if (
              isBuyPair &&
              (buyPairLong?.tokenName === 'SOL' ||
                buyPairLong?.tokenName === 'WSOL' ||
                buyPairLong?.tokenName === 'PUMP' ||
                buyPairLong?.tokenName === 'WPUMP')
            ) {
              setBuyPairLong(token);
              setHasChangeBuyPairLong(true);
            }
          } else if (selectType === 'market') {
            if (isShift) {
              if (token?.glvToken) {

                onGlvTokenSelected?.(token);
              }
              setHasChangeShiftPool(true);
              setShiftReceiveInfo(token);
              return;
            }
            const poolInfo = gmListData?.find(
              (item) => item?.marketToken === token?.marketToken
            );
            setHasChangePool(true);
            setGmPoolInfo(token);
            setPoolInfo(poolInfo);
            setDetailPoolInfo(poolInfo);
            if (operation === 'Sell') {
              const longTradeMoney = sellReceiveShortAmountBN?.mul(
                new BN(buyPairLong?.price || 1)
              );
              const shortTradeMoney = sellReceiveLongAmountBN?.mul(
                new BN(buyPairShort?.price || 1)
              );
              const tradeMoney = longTradeMoney?.add(shortTradeMoney);
              const receiveAmountBN = divOrZero(
                tradeMoney?.mul(new BN(10).pow(new BN(poolInfo?.marketDecimals || 0))),
                poolInfo?.marketPrice
              );
              setSellPayAmount(
                receiveAmountBN?.gt(new BN(0))
                  ? formatAmount(receiveAmountBN, poolInfo?.marketDecimals, 4)
                  : ''
              );
              setSellPayAmountBN(receiveAmountBN);
              setSellTradeMoney(tradeMoney);
              setSellLongTradeMoney(longTradeMoney);
              setSellShortTradeMoney(shortTradeMoney);
            }
          }
        }}
      />
    </div>
  );
};

export default GmTradePanel;
