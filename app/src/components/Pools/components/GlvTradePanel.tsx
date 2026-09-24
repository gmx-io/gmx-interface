import { getGmw291Enabled, getGmw272Enabled, getGmw379Enabled, getGmw442Enabled } from '@/config/featureFlagEnable';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Trans, t } from '@lingui/macro';
import Tab from '@/components/Common/Tab/Tab';
import BuyInputSection from '@/components/Common/Input/BuyInputSection';
import { ExchangeInfo } from '@/components/Exchange/ExchangeInfo';
import ExchangeInfoRow from '@/components/Exchange/ExchangeInfoRow';
import TooltipWithPortal from '@/components/Common/Tooltip/TooltipWithPortal';
import TokenIcon from '@/components/Common/TokenIcon/TokenIcon';
import CellSkeleton from '@/components/Common/Skeleton/CellSkeleton';
import InfoSvg from '@/components/TradeBoxNew/assets/Info.svg';
import { BN } from '@coral-xyz/anchor';
import { useMarkets } from '../Hooks/useMarkets';
import { usePriorityFees } from '../Hooks/usePriorityFees';
import { useAppStore } from '@/zustand/useAppStore';
import TokenSelectDrawer from '@/components/Pools/components/TokenSelectDrawer';
import {
  getGraphObj,
  getMultipMarketBase64,
} from '@/components/TradeBoxNew/utils/getRpcOrSdkParams';
import { usePayer } from '@/components/TradeBoxNew/Hooks/usePayer';
import { useShallow } from 'zustand/react/shallow';
import { getBalanceMap } from '../utils/getBalanceMap';
import { isUSMarketOpen, isMetalMarketOpen, isCommodityMarketOpen } from '@/components/TradeBoxNew/utils/isUSMarketOpen';
import { PublicKey } from '@solana/web3.js';
import { formatMarketName } from '@/components/TradeBoxNew/utils/formatMarketName';
import {
  formatAmount,
  formatAmountFree,
  formatAmountWithD,
  formatPercentage,
  formatAmountWithOutReg,
  formatToKMBWithoutUsd,
  formatUsd,
} from '@/utils/legacy';
import { GMX_SOLANA_TOKENS_RAW } from '@/config/program';
import IconChevronDown from '@/img/trade/chevron-down.svg?react';
import { useTokenPriceMap } from '../Hooks/useTokenPriceMap';
import { usePayerSwapList } from '../Hooks/usePayerSwapList';
import { useMultipMarketBase64 } from '@/components/Pools/Hooks/useMultipMarketBase64';
import { formatInput } from '@/components/TradeBoxNew/utils/formatInput';
import { Glv } from '@gmsol-labs/gmsol-sdk';
import { useComputeUnits } from '@/hooks/utilsHooks/useComputeUnits';
import ExchangeButton from '@/components/Pools/components/ExchangeButton';
import {
  decodeDepositReport,
  decodeWithdrawReport,
} from '@/components/Pools/utils/analyze';
import { useMedia } from 'react-use';
import './ButtonInput.scss'
import { BN_ZERO } from '@solana/spl-governance';
import { useStoreProgram } from '@/contexts/anchor';
import { findGlvPDA } from 'gmsol';
import { applySlippageToMinOut } from '@/utils/tradebox/applySlippageToMinOut';
import { areGlvMarketsOpen } from '@/utils/glv/areGlvMarketsOpen';
type OperationType = 'Buy' | 'Sell' | 'Shift';
type ModeType = 'Single' | 'Pair';
type PoolType = 'GLV' | 'GM';
type TokenSelectType = 'longToken' | 'shortToken' | 'wrapToken' | 'gm';

interface TokenSelectItem {
  type: TokenSelectType;
  tokenAddress: string;
  tokenName: string;
  amount: BN | string | number;
  decimals: number;
  price: BN | string | number;
  value?: string;
  // gm-specific fields (spread from market data)
  indexToken?: string;
  showName?: string[];
  marketToken?: string;
  tvlUsdBn?: BN | string | number;
  capUsdBn?: BN | string | number;
  perMarketSellableUsd?: BN | string | number;
  closed?: boolean;
  longToken?: string;
  shortToken?: string;
  // non-gm specific
  isNotGm?: boolean;
}
type AccountInfoWithData = { data: Buffer };
type GlvAccount = {
  markets: {
    data: Array<{
      key: string;
    }>;
  };
};

const getBigIntValue = (value: unknown) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  try {
    return BigInt(value.toString());
  } catch {
    return undefined;
  }
};

const toSafeBN = (value: unknown) => {
  if (value === undefined || value === null || value === '') {
    return new BN(0);
  }

  try {
    return new BN(value.toString());
  } catch {
    return new BN(0);
  }
};

const tryToBN = (value: unknown) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  try {
    return new BN(value.toString());
  } catch {
    return undefined;
  }
};

const decodeGlvFromBase64 = (glvBase64: unknown) => {
  if (typeof glvBase64 !== 'string' || glvBase64.length === 0) {
    return undefined;
  }

  try {
    return Glv.decode_from_base64_with_options(glvBase64);
  } catch (error) {
    console.log('decodeGlvFromBase64 error', error);
    return undefined;
  }
};

interface GlvTradePanelProps {
  availableOperations: string[];
  localizedOperationLabels: Record<string, React.ReactNode>;
  operation: OperationType;
  operationClassNames: Record<string, any>;
  onOperationChange: (op: OperationType) => void;

  localizedModeLabels: Record<string, React.ReactNode> | string[];
  poolType: PoolType;

  isExecutionDetailsOpen: boolean;
  onToggleExecutionDetails: () => void;
  poolInfo: any;

  isMobileTradeOpen?: boolean;
  onToggleMobileTrade?: () => void;
  onGlvStatusChange?: (status: any) => void;
}

interface PoolSelectorSectionProps {
  indexToken?: string;
  showName?: React.ReactNode;
  onOpen: () => void;
  showInfo?: boolean;
}

const PoolSelectorSection: React.FC<PoolSelectorSectionProps> = ({
  indexToken,
  showName,
  onOpen,
  showInfo = true,
}) => (
  <div className="pool-selector-section">
    <div className="pool-selector-label flex items-center">
      <Trans>Pool</Trans>
      {showInfo && (
        <TooltipWithPortal
          className='h-[1.6rem]'
          handle={
            <img
              src={InfoSvg}
              className="cursor-pointer ml-[0.4rem]"
            />
          }
          position="top-end"
          renderContent={() => (
            <div>
              <p>
                {t`The selected pool caps how much GLV you can buy per transaction. The highest-TVL pool is selected by default. If a pool is full, simply pick another — all pools mint the same GLV token.`}
              </p>
            </div>
          )}
        />
      )}
    </div>
    <div className="pool-selector-value" onClick={onOpen}>
      <span>
        {formatMarketName(indexToken)} &nbsp;
        <span className="pool-name" style={{ color: '#A3A3A3' }}>
          [{showName || '-'}]
        </span>
      </span>
      <IconChevronDown fill="" className="h-[1.6rem] w-[1.6rem]" />
    </div>
  </div>
);

const GlvTradePanel: React.FC<GlvTradePanelProps> = ({
  availableOperations,
  localizedOperationLabels,
  operation,
  operationClassNames,
  onOperationChange,
  localizedModeLabels,
  poolType,
  poolInfo,
  onToggleMobileTrade,
  onGlvStatusChange,
}) => {
  const isGmw291Enabled = getGmw291Enabled();
  const isGmw442Enabled = getGmw442Enabled();
  const isScreen1024 = useMedia('(max-width: 1024px)');
  const { balanceMap } = getBalanceMap();
  const payerSwapList = usePayerSwapList();
  const slippage = useAppStore((state) => state.TradeboxNew.slippage);
  const isGmw272Enabled = getGmw272Enabled();
  const { glvMapBase64, glvPriceMap } = useAppStore(
    useShallow((state) => state.pools)
  );
  const setGlvMapBase64 = useAppStore(
    (state) => state.pools.setGlvMapBase64
  );
  const setMarketBase64Map = useAppStore(
    (state) => state.markets.setMarketBase64Map
  );
  const storeProgram = useStoreProgram();
  const { tokenPriceMap } = useTokenPriceMap();
  const { allMarketInfos, marketInfosMap } = useMarkets();
  const marketBase64Map = useMultipMarketBase64();
  const { address, connected } = usePayer();
  const priorityFees = usePriorityFees();
  const glvBase64 = useMemo(() => {
    if (!glvMapBase64 || glvMapBase64?.size === 0) return {};
    return glvMapBase64?.get(poolInfo?.glvToken) || {};
  }, [glvMapBase64, poolInfo?.glvToken]);

  const poolInfoGlvMarketTokens = useMemo(() => {
    const marketTokens = poolInfo?.markets
      ?.map((market: any) => market?.marketToken)
      .filter(Boolean);

    return Array.from(new Set(marketTokens ?? [])).map(
      (marketToken) => new PublicKey(marketToken)
    );
  }, [poolInfo?.markets]);

  const refreshGlvSellData = useCallback(async () => {
    if (poolType !== 'GLV' || !poolInfo?.glvToken) {
      return;
    }

    const glvTokenAddress = String(poolInfo.glvToken);
    const glvToken = new PublicKey(glvTokenAddress);
    const glvAccount = findGlvPDA(glvToken)[0];
    const glvAccountInfo = await storeProgram.provider.connection.getAccountInfo(
      glvAccount,
      'confirmed'
    );

    if (glvAccountInfo?.data) {
      const currentGlvMap = useAppStore.getState().pools.glvMapBase64;
      const nextGlvMap = new Map(currentGlvMap ?? []);
      nextGlvMap.set(glvTokenAddress, glvAccountInfo.data.toString('base64'));
      setGlvMapBase64(nextGlvMap);
    }

    if (!getGmw379Enabled()) {
      const glvAccountData = glvAccountInfo?.data
        ? storeProgram.coder.accounts.decode<GlvAccount>(
            'glv',
            glvAccountInfo.data
          )
        : undefined;
      const glvAccountMarketTokens = glvAccountData?.markets.data
        ?.map((market) => market.key)
        .filter(Boolean)
        .map((marketToken) => new PublicKey(marketToken));
      const marketTokens = glvAccountMarketTokens?.length
        ? glvAccountMarketTokens
        : poolInfoGlvMarketTokens;

      if (!marketTokens.length) return;

      const marketAccountInfos = (await getMultipMarketBase64(
        marketTokens,
        storeProgram
      )) as Array<AccountInfoWithData | null>;
      const currentMarketMap = useAppStore.getState().markets.marketBase64Map;
      const nextMarketMap = new Map(currentMarketMap ?? []);
      marketAccountInfos.forEach((accountInfo, index) => {
        if (!accountInfo?.data) return;
        nextMarketMap.set(
          marketTokens[index].toBase58(),
          accountInfo.data.toString('base64')
        );
      });
      setMarketBase64Map(nextMarketMap);
    }
  }, [
    poolInfo?.glvToken,
    poolInfoGlvMarketTokens,
    poolType,
    setGlvMapBase64,
    setMarketBase64Map,
    storeProgram,
  ]);

  useEffect(() => {
    if (poolType !== 'GLV' || operation !== 'Sell' || !poolInfo?.glvToken) {
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        await refreshGlvSellData();
      } catch (error) {
        if (cancelled) return;
        console.log('refresh GLV sell data error', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [operation, poolInfo?.glvToken, poolType, refreshGlvSellData]);
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
  const [needSubFees, setNeedSubFees] = useState<BN>(new BN(0));
  const [btnMessage, setBtnMessage] = useState<string>('Enter an amount');
  const [btnDisabled, setBtnDisabled] = useState<boolean>(true);
  const [graph, setGraph] = useState<any>(null);
  const [mode, setMode] = useState<ModeType>('Single');
  const [glvSinglePayAmount, setGlvSinglePayAmount] = useState<string>('');
  const [glvSinglePayAmountBN, setGlvSinglePayAmountBN] = useState<BN>(
    new BN(0)
  );
  const [glvSingleReceiveAmount, setGlvSingleReceiveAmount] =
    useState<string>('');
  const [glvSingleReceiveAmountBN, setGlvSingleReceiveAmountBN] = useState<BN>(
    new BN(0)
  );
  const [glvSingleTradeMoney, setGlvSingleTradeMoney] = useState<BN>(new BN(0));
  const [glvBuySingleDepositParams, setGlvBuySingleDepositParams] =
    useState<any>(null);
  const [glvBuySingleDepositSimulator, setGlvBuySingleDepositSimulator] =
    useState<any>(null);
  const [selectType, setSelectType] = useState<string>('pay');
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [tokenSelectTitle, setTokenSelectTitle] = useState<string>('Pay');
  const [tokenSelectTokens, setTokenSelectTokens] = useState<TokenSelectItem[]>([]);
  const [gmTokens, setGmTokens] = useState<TokenSelectItem[]>([]);
  const [payInfo, setPayInfo] = useState<TokenSelectItem | null>(null);
  const [gmPoolInfo, setGmPoolInfo] = useState<TokenSelectItem | null>(null);
  const isMarketNotOpen = useMemo(
    () => !areGlvMarketsOpen(poolInfo?.markets, marketInfosMap),
    [marketInfosMap, poolInfo?.markets]
  );
  const openPoolSelector = useCallback(() => {
    setSelectType('market');
    setTokenSelectTitle('Pool');
    setIsPanelOpen(true);
  }, []);
  const [hasChangePay, setHasChangePay] = useState<boolean>(false);
  const [hasChangeGm, setHasChangeGm] = useState<boolean>(false);
  const [glvBuyPairLong, setGlvBuyPairLong] = useState<TokenSelectItem | null>(null);
  const [glvBuyPairShort, setGlvBuyPairShort] = useState<TokenSelectItem | null>(null);
  const [glvBuyPairLongAmount, setGlvBuyPairLongAmount] = useState<string>('');
  const [glvBuyPairLongAmountBN, setGlvBuyPairLongAmountBN] = useState<BN>(
    new BN(0)
  );
  const [glvBuyPairShortAmount, setGlvBuyPairShortAmount] =
    useState<string>('');
  const [glvBuyPairShortAmountBN, setGlvBuyPairShortAmountBN] = useState<BN>(
    new BN(0)
  );
  const [glvPairTradeMoneyLong, setGlvPairTradeMoneyLong] = useState<BN>(
    new BN(0)
  );
  const [glvPairTradeMoneyShort, setGlvPairTradeMoneyShort] = useState<BN>(
    new BN(0)
  );
  const [glvPairTradeMoney, setGlvPairTradeMoney] = useState<BN>(new BN(0));
  const [glvPairReceiveAmount, setGlvPairReceiveAmount] = useState<string>('');
  const [glvPairReceiveAmountBN, setGlvPairReceiveAmountBN] = useState<BN>(
    new BN(0)
  );
  const [glvBuyPairDepositParams, setGlvBuyPairDepositParams] =
    useState<any>(null);
  const [glvBuyPairDepositSimulator, setGlvBuyPairDepositSimulator] =
    useState<any>(null);
  const [hasChangeSellReceiveLong, setHasChangeSellReceiveLong] = useState<boolean>(false);
  const [hasChangeSellReceiveShort, setHasChangeSellReceiveShort] = useState<boolean>(false);
  const [glvSellPayAmount, setGlvSellPayAmount] = useState<string>('');
  const [glvSellPayAmountBN, setGlvSellPayAmountBN] = useState<BN>(new BN(0));
  const [glvSellReceiveLongAmount, setGlvSellReceiveLongAmount] =
    useState<string>('');
  const [glvSellReceiveLongAmountBN, setGlvSellReceiveLongAmountBN] =
    useState<BN>(new BN(0));
  const [glvSellReceiveShortAmount, setGlvSellReceiveShortAmount] =
    useState<string>('');
  const [glvSellReceiveShortAmountBN, setGlvSellReceiveShortAmountBN] =
    useState<BN>(new BN(0));
  const [glvSellTradeMoney, setGlvSellTradeMoney] = useState<BN>(new BN(0));
  const [glvSellLongTradeMoney, setGlvSellLongTradeMoney] = useState<BN>(
    new BN(0)
  );
  const [glvSellShortTradeMoney, setGlvSellShortTradeMoney] = useState<BN>(
    new BN(0)
  );
  const [glvSellWithDrawParams, setGlvSellWithDrawParams] = useState<any>(null);
  const [glvSellWithDrawSimulator, setGlvSellWithDrawSimulator] =
    useState<any>(null);

  const [hasBuySingleChange, setHasBuySingleChange] = useState<boolean>(false);
  const [hasChangeGlvBuyPairLong, setHasChangeGlvBuyPairLong] =
    useState<boolean>(false);
  const [glvSellableAmountUsd, setGlvSellableAmountUsd] = useState<string>('');
  useEffect(() => {
    if (poolType !== 'GLV' || !poolInfo?.sellableUsd) {
      return;
    }

    setGlvSellableAmountUsd(poolInfo.sellableUsd);
  }, [poolInfo?.sellableUsd, poolType]);
  const persistGlvSellableUsd = useCallback(
    (sellableUsd: string | undefined) => {
      if (poolType !== 'GLV' || !poolInfo?.glvToken || !sellableUsd) {
        return;
      }

      const { pools } = useAppStore.getState();
      const nextGlvListData = pools.glvListData.map((item: any) =>
        item?.glvToken === poolInfo.glvToken
          ? { ...item, sellableUsd }
          : item
      );
      pools.setGlvListData(nextGlvListData);
      localStorage.setItem('glvListData', JSON.stringify(nextGlvListData));

      const linkInfo = pools.linkInfo;
      if (
        linkInfo?.poolType === 'GLV' &&
        linkInfo?.poolInfo?.glvToken === poolInfo.glvToken
      ) {
        const nextLinkInfo = {
          ...linkInfo,
          poolInfo: {
            ...linkInfo.poolInfo,
            sellableUsd,
          },
        };
        pools.setLinkInfo(nextLinkInfo);
        sessionStorage.setItem('linkInfo', JSON.stringify(nextLinkInfo));
      }
    },
    [poolInfo?.glvToken, poolType]
  );
  const lastTokenOptionsVersionRef = useRef<string>('');
  const glvStatusSentRef = useRef<boolean>(false);
  const glvBuyableAmountText = useMemo(
    () => `${poolInfo?.buyableAmount || '0.00'} GLV`,
    [poolInfo?.buyableAmount]
  );
  const glvBuyableUsdText = useMemo(
    () => `($${poolInfo?.buyableUsd || '0.00'})`,
    [poolInfo?.buyableUsd]
  );
  const glvSellableAmountText = useMemo(() => {
    const sellableUsdBn = toSafeBN(glvSellableAmountUsd);
    const glvPriceBn = toSafeBN(poolInfo?.glvPriceBN);
    const sellableAmountBn = glvPriceBn.gt(new BN(0))
      ? sellableUsdBn.div(glvPriceBn)
      : new BN(0);
    return `${formatToKMBWithoutUsd(sellableAmountBn, poolInfo?.decimals || 0, { displayDecimals: 2 })} GLV`;
  }, [glvSellableAmountUsd, poolInfo?.glvPriceBN, poolInfo?.decimals]);
  const glvSellableUsdText = useMemo(
    () => `($${formatToKMBWithoutUsd(toSafeBN(glvSellableAmountUsd), 20, 2)})`,
    [glvSellableAmountUsd]
  );

  const isGlvBugSingle =
    poolType === 'GLV' && operation === 'Buy' && mode === 'Single';
  const isGlvBuyPair =
    poolType === 'GLV' && operation === 'Buy' && mode === 'Pair';
  const isGlvSell = poolType === 'GLV' && operation === 'Sell';

  const wrapToWsol = (token: string) => {
    if (token === 'So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH') {
      return 'So11111111111111111111111111111111111111112';
    }
  };

  useEffect(() => {
    if (!connected) {
      setBtnDisabled(false);
      setBtnMessage(t`Connect Wallet`);
    } else {
      setBtnDisabled(true);
      setBtnMessage(t`Enter an amount`);
    }
  }, [connected]);
  // refresh amount
  useEffect(() => {
    if (hasBuySingleChange) {
      const glvPrice = glvPriceMap.get(poolInfo?.glvToken);
      const receiveAmount = glvPrice?.gt(new BN(0))
        ? glvSingleTradeMoney?.div(glvPrice)
        : new BN(0);
      setGlvSingleReceiveAmount(
        receiveAmount?.gt(new BN(0))
          ? formatAmount(receiveAmount, poolInfo?.decimals, 4)
          : ''
      );
      setGlvSingleReceiveAmountBN(receiveAmount);
    } else {
      const payPrice = new BN(
        tokenSelectTokens?.find(
          (item: any) => payInfo?.tokenAddress === item?.tokenAddress
        )?.price || 0
      );
      if (payPrice?.gt(new BN(0))) {
        const payAmountBN = glvSingleTradeMoney?.div(payPrice);
        setGlvSinglePayAmountBN(payAmountBN);
        setGlvSinglePayAmount(
          payAmountBN?.gt(new BN(0))
            ? formatAmount(payAmountBN, payInfo?.decimals, 4)
            : ''
        );
      }
    }
  }, [hasBuySingleChange, glvPriceMap]);

  // button state: validation and enabled/disabled with US market override
  useEffect(() => {
    let disabled = true;
    let message = t`Enter an amount`;
    let invalid = false;

    if (!connected) {
      disabled = false;
      message = t`Connect Wallet`;
    }

    if (isGlvBugSingle) {
      const availablePay = toSafeBN(payInfo?.amount);
      const isEmpty =
        !glvSinglePayAmount || (glvSinglePayAmount).trim() === '' ||
        glvSinglePayAmountBN.eq(new BN(0));
      if (isEmpty) {
        invalid = true;
        disabled = true;
        message = t`Enter an amount`;
      } else if (glvSinglePayAmountBN.gt(availablePay)) {
        invalid = true;
        disabled = true;
        message = t`Insufficient balance`;
      }
    }
    if (isGlvBuyPair) {
      const availLong = toSafeBN(glvBuyPairLong?.amount);
      const availShort = toSafeBN(glvBuyPairShort?.amount);
      const longEmpty = !glvBuyPairLongAmount || glvBuyPairLongAmount.trim() === '' || glvBuyPairLongAmountBN.eq(new BN(0));
      const shortEmpty = !glvBuyPairShortAmount || glvBuyPairShortAmount.trim() === '' || glvBuyPairShortAmountBN.eq(new BN(0));
      if (longEmpty && shortEmpty) {
        invalid = true;
        disabled = true;
        message = t`Enter an amount`;
      } else if (
        glvBuyPairLongAmountBN.gt(availLong) ||
        glvBuyPairShortAmountBN.gt(availShort)
      ) {
        invalid = true;
        disabled = true;
        message = t`Insufficient balance`;
      }
    }
    if (isGlvSell) {
      const availableGlv = toSafeBN(balanceMap?.get((poolInfo)?.glvToken));
      const isEmpty = !glvSellPayAmount || glvSellPayAmount.trim() === '' || glvSellPayAmountBN.eq(new BN(0));
      if (isEmpty) {
        invalid = true;
        disabled = true;
        message = t`Enter an amount`;
      } else if (glvSellPayAmountBN.gt(availableGlv)) {
        invalid = true;
        disabled = true;
        message = t`Insufficient balance`;
      } else if (glvSellTradeMoney.gt(toSafeBN(glvSellableAmountUsd))) {
        invalid = true;
        disabled = true;
        message = t`Exceeds Sellable Amount`;
      }
    }

    if (!invalid && (
      glvSingleTradeMoney.gt(new BN(0)) ||
      glvPairTradeMoney.gt(new BN(0)) ||
      glvSellTradeMoney.gt(new BN(0)))
    ) {
      const tvlUsdBn = gmPoolInfo?.tvlUsdBn;
      const capUsdBn = gmPoolInfo?.capUsdBn;
      const tvlBN = tryToBN(tvlUsdBn);
      const capBN = tryToBN(capUsdBn);
      const shouldCheckTvlCap =
        operation === 'Buy' &&
        tvlBN !== undefined &&
        capBN !== undefined &&
        capBN.gt(new BN(0));
      if (
        shouldCheckTvlCap &&
        tvlBN.add(glvSingleTradeMoney).gte(capBN) &&
        mode === 'Single'
      ) {
        setBtnDisabled(true);
        setBtnMessage(t`GLV TVL Cap Reached`);
        return;
      }
      if (
        shouldCheckTvlCap &&
        tvlBN.add(glvPairTradeMoney).gte(capBN) &&
        mode === 'Pair'
      ) {
        setBtnDisabled(true);
        setBtnMessage(t`GLV TVL Cap Reached`);
        return;
      }
      disabled = false;
      message = operation === 'Buy' ? t`Buy GLV` : t`Sell GLV`;
    }
    if (isMarketNotOpen) {
      disabled = true;
      message = t`Market Is Not Open`;
    }

    setBtnDisabled(disabled);
    setBtnMessage(message);
  }, [
    connected,
    isGlvBugSingle,
    isGlvBuyPair,
    isGlvSell,
    glvSinglePayAmountBN,
    glvBuyPairLongAmountBN,
    glvBuyPairShortAmountBN,
    glvSellPayAmountBN,
    balanceMap,
    poolInfo,
    marketInfosMap,
    isMarketNotOpen,
    payInfo,
    glvSinglePayAmount,
    glvBuyPairLongAmount,
    glvBuyPairShortAmount,
    glvSellPayAmount,
    glvSingleTradeMoney,
    glvPairTradeMoney,
    glvSellTradeMoney,
    gmPoolInfo,
    gmPoolInfo?.closed,
  ]);

  const resetTradeUI = () => {
    setGlvSinglePayAmount('');
    setGlvSinglePayAmountBN(new BN(0));
    setGlvSingleReceiveAmount('');
    setGlvSingleReceiveAmountBN(new BN(0));
    setGlvSingleTradeMoney(new BN(0));

    setGlvBuyPairLongAmount('');
    setGlvBuyPairLongAmountBN(new BN(0));
    setGlvBuyPairShortAmount('');
    setGlvBuyPairShortAmountBN(new BN(0));
    setGlvPairTradeMoneyLong(new BN(0));
    setGlvPairTradeMoneyShort(new BN(0));
    setGlvPairTradeMoney(new BN(0));
    setGlvPairReceiveAmount('');
    setGlvPairReceiveAmountBN(new BN(0));

    setGlvSellPayAmount('');
    setGlvSellPayAmountBN(new BN(0));
    setGlvSellReceiveLongAmount('');
    setGlvSellReceiveLongAmountBN(new BN(0));
    setGlvSellReceiveShortAmount('');
    setGlvSellReceiveShortAmountBN(new BN(0));
    setGlvSellTradeMoney(new BN(0));
    setGlvSellLongTradeMoney(new BN(0));
    setGlvSellShortTradeMoney(new BN(0));

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

  useEffect(() => {
    if (!graph) {
      return
    }
    const simulator = graph?.to_simulator();
    if (!simulator) {
      return;
    }
    const glv = decodeGlvFromBase64(glvBase64);
    if (!glv) {
      return;
    }
    const totalSupply = getBigIntValue(poolInfo?.totalSupply);
    if (totalSupply === undefined) {
      return;
    }
    let glvModel;
    let glvToken;
    try {
      glvModel = glv.to_model(totalSupply);
      glvToken = glvModel?.glv_token_address();
      simulator.insert_glv(glvModel);
    } catch (error) {
      console.log('insert glv error', error);
      return;
    }
    try {
      const glvStatus = simulator?.get_glv_status({ glv_token: glvToken.toString() });
      console.log('glvStatus', glvStatus);
      const nextSellableUsd = glvStatus?.max_sellable_value?.toString();
      setGlvSellableAmountUsd(nextSellableUsd);
      persistGlvSellableUsd(nextSellableUsd);
      if (onGlvStatusChange && !glvStatusSentRef.current) {
        onGlvStatusChange(glvStatus);
        glvStatusSentRef.current = true;
      }
    } catch (error) {
      console.log('error', error);
    }
  }, [graph, glvBase64, persistGlvSellableUsd, poolInfo?.totalSupply]);

  // init simulator
  useEffect(() => {
    if (!graph) {
      return;
    }
    const simulator = graph?.to_simulator();
    if (!simulator) {
      return;
    }
    const glv = decodeGlvFromBase64(glvBase64);
    if (!glv) {
      return;
    }
    const totalSupply = getBigIntValue(poolInfo?.totalSupply);
    if (totalSupply === undefined) {
      return;
    }
    let glvModel;
    let glvToken;
    try {
      glvModel = glv.to_model(totalSupply);
      glvToken = glvModel?.glv_token_address();
      simulator.insert_glv(glvModel);
    } catch (error) {
      console.log('insert glv error', error);
      return;
    }
    let glvBuySingleDepositParams: any;
    let glvBuyPairDepositParams: any;
    let glvSellWithDrawParams: any;
    let depositSimulationOutput: any;
    if (isGlvBugSingle) {
      // console.log('payInfo====', payInfo);
      if (payInfo?.type === 'longToken' || payInfo?.type === 'wrapToken') {
        glvBuySingleDepositParams = {
          glv_token: glvToken,
          market_token: gmPoolInfo?.marketToken,
          market_token_amount: 0n,
          receiver: address,
          long_pay_token: wrapToWsol(payInfo?.tokenAddress),
          long_pay_amount: BigInt(glvSinglePayAmountBN.toString()) || 0n,
          short_pay_token: poolInfo?.shortToken,
          short_pay_amount: 0n,
          min_receive_amount: BigInt(applySlippageToMinOut(slippage, glvSingleReceiveAmountBN).toString()) || 0n,
          skip_unwrap_native_on_receive: true,
          long_swap_path: [],
          short_swap_path: [],
        };
      } else if (payInfo?.type === 'shortToken') {
        glvBuySingleDepositParams = {
          glv_token: glvToken,
          market_token: gmPoolInfo?.marketToken,
          market_token_amount: 0n,
          receiver: address,
          long_pay_token: poolInfo?.longToken,
          long_pay_amount: 0n,
          short_pay_token: payInfo?.tokenAddress,
          short_pay_amount: BigInt(glvSinglePayAmountBN.toString()) || 0n,
          min_receive_amount: BigInt(applySlippageToMinOut(slippage, glvSingleReceiveAmountBN).toString()) || 0n,
          skip_unwrap_native_on_receive: true,
          long_swap_path: [],
          short_swap_path: [],
        };
      } else {
        glvBuySingleDepositParams = {
          glv_token: glvToken,
          market_token: gmPoolInfo?.marketToken,
          market_token_amount: BigInt(glvSinglePayAmountBN.toString()) || 0n,
          receiver: address,
          long_pay_token: poolInfo?.longToken,
          long_pay_amount: 0n,
          short_pay_token: poolInfo?.shortToken,
          short_pay_amount: 0n,
          min_receive_amount: BigInt(applySlippageToMinOut(slippage, glvSingleReceiveAmountBN).toString()) || 0n,
          skip_unwrap_native_on_receive: true,
          long_swap_path: [],
          short_swap_path: [],
        };
      }
      if (!glvBuySingleDepositParams) {
        return;
      }
      setGlvBuySingleDepositParams({
        ...glvBuySingleDepositParams,
        payToken: (payInfo?.type === 'longToken' || payInfo?.type === 'wrapToken') ? payInfo?.tokenAddress
          : (payInfo?.type === 'shortToken' ? payInfo?.tokenAddress : payInfo?.indexToken),
        payNum: (payInfo?.type === 'longToken' || payInfo?.type === 'wrapToken') ? BigInt(glvSinglePayAmountBN.toString())
          : (payInfo?.type === 'shortToken' ? BigInt(glvSinglePayAmountBN.toString()) : BigInt(glvSinglePayAmountBN.toString())),
        payType: payInfo?.type
      });
      try {
        depositSimulationOutput = simulator.simulate_glv_deposit({
          params: glvBuySingleDepositParams,
        });
      } catch (error) {
        console.log('error', error);
      }
    }
    if (isGlvBuyPair) {
      glvBuyPairDepositParams = {
        glv_token: glvToken,
        market_token: gmPoolInfo?.tokenAddress,
        receiver: address,
        // long_pay_token: wrapToWsol(poolInfo?.longToken),
        long_pay_token: poolInfo?.longToken,
        short_pay_token: poolInfo?.shortToken,
        long_swap_path: [],
        short_swap_path: [],
        long_pay_amount: BigInt(glvBuyPairLongAmountBN.toString()) || 0n,
        short_pay_amount: BigInt(glvBuyPairShortAmountBN.toString()) || 0n,
        min_receive_amount: BigInt(applySlippageToMinOut(slippage, glvPairReceiveAmountBN).toString()) || 0n,
        unwrap_native_on_receive: true,
      };
      setGlvBuyPairDepositParams(glvBuyPairDepositParams);
      console.log('glvBuyPairDepositParams', glvBuyPairDepositParams);
      try {
        depositSimulationOutput = simulator.simulate_glv_deposit({
          params: glvBuyPairDepositParams,
        });
      } catch (error) {
        console.log('error', error);
      }
    }
    if (isGlvSell) {
      glvSellWithDrawParams = {
        glv_token: glvToken,
        market_token: gmPoolInfo?.marketToken,
        glv_token_amount: BigInt(glvSellPayAmountBN.toString()) || 0n,
        long_receive_token: poolInfo?.longToken,
        short_receive_token: poolInfo?.shortToken,
        skip_unwrap_native_on_receive: false,
      };
      // console.log('glvSellWithDrawParams', glvSellWithDrawParams);
      setGlvSellWithDrawParams(glvSellWithDrawParams);
      try {
        depositSimulationOutput = simulator.simulate_glv_withdrawal({
          params: glvSellWithDrawParams,
        });
      } catch (error) {
        console.log(error);
      }
    }
    if (!depositSimulationOutput) {
      setGlvBuySingleDepositSimulator({
        allFees: new BN(0),
        feesRate: '0.00%',
        priceImpact: undefined,
        priceImpactRate: '0.00%',
        _priceImpactRate: '0.00%',
      });
      setGlvBuyPairDepositSimulator({
        allFees: new BN(0),
        feesRate: '0.00%',
        priceImpact: undefined,
        priceImpactRate: '0.00%',
        _priceImpactRate: '0.00%',
      });
      setGlvSellWithDrawSimulator({
        allFees: undefined,
        feesRate: '0.00%',
        priceImpact: new BN(0),
        priceImpactRate: new BN(0),
        _priceImpactRate: '0.00%',
      });
      setNeedSubFees(new BN(0));
      return;
    }
    let reportBuf;
    if (operation === 'Buy') {
      const depositReport = depositSimulationOutput?.deposit_report();
      if (!depositReport) {
        return
      }
      reportBuf = Buffer.from(
        depositReport,
        'base64'
      );
    }
    if (operation === 'Sell') {
      reportBuf = Buffer.from(
        depositSimulationOutput?.withdraw_report(),
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
        );
      const allFees = long_token_amount
        .mul(new BN(tokenPriceMap[poolInfo?.longToken]?.unitPrice || 0))
        .add(
          short_token_amount.mul(
            new BN(tokenPriceMap[poolInfo?.shortToken]?.unitPrice || 0)
          )
        );
      const _feesRate = glvSellTradeMoney?.gt(new BN(0))
        ? allFees?.mul(new BN(10000)).div(glvSellTradeMoney)
        : new BN(0);
      const feesRate = _feesRate
        ? formatPercentage(Number(_feesRate), 2)
        : '0.00%';
      setNeedSubFees(allFees);
      setGlvSellWithDrawSimulator({
        allFees,
        feesRate,
        priceImpact: new BN(0),
        priceImpactRate: new BN(0),
        _priceImpactRate: '0.00%',
      });
      return;
    }
    const res = decodeDepositReport(reportBuf);
    console.log('res', res);
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
    if (isGlvBugSingle) {
      const _feesRate = glvSingleTradeMoney?.gt(new BN(0))
        ? allFees?.mul(new BN(10000)).div(glvSingleTradeMoney)
        : new BN(0);
      const feesRate = _feesRate
        ? formatPercentage(Number(_feesRate), 2)
        : '0.00%';
      const _priceImpactRate = glvSingleTradeMoney?.gt(new BN(0))
        ? priceImpact?.mul(new BN(10000))?.div(glvSingleTradeMoney)
        : new BN(0);
      const priceImpactRate = _priceImpactRate.eq(new BN(0))
        ? '0.00%'
        : formatPercentage(Number(_priceImpactRate), 2);
      setGlvBuySingleDepositSimulator({
        allFees,
        feesRate,
        priceImpact,
        priceImpactRate,
        _priceImpactRate,
      });
    }
    if (isGlvBuyPair) {
      const _feesRate = glvPairTradeMoney?.gt(new BN(0))
        ? allFees?.mul(new BN(10000)).div(glvPairTradeMoney)
        : new BN(0);
      console.log('_feesRate', _feesRate?.toString());
      const feesRate = _feesRate
        ? formatPercentage(Number(_feesRate), 2)
        : '0.00%';
      console.log('feesRate', feesRate);
      const _priceImpactRate = glvPairTradeMoney?.gt(new BN(0))
        ? priceImpact?.mul(new BN(10000))?.div(glvPairTradeMoney)
        : new BN(0);
      const priceImpactRate = _priceImpactRate.eq(new BN(0))
        ? '0.00%'
        : formatPercentage(Number(_priceImpactRate), 2);
      setGlvBuyPairDepositSimulator({
        allFees,
        feesRate,
        priceImpact,
        priceImpactRate,
        _priceImpactRate,
      });
    }
  }, [glvSinglePayAmount, glvSingleReceiveAmount, glvBuyPairLongAmount, glvBuyPairShortAmount, glvPairReceiveAmount, glvSellPayAmount, glvSellReceiveLongAmount, glvSellReceiveShortAmount, poolInfo?.totalSupply, slippage]);

  // init balance list
  useEffect(() => {
    // console.log('poolInfo', poolInfo)
    // if (poolType === 'GLV') {
    const longToken = poolInfo?.longToken;
    const shortToken = poolInfo?.shortToken;
    const wsolAddress = 'So11111111111111111111111111111111111111112';
    let longOrShortTokens =
      payerSwapList?.filter(
        (item: any) =>
          item.tokenAddress === longToken || item.tokenAddress === shortToken
      ) || [];
    if (longToken === wsolAddress || shortToken === wsolAddress) {
      const solAliasAddress = Object.entries(GMX_SOLANA_TOKENS_RAW).find(
        ([addr, meta]) =>
          (meta as any)?.wrappedAddress === wsolAddress &&
          (meta as any)?.symbol === 'SOL'
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
    const longOrShortTokenAddresses = longOrShortTokens
      ?.map((item: any) => {
        return {
          type: item?.tokenAddress === longToken ? 'longToken' : 'shortToken',
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
    const mappedGmMarkets = poolInfo?.markets
      ?.map((item: any) => {
        const amount = balanceMap?.get(item.marketToken) || 0;
        const decimals =
          marketInfosMap?.get(item.marketToken)?.marketDecimals || 0;
        const gmPrice = new BN(
          marketInfosMap?.get(item.marketToken)?.marketPrice || 0
        ).div(new BN(10 ** decimals));
        const indexToken =
          marketInfosMap?.get(item.marketToken)?.indexToken || '';
        const gmUsd = new BN(gmPrice)
          .mul(new BN(amount || 0))
          .div(new BN(10 ** decimals));
        return {
          ...item,
          indexToken,
          tokenName: GMX_SOLANA_TOKENS_RAW[indexToken]?.symbol || '',
          tokenAddress: item.marketToken,
          price: gmPrice?.toString(),
          amount,
          decimals,
          value: gmUsd?.toString(),
          type: 'gm',
          showName: [
            (GMX_SOLANA_TOKENS_RAW[longToken]?.symbol === 'WGMX' ? 'GMX' : GMX_SOLANA_TOKENS_RAW[longToken]?.symbol) +
            '-' +
            GMX_SOLANA_TOKENS_RAW[shortToken]?.symbol,
          ],
        };
      });
    const hasAnySellable =
      isGmw442Enabled &&
      operation === 'Sell' &&
      !!mappedGmMarkets?.some((item: any) =>
        new BN(item.perMarketSellableUsd || 0).gt(new BN(0))
      );
    const gmMarkets = mappedGmMarkets
      ?.sort((a, b) => {
        if (hasAnySellable) {
          const sellableA = new BN(a.perMarketSellableUsd || 0);
          const sellableB = new BN(b.perMarketSellableUsd || 0);
          const sellableCmp = sellableB.cmp(sellableA);
          if (sellableCmp !== 0) {
            return sellableCmp;
          }
          const tvlA = new BN(a.tvlUsdBn || 0);
          const tvlB = new BN(b.tvlUsdBn || 0);
          return tvlB.cmp(tvlA);
        }
        const valueA = new BN(a.value || 0);
        const valueB = new BN(b.value || 0);
        return valueB.sub(valueA).isNeg() ? -1 : 1;
      });
    const _setTokenSelectTokens = [
      ...longOrShortTokenAddresses,
      ...(gmMarkets || []),
    ];
    const version = isGmw442Enabled
      ? [
          operation,
          ..._setTokenSelectTokens.map(
            (it: any) =>
              `${it.type}:${it.tokenAddress || it.marketToken}:${(it.amount || 0).toString?.() || it.amount || 0}:${it.decimals || 0}:${it.price || 0}:${it.perMarketSellableUsd || 0}`
          ),
        ].join('|')
      : _setTokenSelectTokens
          .map(
            (it: any) =>
              `${it.type}:${it.tokenAddress || it.marketToken}:${(it.amount || 0).toString?.() || it.amount || 0}:${it.decimals || 0}:${it.price || 0}`
          )
          .join('|');
    if (lastTokenOptionsVersionRef.current !== version) {
      setTokenSelectTokens(_setTokenSelectTokens);
      if (!hasChangePay) {
        setPayInfo(_setTokenSelectTokens[0] ?? null);
      }
      setGmTokens(gmMarkets || []);
      if (isGmw442Enabled ? operation === 'Sell' || !hasChangeGm : !hasChangeGm) {
        setGmPoolInfo((gmMarkets && gmMarkets[0]) ?? null);
      }
      lastTokenOptionsVersionRef.current = version;
    }
    // }
  }, isGmw442Enabled
    ? [payerSwapList, balanceMap, poolType, marketInfosMap, operation, poolInfo?.markets, hasChangeGm]
    : [payerSwapList, balanceMap, poolType, marketInfosMap]);
  // init glv buy pair
  useEffect(() => {
    const short = tokenSelectTokens.find(
      (item: any) => item.type === 'shortToken'
    );
    setGlvBuyPairShort(short);
    if (!hasChangeGlvBuyPairLong) {
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
      setGlvBuyPairLong(pick);
    }
  }, [operation, tokenSelectTokens, mode]);

  useEffect(() => {
    if (hasChangeSellReceiveLong || hasChangeSellReceiveShort) {
      return
    }
    if (!isGlvSell) {
      return
    }
    if (poolInfo?.longToken === poolInfo?.shortToken) {
      const glvSellLongTradeMoney = glvSellTradeMoney?.sub(needSubFees);
      setGlvSellLongTradeMoney(glvSellLongTradeMoney);
      const glvSellReceiveLongAmountBN =
        glvSellLongTradeMoney?.div(
          new BN(glvBuyPairLong?.price || 1)
        );
      setGlvSellReceiveLongAmountBN(
        glvSellReceiveLongAmountBN
      );
      setGlvSellReceiveLongAmount(
        glvSellReceiveLongAmountBN?.gt(new BN(0))
          ? formatAmount(
            glvSellReceiveLongAmountBN,
            glvBuyPairLong?.decimals,
            4
          ).toString() : ''
      );
    } else {
      const tradeMoneyAfterFee = glvSellTradeMoney?.sub(needSubFees);
      const glvSellLongTradeMoney = tradeMoneyAfterFee
        ?.mul(new BN(poolInfo?.longRate * 100))
        .div(new BN(10000));
      const glvSellShortTradeMoney = tradeMoneyAfterFee?.sub(glvSellLongTradeMoney)
      setGlvSellLongTradeMoney(glvSellLongTradeMoney);
      setGlvSellShortTradeMoney(glvSellShortTradeMoney);
      const glvSellReceiveLongAmountBN =
        glvSellLongTradeMoney?.div(
          new BN(glvBuyPairLong?.price || 1)
        );
      const glvSellReceiveShortAmountBN =
        glvSellShortTradeMoney?.div(
          new BN(glvBuyPairShort?.price || 1)
        );
      setGlvSellReceiveLongAmountBN(
        glvSellReceiveLongAmountBN
      );
      setGlvSellReceiveShortAmountBN(
        glvSellReceiveShortAmountBN
      );
      setGlvSellReceiveLongAmount(
        glvSellReceiveLongAmountBN?.gt(new BN(0))
          ? formatAmount(
            glvSellReceiveLongAmountBN,
            glvBuyPairLong?.decimals,
            4
          ).toString() : ''
      );
      setGlvSellReceiveShortAmount(
        glvSellReceiveShortAmountBN?.gt(new BN(0))
          ? formatAmount(
            glvSellReceiveShortAmountBN,
            glvBuyPairShort?.decimals,
            4
          ).toString() : ''
      );
    }
  }, [needSubFees, glvSellTradeMoney, isGlvSell])

  useEffect(() => {
    if (poolInfo?.longToken === poolInfo?.shortToken) {
      if (hasChangeSellReceiveLong) {
        const tradeMoney =
          glvSellLongTradeMoney?.add(needSubFees);
        setGlvSellTradeMoney(tradeMoney);
        const glvPriceBN = toSafeBN(poolInfo?.glvPriceBN);
        const payAmount = glvPriceBN.gt(new BN(0))
          ? tradeMoney?.div(glvPriceBN)
          : new BN(0);
        setGlvSellPayAmountBN(payAmount);
        setGlvSellPayAmount(
          payAmount?.gt(new BN(0))
            ? formatAmount(
              payAmount,
              poolInfo?.decimals,
              4
            ).toString() : ''
        );
        return
      }
      const glvSellLongTradeMoneyBN = glvSellTradeMoney?.add(needSubFees);
      setGlvSellLongTradeMoney(glvSellLongTradeMoneyBN);
      const glvSellReceiveLongAmountBN =
        glvSellLongTradeMoneyBN?.div(
          new BN(glvBuyPairLong?.price || 1)
        );
      setGlvSellReceiveLongAmountBN(
        glvSellReceiveLongAmountBN
      );
      setGlvSellReceiveLongAmount(
        glvSellReceiveLongAmountBN?.gt(new BN(0))
          ? formatAmount(
            glvSellReceiveLongAmountBN,
            glvBuyPairLong?.decimals,
            4
          ).toString() : ''
      );
    } else {
      if (hasChangeSellReceiveLong) {
        const shortTradeMoney = glvSellLongTradeMoney
          ?.mul(new BN(poolInfo?.shortRate * 100 || 5000))
          .div(new BN(10000))
          ?.div(new BN(poolInfo?.longRate * 100 || 5000))
          .mul(new BN(10000));
        setGlvSellShortTradeMoney(shortTradeMoney);
        const glvSellReceiveShortAmountBN =
          shortTradeMoney?.div(
            new BN(glvBuyPairShort?.price || 1)
          );
        setGlvSellReceiveShortAmountBN(
          glvSellReceiveShortAmountBN
        );
        setGlvSellReceiveShortAmount(
          glvSellReceiveShortAmountBN?.gt(new BN(0))
            ? formatAmount(
              glvSellReceiveShortAmountBN,
              glvBuyPairShort?.decimals,
              4
            ).toString() : ''
        );
        const tradeMoney =
          glvSellLongTradeMoney?.add(shortTradeMoney).add(needSubFees);
        setGlvSellTradeMoney(tradeMoney);
        const glvPriceBN = toSafeBN(poolInfo?.glvPriceBN);
        const payAmount = glvPriceBN.gt(new BN(0))
          ? tradeMoney?.div(glvPriceBN)
          : new BN(0);
        setGlvSellPayAmountBN(payAmount);
        setGlvSellPayAmount(
          payAmount?.gt(new BN(0))
            ? formatAmount(
              payAmount,
              poolInfo?.decimals,
              4
            ).toString() : ''
        );
      }
      if (hasChangeSellReceiveShort) {
        const longTradeMoney = glvSellShortTradeMoney
          ?.mul(new BN(poolInfo?.longRate * 100 || 5000))
          .div(new BN(10000))
          ?.div(new BN(poolInfo?.shortRate * 100 || 5000))
          .mul(new BN(10000));
        setGlvSellLongTradeMoney(longTradeMoney);
        const glvSellReceiveLongAmountBN =
          longTradeMoney?.div(
            new BN(glvBuyPairLong?.price || 1)
          );
        setGlvSellReceiveLongAmountBN(
          glvSellReceiveLongAmountBN
        );
        setGlvSellReceiveLongAmount(
          glvSellReceiveLongAmountBN?.gt(new BN(0))
            ? formatAmount(
              glvSellReceiveLongAmountBN,
              glvBuyPairLong?.decimals,
              4
            ).toString() : ''
        );
        const tradeMoney =
          longTradeMoney?.add(glvSellShortTradeMoney).add(needSubFees);
        setGlvSellTradeMoney(tradeMoney);
        const glvPriceBN = toSafeBN(poolInfo?.glvPriceBN);
        const payAmount = glvPriceBN.gt(new BN(0))
          ? tradeMoney?.div(glvPriceBN)
          : new BN(0);
        setGlvSellPayAmountBN(payAmount);
        setGlvSellPayAmount(
          payAmount?.gt(new BN(0))
            ? formatAmount(
              payAmount,
              poolInfo?.decimals,
              4
            ).toString() : ''
        );
      }
    }
  }, [needSubFees, hasChangeSellReceiveLong, hasChangeSellReceiveShort])
  return (
    <div className="glv-detail-right">
      <div className="trade-box">
        <div className="trade-box-content">
          {isScreen1024 ? (
            <div className="mobile-operation-header">
              <Tab
                options={availableOperations}
                optionLabels={localizedOperationLabels}
                option={operation}
                optionClassnames={operationClassNames}
                onChange={(op) => {
                  onOperationChange(op as OperationType)
                }}
                className="operation-tabs h-[4rem]"
              />
              <button
                className="footer-expand-button"
                onClick={onToggleMobileTrade}
              >
                <IconChevronDown />
              </button>
            </div>
          ) : (
            <Tab
              options={availableOperations}
              optionLabels={localizedOperationLabels}
              option={operation}
              optionClassnames={operationClassNames}
              onChange={(op) => {
                onOperationChange(op as OperationType)
              }}
              className="operation-tabs h-[4rem] border-b-[1px] border-b-[#535353]"
            />
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
                    onClick={() => {
                      setMode(tab as ModeType)
                      setGlvBuySingleDepositSimulator({})
                      setGlvBuyPairDepositSimulator({})
                      setGlvSellWithDrawSimulator({})
                    }}
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
                {(poolInfo?.longToken === poolInfo?.shortToken
                  ? ['Single']
                  : ['Pair']
                ).map((tab) => (
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

          {/* Buy/Sell */}
          {operation === 'Buy' && (
            <>
              <form className="trade-form">
                {mode === 'Single' && (
                  <>
                    <div className='px-[1.2rem] pt-[1.2rem]'>
                      <BuyInputSection
                        topLeftLabel={t`Pay`}
                        topLeftValue={
                          '$' + formatAmount(glvSingleTradeMoney, 20, 2)
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
                          console.log('poolInfo', poolInfo)
                          setHasBuySingleChange(true);
                          const availablePayBN = toSafeBN(payInfo?.amount);
                          const payAmountBN = payInfo?.tokenName === 'SOL' && payInfo?.type !== 'gm' ?
                            (availablePayBN.sub(new BN(0.05 * 10 ** payInfo?.decimals))?.lte(new BN(0)) ? new BN(0)
                              : availablePayBN.sub(new BN(0.05 * 10 ** payInfo?.decimals)))
                            : availablePayBN
                          setGlvSinglePayAmount(
                            availablePayBN.gt(new BN(0))
                              ? formatAmount(
                                payAmountBN,
                                payInfo?.decimals,
                                4
                              ).toString() : ''
                          );
                          const tradeMoney = payAmountBN?.mul(
                            toSafeBN(payInfo?.price)
                          );
                          setGlvSinglePayAmountBN(payAmountBN);
                          setGlvSingleTradeMoney(tradeMoney);
                          setTimeout(() => {
                            const glvPriceBN = toSafeBN(poolInfo?.glvPriceBN);
                            const receiveAmountBN = glvPriceBN.gt(new BN(0))
                              ? tradeMoney?.add(needSubFees)?.div(glvPriceBN)
                              : new BN(0);
                            setGlvSingleReceiveAmountBN(receiveAmountBN);
                            setGlvSingleReceiveAmount(
                              receiveAmountBN?.gt(new BN(0))
                                ? formatAmount(
                                  receiveAmountBN,
                                  poolInfo?.decimals || 0,
                                  4
                                ).toString() : ''
                            );
                          }, 0)
                        }}
                        inputValue={glvSinglePayAmount}
                        onInputValueChange={(e) => {
                          const value = e.target.value;
                          setHasBuySingleChange(true);
                          setGlvSinglePayAmount(value);
                          const payAmountBN = formatInput(
                            value,
                            payInfo?.decimals || 0
                          );
                          const tradeMoney = payAmountBN?.mul(
                            toSafeBN(payInfo?.price)
                          );
                          setGlvSinglePayAmountBN(payAmountBN);
                          setGlvSingleTradeMoney(tradeMoney);
                          setTimeout(() => {
                            const glvPriceBN = toSafeBN(poolInfo?.glvPriceBN);
                            const receiveAmountBN = glvPriceBN.gt(new BN(0))
                              ? tradeMoney?.add(needSubFees)?.div(glvPriceBN)
                              : new BN(0);
                            setGlvSingleReceiveAmountBN(receiveAmountBN);
                            setGlvSingleReceiveAmount(
                              receiveAmountBN?.gt(new BN(0))
                                ? formatAmount(
                                  receiveAmountBN,
                                  poolInfo?.decimals || 0,
                                  4
                                ).toString() : ''
                            );
                          }, 0)
                        }}
                      >
                        <div
                          className="token-selector"
                          onClick={() => {
                            setSelectType('pay');
                            setTokenSelectTitle('Pay');
                            setIsPanelOpen(true);
                          }}
                        >
                          <TokenIcon
                            symbol={payInfo?.tokenName === 'WGMX' ? 'GMX' : payInfo?.tokenName || '-'}
                            displaySize={20}
                          />
                          <span className="token-label">
                            {payInfo?.type === 'gm'
                              ? 'GM: ' + formatMarketName(payInfo?.indexToken)
                              : payInfo?.tokenName === 'WGMX' ? 'GMX' : payInfo?.tokenName}
                          </span>
                          <IconChevronDown
                            fill=""
                            className="h-[1.6rem] w-[1.6rem]"
                          />
                        </div>
                      </BuyInputSection>
                      {/* Receive */}
                      <BuyInputSection
                        topLeftLabel={t`Receive`}
                        topLeftValue={
                          // '$' + formatAmount(glvSingleTradeMoney, 20, 2)
                          '$' + formatAmountWithOutReg(needSubFees?.eq(BN_ZERO) ? glvSingleTradeMoney : glvSingleTradeMoney?.add(needSubFees), 20, 2)
                        }
                        topRightLabel={t`Balance`}
                        topRightValue={
                          balanceMap?.get(poolInfo?.glvToken)
                            ? formatAmount(
                              new BN(balanceMap?.get(poolInfo?.glvToken) || 0),
                              poolInfo?.decimals,
                              2
                            )
                            : '-'
                        }
                        inputValue={glvSingleReceiveAmount}
                        onInputValueChange={(e) => {
                          const value = e.target.value;
                          setHasBuySingleChange(false);
                          setGlvSingleReceiveAmount(value);
                          const receiveAmountBN = formatInput(
                            value,
                            poolInfo?.decimals || 0
                          );
                          setGlvSingleReceiveAmountBN(receiveAmountBN);
                          const glvPriceBN = toSafeBN(poolInfo?.glvPriceBN);
                          const tradeMoney = receiveAmountBN?.mul(
                            glvPriceBN
                          );
                          setGlvSingleTradeMoney(tradeMoney);
                          const payPriceBN = toSafeBN(payInfo?.price);
                          const payAmountBN = payPriceBN.gt(new BN(0))
                            ? tradeMoney?.div(payPriceBN)
                            : new BN(0);
                          const payAmount = receiveAmountBN?.gt(new BN(0))
                            ? formatAmount(
                              payAmountBN,
                              payInfo?.decimals || 0,
                              4
                            ).toString() : '';
                          setGlvSinglePayAmount(payAmount);
                          setGlvSinglePayAmountBN(payAmountBN);
                        }}
                      // staticInput={true}
                      >
                        <div className="receive-token">
                          <TokenIcon symbol={poolType} displaySize={20} />
                          <span className="token-label">{poolType}</span>
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
                          '$' + formatAmount(glvPairTradeMoneyLong, 20, 2)
                        }
                        topRightLabel={t`Balance`}
                        topRightValue={
                          glvBuyPairLong?.amount
                            ? formatAmount(
                              tokenSelectTokens?.find((item) => item?.tokenAddress === glvBuyPairLong?.tokenAddress)?.amount || 0,
                              glvBuyPairLong?.decimals,
                              4
                            )
                            : '-'
                        }
                        showMaxButton={true}
                        onClickMax={() => {
                          if (glvBuyPairLong?.amount?.eq(new BN(0))) {
                            return;
                          }
                          const payAmountBN = glvBuyPairLong?.tokenName === 'SOL' ?
                            (new BN(glvBuyPairLong?.amount)?.sub(new BN(0.05 * 10 ** glvBuyPairLong?.decimals))?.lte(new BN(0)) ? new BN(0)
                              : new BN(glvBuyPairLong?.amount)?.sub(new BN(0.05 * 10 ** glvBuyPairLong?.decimals)))
                            : new BN(glvBuyPairLong?.amount || 0)
                          setGlvBuyPairLongAmount(
                            formatAmount(
                              payAmountBN,
                              glvBuyPairLong?.decimals || 0,
                              4
                            ).toString()
                          );
                          setGlvBuyPairLongAmountBN(payAmountBN);
                          const currentTradeMoney = payAmountBN?.mul(
                            new BN(glvBuyPairLong?.price || 0)
                          );
                          const tradeMoney = currentTradeMoney?.add(
                            glvPairTradeMoneyShort
                          );
                          setGlvPairTradeMoney(tradeMoney);
                          setGlvPairTradeMoneyLong(currentTradeMoney);
                          const glvPriceBN = toSafeBN(poolInfo?.glvPriceBN);
                          const receiveAmountBN = glvPriceBN.gt(new BN(0))
                            ? tradeMoney?.div(glvPriceBN)
                            : new BN(0)
                          setGlvPairReceiveAmountBN(receiveAmountBN);
                          setGlvPairReceiveAmount(
                            receiveAmountBN?.gt(new BN(0))
                              ? formatAmount(
                                receiveAmountBN,
                                poolInfo?.decimals || 0,
                                4
                              ).toString()
                              : ''
                          );
                        }}
                        inputValue={glvBuyPairLongAmount}
                        onInputValueChange={(e) => {
                          const value = e.target.value;
                          setGlvBuyPairLongAmount(value);
                          const glvBuyPairLongAmountBN = formatInput(
                            value,
                            glvBuyPairLong?.decimals || 0
                          );
                          setGlvBuyPairLongAmountBN(glvBuyPairLongAmountBN);
                          const currentTradeMoney = glvBuyPairLongAmountBN?.mul(
                            toSafeBN(glvBuyPairLong?.price)
                          );
                          setGlvPairTradeMoneyLong(currentTradeMoney);
                          const tradeMoney = currentTradeMoney?.add(
                            glvPairTradeMoneyShort
                          );
                          setGlvPairTradeMoney(tradeMoney);
                          const glvPriceBN = toSafeBN(poolInfo?.glvPriceBN);
                          const receiveAmountBN = glvPriceBN.gt(new BN(0))
                            ? tradeMoney?.div(glvPriceBN)
                            : new BN(0);

                          setGlvPairReceiveAmountBN(receiveAmountBN);
                          setGlvPairReceiveAmount(
                            receiveAmountBN?.gt(new BN(0))
                              ? formatAmount(
                                receiveAmountBN,
                                poolInfo?.decimals || 0,
                                4
                              ).toString()
                              : ''
                          );
                        }}
                      >
                        {
                          (glvBuyPairLong?.tokenName === 'SOL' ||
                            glvBuyPairLong?.tokenName === 'WSOL' ||
                            glvBuyPairLong?.tokenName === 'PUMP' ||
                            glvBuyPairLong?.tokenName === 'WPUMP') ?
                            <div
                              className="token-selector"
                              onClick={() => {
                                setSelectType('pay');
                                setTokenSelectTitle('Pay');
                                setIsPanelOpen(true);
                              }}
                            >
                              <TokenIcon
                                symbol={glvBuyPairLong?.tokenName === 'WGMX' ? 'GMX' : glvBuyPairLong?.tokenName || '-'}
                                displaySize={20}
                              />
                              <span className="token-label">
                                {glvBuyPairLong?.tokenName === 'WGMX' ? 'GMX' : glvBuyPairLong?.tokenName || '-'}
                              </span>
                              <IconChevronDown
                                fill=""
                                className="h-[1.6rem] w-[1.6rem]"
                              />
                            </div> :
                            <>
                              <TokenIcon
                                symbol={glvBuyPairLong?.tokenName === 'WGMX' ? 'GMX' : glvBuyPairLong?.tokenName || '-'}
                                displaySize={20}
                              />
                              <span className="token-label">
                                {glvBuyPairLong?.tokenName === 'WGMX' ? 'GMX' : glvBuyPairLong?.tokenName || '-'}
                              </span>
                            </>
                        }

                      </BuyInputSection>
                      <BuyInputSection
                        topLeftLabel={`Pay`}
                        topLeftValue={
                          '$' + formatAmount(glvPairTradeMoneyShort, 20, 2)
                        }
                        topRightLabel={t`Balance`}
                        topRightValue={
                          glvBuyPairShort?.amount
                            ? formatAmount(
                              new BN(glvBuyPairShort?.amount || 0),
                              glvBuyPairShort?.decimals,
                              4
                            )
                            : '-'
                        }
                        showMaxButton={true}
                        onClickMax={() => {
                          if (glvBuyPairShort?.amount?.eq(new BN(0))) {
                            return;
                          }
                          const payAmountBN = new BN(glvBuyPairShort?.amount || 0)
                          setGlvBuyPairShortAmount(
                            formatAmount(
                              payAmountBN,
                              glvBuyPairShort?.decimals || 0,
                              4
                            ).toString()
                          );
                          setGlvBuyPairShortAmountBN(payAmountBN);
                          const currentTradeMoney = payAmountBN?.mul(
                            new BN(glvBuyPairShort?.price || 0)
                          );
                          const tradeMoney = currentTradeMoney?.add(
                            glvPairTradeMoneyLong
                          );
                          setGlvPairTradeMoney(tradeMoney);
                          setGlvPairTradeMoneyShort(currentTradeMoney);
                          const glvPriceBN = toSafeBN(poolInfo?.glvPriceBN);
                          const receiveAmountBN = glvPriceBN.gt(new BN(0))
                            ? tradeMoney?.div(glvPriceBN)
                            : new BN(0)
                          setGlvPairReceiveAmountBN(receiveAmountBN);
                          setGlvPairReceiveAmount(
                            receiveAmountBN?.gt(new BN(0))
                              ? formatAmount(
                                receiveAmountBN,
                                poolInfo?.decimals || 0,
                                4
                              ).toString()
                              : ''
                          );
                        }}
                        inputValue={glvBuyPairShortAmount}
                        onInputValueChange={(e) => {
                          const value = e.target.value;
                          setGlvBuyPairShortAmount(value);
                          const glvBuyPairShortAmountBN = formatInput(
                            value,
                            glvBuyPairShort?.decimals || 0
                          );
                          setGlvBuyPairShortAmountBN(glvBuyPairShortAmountBN);
                          const currentTradeMoney = glvBuyPairShortAmountBN?.mul(
                            toSafeBN(glvBuyPairShort?.price)
                          );
                          const tradeMoney = currentTradeMoney?.add(
                            glvPairTradeMoneyLong
                          );
                          setGlvPairTradeMoney(tradeMoney);
                          setGlvPairTradeMoneyShort(currentTradeMoney);
                          const glvPriceBN = toSafeBN(poolInfo?.glvPriceBN);
                          const receiveAmountBN = glvPriceBN.gt(new BN(0))
                            ? tradeMoney?.div(glvPriceBN)
                            : new BN(0)
                          setGlvPairReceiveAmountBN(receiveAmountBN);
                          setGlvPairReceiveAmount(
                            receiveAmountBN?.gt(new BN(0))
                              ? formatAmount(
                                receiveAmountBN,
                                poolInfo?.decimals || 0,
                                4
                              ).toString()
                              : ''
                          );
                        }}
                      >
                        <TokenIcon
                          symbol={glvBuyPairShort?.tokenName || '-'}
                          displaySize={20}
                        />
                        <span className="token-label">
                          {glvBuyPairShort?.tokenName}{' '}
                        </span>
                      </BuyInputSection>
                      {/* Receive */}
                      <BuyInputSection
                        topLeftLabel={t`Receive`}
                        topLeftValue={
                          // '$' + formatAmount(glvPairTradeMoney, 20, 2)
                          '$' + formatAmount(needSubFees?.eq(BN_ZERO) ? glvPairTradeMoney : glvPairTradeMoney?.add(needSubFees), 20, 2)
                        }
                        topRightLabel={t`Balance`}
                        topRightValue={
                          balanceMap?.get(poolInfo?.glvToken)
                            ? formatAmount(
                              new BN(balanceMap?.get(poolInfo?.glvToken) || 0),
                              poolInfo?.decimals,
                              2
                            )
                            : '-'
                        }
                        inputValue={glvPairReceiveAmount}
                        onInputValueChange={(e) => {
                          const value = e.target.value;
                          setGlvPairReceiveAmount(value);
                          console.log('value', value);
                          if (!value || value === '0') {
                            setGlvPairTradeMoney(new BN(0));
                            setGlvPairTradeMoneyShort(new BN(0));
                            setGlvPairTradeMoneyLong(new BN(0));
                            setGlvBuyPairLongAmount('');
                            setGlvBuyPairShortAmount('');
                            setGlvBuyPairLongAmountBN(new BN(0));
                            setGlvBuyPairShortAmountBN(new BN(0));
                            console.log('reset');
                            return;
                          }

                          const receiveAmountBN = formatInput(
                            value,
                            poolInfo?.decimals || 0
                          );
                          setGlvPairReceiveAmountBN(receiveAmountBN);
                          const glvPriceBN = toSafeBN(poolInfo?.glvPriceBN);
                          const tradeMoney = receiveAmountBN?.mul(
                            glvPriceBN
                          );
                          setGlvPairTradeMoney(tradeMoney);
                          console.log('tradeMoney', tradeMoney?.toString());
                          if (tradeMoney?.gt(new BN(0))) {
                            if (
                              glvBuyPairShortAmountBN.eq(new BN(0)) &&
                              glvBuyPairLongAmountBN.eq(new BN(0))
                            ) {
                              const halfTradeMoney = tradeMoney.div(new BN(2));
                              const payLongAmount = halfTradeMoney?.div(
                                new BN(glvBuyPairLong?.price || 0)
                              );
                              const payShortAmount = halfTradeMoney?.div(
                                new BN(glvBuyPairShort?.price || 0)
                              );
                              setGlvPairTradeMoneyLong(halfTradeMoney);
                              setGlvBuyPairLongAmount(
                                formatAmount(
                                  payLongAmount,
                                  glvBuyPairLong?.decimals || 0,
                                  4
                                ).toString()
                              );
                              setGlvBuyPairLongAmountBN(payLongAmount);
                              setGlvPairTradeMoneyShort(halfTradeMoney);
                              setGlvBuyPairShortAmount(
                                formatAmount(
                                  payShortAmount,
                                  glvBuyPairShort?.decimals || 0,
                                  4
                                ).toString()
                              );
                              setGlvBuyPairShortAmountBN(payShortAmount);
                            } else if (
                              glvBuyPairLongAmountBN.eq(new BN(0)) &&
                              glvBuyPairShortAmountBN.gt(new BN(0))
                            ) {
                              const payShortAmount = tradeMoney?.div(
                                new BN(glvBuyPairShort?.price || 0)
                              );
                              setGlvPairTradeMoneyShort(tradeMoney);
                              setGlvBuyPairShortAmount(
                                formatAmount(
                                  payShortAmount,
                                  glvBuyPairShort?.decimals || 0,
                                  4
                                ).toString()
                              );
                              setGlvBuyPairShortAmountBN(payShortAmount);
                            } else if (
                              glvBuyPairLongAmountBN.gt(new BN(0)) &&
                              glvBuyPairShortAmountBN.eq(new BN(0))
                            ) {
                              const payLongAmount = tradeMoney?.div(
                                new BN(glvBuyPairLong?.price || 0)
                              );
                              setGlvPairTradeMoneyLong(tradeMoney);
                              setGlvBuyPairLongAmount(
                                formatAmount(
                                  payLongAmount,
                                  glvBuyPairLong?.decimals || 0,
                                  4
                                ).toString()
                              );
                              setGlvBuyPairLongAmountBN(payLongAmount);
                            } else if (
                              glvBuyPairLongAmountBN.gt(new BN(0)) &&
                              glvBuyPairShortAmountBN.gt(new BN(0))
                            ) {
                              const ratio = glvBuyPairLongAmountBN
                                .mul(new BN(glvBuyPairLong?.price || 0))
                                .div(
                                  glvBuyPairShortAmountBN.mul(
                                    new BN(glvBuyPairShort?.price || 0)
                                  )
                                );
                              const payShortMoney = tradeMoney.div(
                                ratio.add(new BN(1))
                              );
                              const payLongMoney = tradeMoney.sub(payShortMoney);
                              const payLongAmount = payLongMoney?.div(
                                new BN(glvBuyPairLong?.price || 0)
                              );
                              const payShortAmount = payShortMoney?.div(
                                new BN(glvBuyPairShort?.price || 0)
                              );
                              setGlvPairTradeMoneyLong(payLongMoney);
                              setGlvBuyPairLongAmount(
                                formatAmount(
                                  payLongAmount,
                                  glvBuyPairLong?.decimals || 0,
                                  4
                                ).toString()
                              );
                              setGlvPairTradeMoneyShort(payShortMoney);
                              setGlvBuyPairShortAmount(
                                formatAmount(
                                  payShortAmount,
                                  glvBuyPairShort?.decimals || 0,
                                  4
                                ).toString()
                              );
                              setGlvBuyPairShortAmountBN(payShortAmount);
                              setGlvBuyPairLongAmountBN(payLongAmount);
                            }
                          }
                        }}
                      // staticInput={true}
                      >
                        <div className="receive-token">
                          <TokenIcon symbol={poolType} displaySize={20} />
                          <span className="token-label">{poolType}</span>
                        </div>
                      </BuyInputSection>
                    </div>
                  </>
                )}

                {/* Pool */}
                <PoolSelectorSection
                  indexToken={gmPoolInfo?.indexToken}
                  showName={gmPoolInfo?.showName}
                  onOpen={openPoolSelector}
                />

                {/* Submit Button */}
                <div className="submit-button-container">
                  <ExchangeButton
                    params={{
                      isGlvBugSingle,
                      isGlvBuyPair,
                      btnDisabled,
                      btnMessage,
                      isMarketNotOpen,
                      showMarketNotOpenNotice: isGmw272Enabled,
                      poolInfo,
                      glvBuySingleDepositParams,
                      glvBuyPairDepositParams,
                      onSuccess: resetTradeUI,
                      onError: resetTradeUI,
                    }}
                  />
                </div>
              </form>
            </>
          )}

          {operation === 'Sell' && (
            <>
              <form className="trade-form">
                {
                  <>
                    {/* Pay */}
                    <div className='px-[1.2rem] pt-[1.2rem]'>
                      <BuyInputSection
                        topLeftLabel={t`Pay`}
                        topLeftValue={
                          '$' + formatAmount(glvSellTradeMoney, 20, 2)
                        }
                        topRightLabel={t`Balance`}
                        topRightValue={
                          balanceMap?.get(poolInfo?.glvToken)
                            ? formatAmount(
                              new BN(balanceMap?.get(poolInfo?.glvToken) || 0),
                              poolInfo?.decimals,
                              2
                            )
                            : '-'
                        }
                        showMaxButton={true}
                        onClickMax={() => {
                          const payAmountBN = new BN(balanceMap?.get(poolInfo?.glvToken) || 0)
                          setGlvSellPayAmount(
                            formatAmount(
                              payAmountBN,
                              poolInfo?.decimals,
                              2
                            ).toString()
                          );
                          setGlvSellPayAmountBN(payAmountBN);
                          const glvPriceBN = toSafeBN(poolInfo?.glvPriceBN);
                          const tradeMoney = payAmountBN?.mul(
                            glvPriceBN
                          );
                          setGlvSellTradeMoney(tradeMoney);
                          setHasChangeSellReceiveLong(false);
                          setHasChangeSellReceiveShort(false);
                        }}
                        inputValue={glvSellPayAmount}
                        onInputValueChange={(e) => {
                          const value = e.target.value;
                          setGlvSellPayAmount(value);
                          const glvSellPayAmountBN = formatInput(
                            value,
                            poolInfo?.decimals || 0
                          );
                          setGlvSellPayAmountBN(glvSellPayAmountBN);
                          const glvPriceBN = toSafeBN(poolInfo?.glvPriceBN);
                          const tradeMoney = glvSellPayAmountBN?.mul(
                            glvPriceBN
                          );
                          setGlvSellTradeMoney(tradeMoney);
                          setHasChangeSellReceiveLong(false);
                          setHasChangeSellReceiveShort(false);
                        }}
                      >
                        <div className="receive-token">
                          <TokenIcon symbol={poolType} displaySize={20} />
                          <span className="token-label">{poolType}</span>
                        </div>
                      </BuyInputSection>
                      {poolInfo?.longToken === poolInfo?.shortToken && (
                        <BuyInputSection
                          topLeftLabel={t`Receive`}
                          topLeftValue={
                            '$' + formatAmount(glvSellLongTradeMoney, 20, 2)
                          }
                          topRightLabel={t`Balance`}
                          topRightValue={
                            glvBuyPairLong?.amount
                              ? formatAmount(
                                new BN(glvBuyPairLong?.amount || 0),
                                glvBuyPairLong?.decimals,
                                4
                              )
                              : '-'
                          }
                          inputValue={glvSellReceiveLongAmount}
                          onInputValueChange={(e) => {
                            const value = e.target.value;
                            setGlvSellReceiveLongAmount(value);
                            const glvSellReceiveLongAmountBN = formatInput(
                              value,
                              glvBuyPairLong?.decimals || 0
                            );
                            setGlvSellReceiveLongAmountBN(
                              glvSellReceiveLongAmountBN
                            );
                            const longTradeMoney =
                              glvSellReceiveLongAmountBN?.mul(
                                new BN(glvBuyPairLong?.price || 1)
                              );
                            setGlvSellLongTradeMoney(longTradeMoney);
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
                      )}
                      {poolInfo?.longToken !== poolInfo?.shortToken && (
                        <>
                          <BuyInputSection
                            topLeftLabel={t`Receive`}
                            topLeftValue={
                              '$' + formatAmount(glvSellLongTradeMoney, 20, 2)
                            }
                            topRightLabel={t`Balance`}
                            topRightValue={
                              glvBuyPairLong?.amount
                                ? formatAmount(
                                  GMX_SOLANA_TOKENS_RAW[poolInfo?.longToken]?.symbol === 'WSOL' ?
                                    tokenSelectTokens?.find((item) => item?.tokenAddress === 'So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH')?.amount || 0 :
                                    glvBuyPairLong?.amount || 0,
                                  glvBuyPairLong?.decimals,
                                  4
                                )
                                : '-'
                            }
                            inputValue={glvSellReceiveLongAmount}
                            onInputValueChange={(e) => {
                              const value = e.target.value;
                              setGlvSellReceiveLongAmount(value);
                              const glvSellReceiveLongAmountBN = formatInput(
                                value,
                                glvBuyPairLong?.decimals || 0
                              );
                              setGlvSellReceiveLongAmountBN(
                                glvSellReceiveLongAmountBN
                              );
                              const longTradeMoney =
                                glvSellReceiveLongAmountBN?.mul(
                                  new BN(glvBuyPairLong?.price || 1)
                                );
                              setGlvSellLongTradeMoney(longTradeMoney);
                              setHasChangeSellReceiveLong(true);
                              setHasChangeSellReceiveShort(false);

                            }}
                          >
                            <TokenIcon
                              symbol={
                                GMX_SOLANA_TOKENS_RAW[poolInfo?.longToken]?.symbol === 'WGMX'
                                  ? 'GMX'
                                  : GMX_SOLANA_TOKENS_RAW[poolInfo?.longToken]?.symbol || '-'
                              }
                              displaySize={20}
                            />
                            <span className="token-label !text-[1.4rem]">
                              {GMX_SOLANA_TOKENS_RAW[poolInfo?.longToken]?.symbol === 'WGMX'
                                ? 'GMX'
                                : (GMX_SOLANA_TOKENS_RAW[poolInfo?.longToken]?.symbol === 'WSOL' ? 'SOL' : GMX_SOLANA_TOKENS_RAW[poolInfo?.longToken]?.symbol) || '-'}
                            </span>
                          </BuyInputSection>
                          <BuyInputSection
                            topLeftLabel={t`Receive`}
                            topLeftValue={
                              '$' + formatAmount(glvSellShortTradeMoney, 20, 2)
                            }
                            topRightLabel={t`Balance`}
                            topRightValue={
                              glvBuyPairShort?.amount
                                ? formatAmount(
                                  new BN(glvBuyPairShort?.amount || 0),
                                  glvBuyPairShort?.decimals,
                                  4
                                )
                                : '-'
                            }
                            inputValue={glvSellReceiveShortAmount}
                            onInputValueChange={(e) => {
                              const value = e.target.value;
                              setGlvSellReceiveShortAmount(value);
                              const glvSellReceiveShortAmountBN = formatInput(
                                value,
                                glvBuyPairShort?.decimals || 0
                              );
                              setGlvSellReceiveShortAmountBN(
                                glvSellReceiveShortAmountBN
                              );
                              const shortTradeMoney =
                                glvSellReceiveShortAmountBN?.mul(
                                  new BN(glvBuyPairShort?.price || 1)
                                );
                              setGlvSellShortTradeMoney(shortTradeMoney);
                              setHasChangeSellReceiveShort(true);
                              setHasChangeSellReceiveLong(false);
                            }}
                          >
                            <TokenIcon
                              symbol={
                                GMX_SOLANA_TOKENS_RAW[poolInfo?.shortToken]
                                  ?.symbol
                              }
                              displaySize={20}
                            />
                            <span className="token-label !text-[1.4rem]">
                              {
                                GMX_SOLANA_TOKENS_RAW[poolInfo?.shortToken]
                                  ?.symbol
                              }{' '}
                            </span>
                          </BuyInputSection>
                        </>
                      )}
                    </div>
                  </>
                }

                {/* Pool */}
                <PoolSelectorSection
                  indexToken={gmPoolInfo?.indexToken}
                  showName={gmPoolInfo?.showName}
                  onOpen={openPoolSelector}
                  showInfo={!isGmw442Enabled}
                />

                {/* Submit Button */}
                <div className="submit-button-container">
                  <ExchangeButton
                    params={{
                      isGlvBugSingle,
                      isGlvBuyPair,
                      isGlvSell,
                      btnDisabled,
                      btnMessage,
                      isMarketNotOpen,
                      showMarketNotOpenNotice: isGmw272Enabled,
                      poolInfo,
                      glvBuySingleDepositParams,
                      glvBuyPairDepositParams,
                      glvSellWithDrawParams,
                      onSuccess: resetTradeUI,
                      onError: resetTradeUI,
                    }}
                  />
                </div>
              </form>
            </>
          )}

          {/* Shift */}
          {operation === 'Shift' && (
            <div className="shift-form">
              <div className="shift-placeholder">
                <Trans>Shift functionality coming soon</Trans>
              </div>
            </div>
          )}
        </div>
        {/* Price Impact / Fees */}
        {isGlvBugSingle && (
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
                              <span className={`${glvBuySingleDepositSimulator?.priceImpact?.gt(new BN(0)) ? 'text-green-500' : glvBuySingleDepositSimulator?.priceImpact?.lt(new BN(0)) ? 'text-red-500' : ''}`}>
                                {glvBuySingleDepositSimulator?.priceImpact?.gt(new BN(0)) ? '+' + glvBuySingleDepositSimulator?.priceImpactRate :
                                  glvBuySingleDepositSimulator?.priceImpact?.lt(new BN(0)) ? '-' + glvBuySingleDepositSimulator?.priceImpactRate : '0.00%'}
                              </span>
                              <span style={{ color: '#A3A3A3' }}>/</span>
                              {glvBuySingleDepositSimulator?.feesRate === '-' ||
                                !glvBuySingleDepositSimulator?.feesRate
                                ? '-0.00%'
                                : '-' + glvBuySingleDepositSimulator?.feesRate}
                            </span>
                          </Trans>
                        }
                        renderContent={() => (
                          <div className="priceImpactContent">
                            <p>
                              <span><Trans>Price Impact:</Trans></span>
                              <span className={`${glvBuySingleDepositSimulator?.priceImpact?.gt(new BN(0)) ? 'text-green-500' : glvBuySingleDepositSimulator?.priceImpact?.lt(new BN(0)) ? 'text-red-500' : ''}`}>
                                {glvBuySingleDepositSimulator?.priceImpact
                                  ? (glvBuySingleDepositSimulator?.priceImpact?.abs()?.gte(new BN(1).mul(new BN(10).pow(new BN(18)))) ?
                                    formatUsd(glvBuySingleDepositSimulator?.priceImpact) : (glvBuySingleDepositSimulator?.priceImpact?.abs()?.gt(new BN(0)) ? '<-$0.01' : '$0.00'))
                                  : '$0.00'}
                                {/* {glvBuySingleDepositSimulator?.priceImpact
                                  ? (formatAmount(
                                    glvBuySingleDepositSimulator?.priceImpact,
                                    20,
                                    2
                                  ) === '-0.00' ? '<-$0.01' : (formatAmountWithD(
                                    glvBuySingleDepositSimulator?.priceImpact,
                                    20,
                                    2
                                  ) === '+0.00' ? '<$0.01' : formatAmountWithD(
                                    glvBuySingleDepositSimulator?.priceImpact,
                                    20,
                                    2
                                  )))
                                  : '$0.00'} */}
                              </span>
                            </p>
                            <p>
                              (
                              {glvBuySingleDepositSimulator?.priceImpactRate ||
                                '0.00%'}{' '}
                              <Trans>of buy amount</Trans>)
                            </p>
                            <p className="buyFee">
                              <span><Trans>Buy Fee:</Trans></span>
                              <span className={`${glvBuySingleDepositSimulator?.allFees && !glvBuySingleDepositSimulator?.allFees?.eq(new BN(0)) ? 'text-red-500' : ''}`}>
                                {glvBuySingleDepositSimulator?.allFees && !glvBuySingleDepositSimulator?.allFees?.eq(BN_ZERO)
                                  ? (glvBuySingleDepositSimulator?.allFees?.gte(new BN(1).mul(new BN(10).pow(new BN(18)))) ?
                                    '-' + formatUsd(glvBuySingleDepositSimulator?.allFees) : '<-$0.01')
                                  : '$0.00'}
                              </span>
                            </p>
                            <p>
                              (
                              {
                                glvBuySingleDepositSimulator?.feesRate === '-' ? '0.00%' : glvBuySingleDepositSimulator?.feesRate || '0.00%'
                              }{' '}
                              <Trans>of buy amount</Trans>)
                            </p>
                          </div>
                        )}
                      />
                    </div>
                  }
                />

                {/* Execution Details */}
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
                    !isGmw291Enabled || poolInfo?.buyableAmount != null ? (
                      <>
                        <span style={{ color: '#fff' }}>{glvBuyableAmountText}</span>{' '}
                        <span style={{ color: '#A3A3A3' }}>{glvBuyableUsdText}</span>
                      </>
                    ) : <CellSkeleton width={130} height={14} />
                  }
                />
              </ExchangeInfo.Group>
            </ExchangeInfo>
          </div>
        )}
        {isGlvBuyPair && (
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
                              <span className={`${glvBuyPairDepositSimulator?.priceImpact?.gt(new BN(0)) ? 'text-green-500' : glvBuyPairDepositSimulator?.priceImpact?.lt(new BN(0)) ? 'text-red-500' : ''}`}>
                                {glvBuyPairDepositSimulator?.priceImpact?.gt(new BN(0)) ? '+' + glvBuyPairDepositSimulator?.priceImpactRate :
                                  glvBuyPairDepositSimulator?.priceImpact?.lt(new BN(0)) ? '-' + glvBuyPairDepositSimulator?.priceImpactRate : '0.00%'}
                              </span>
                              <span style={{ color: '#A3A3A3' }}>/</span>
                              {glvBuyPairDepositSimulator?.feesRate === '-' ||
                                !glvBuyPairDepositSimulator?.feesRate
                                ? '-0.00%'
                                : '-' + glvBuyPairDepositSimulator?.feesRate}
                            </span>
                          </Trans>
                        }
                        renderContent={() => (
                          <div className="priceImpactContent">
                            <p>
                              <span><Trans>Price Impact:</Trans></span>
                              <span className={`${glvBuyPairDepositSimulator?.priceImpact?.gt(new BN(0)) ? 'text-green-500' : glvBuyPairDepositSimulator?.priceImpact?.lt(new BN(0)) ? 'text-red-500' : ''}`}>
                                {glvBuyPairDepositSimulator?.priceImpact
                                  ? (glvBuyPairDepositSimulator?.priceImpact?.abs()?.gte(new BN(1).mul(new BN(10).pow(new BN(18)))) ?
                                    formatUsd(glvBuyPairDepositSimulator?.priceImpact) : (glvBuyPairDepositSimulator?.priceImpact?.abs()?.gt(new BN(0)) ? '<-$0.01' : '$0.00'))
                                  : '$0.00'}
                                {/* {glvBuyPairDepositSimulator?.priceImpact
                                  ? (formatAmount(
                                    glvBuyPairDepositSimulator?.priceImpact,
                                    20,
                                    2
                                  ) === '-0.00' ? '<-$0.01' : (formatAmountWithD(
                                    glvBuyPairDepositSimulator?.priceImpact,
                                    20,
                                    2
                                  ) === '+0.00' ? '<$0.01' : formatAmountWithD(
                                    glvBuyPairDepositSimulator?.priceImpact,
                                    20,
                                    2
                                  )))
                                  : '0.00'} */}
                              </span>
                            </p>
                            <p>
                              (
                              {glvBuyPairDepositSimulator?.priceImpactRate ||
                                '0.00%'}{' '}
                              <Trans>of buy amount</Trans>)
                            </p>
                            <p className="buyFee">
                              <span><Trans>Buy Fee:</Trans></span>
                              <span className='text-red-500'>
                                {glvBuyPairDepositSimulator?.allFees && !glvBuyPairDepositSimulator?.allFees?.eq(BN_ZERO)
                                  ? (glvBuyPairDepositSimulator?.allFees?.gte(new BN(1).mul(new BN(10).pow(new BN(18)))) ?
                                    '-' + formatUsd(glvBuyPairDepositSimulator?.allFees) : '<-$0.01')
                                  : '$0.00'}
                                {/* -$
                                {!glvBuyPairDepositSimulator?.allFees?.eq(new BN(0))
                                  ? formatAmountFree(
                                    glvBuyPairDepositSimulator?.allFees,
                                    20,
                                    2
                                  )
                                  : '$0.00'} */}
                              </span>
                            </p>
                            <p>
                              ({
                                glvBuyPairDepositSimulator?.feesRate || '0.00%'
                              }{' '}
                              <Trans>of buy amount</Trans>)
                            </p>
                          </div>
                        )}
                      />
                    </div>
                  }
                />

                {/* Execution Details */}
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
                    !isGmw291Enabled || poolInfo?.buyableAmount != null ? (
                      <>
                        <span style={{ color: '#fff' }}>{glvBuyableAmountText}</span>{' '}
                        <span style={{ color: '#A3A3A3' }}>{glvBuyableUsdText}</span>
                      </>
                    ) : <CellSkeleton width={130} height={14} />
                  }
                />
              </ExchangeInfo.Group>
            </ExchangeInfo>
          </div>
        )}
        {isGlvSell && (
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
                              <span className={`${glvSellWithDrawSimulator?.priceImpact?.gt(new BN(0)) ? 'text-green-500' : glvSellWithDrawSimulator?.priceImpact?.lt(new BN(0)) ? 'text-red-500' : ''}`}>
                                {glvSellWithDrawSimulator?.priceImpact?.gt(new BN(0)) ? '+' + glvSellWithDrawSimulator?.priceImpactRate :
                                  glvSellWithDrawSimulator?.priceImpact?.lt(new BN(0)) ? '-' + glvSellWithDrawSimulator?.priceImpactRate : '0.00%'}
                              </span>
                              <span style={{ color: '#A3A3A3' }}>/</span>
                              {glvSellWithDrawSimulator?.feesRate === '-' ||
                                !glvSellWithDrawSimulator?.feesRate
                                ? '-0.00%'
                                : '-' + glvSellWithDrawSimulator?.feesRate}
                            </span>
                          </Trans>
                        }
                        renderContent={() => (
                          <div className="priceImpactContent">
                            <p>
                              <span><Trans>Sell Fee:</Trans></span>
                              <span className='text-red-500'>
                                {glvSellWithDrawSimulator?.allFees
                                  ? (glvSellWithDrawSimulator?.allFees?.gte(new BN(1).mul(new BN(10).pow(new BN(18)))) ? '-' + formatUsd(glvSellWithDrawSimulator?.allFees) : (glvSellWithDrawSimulator?.allFees?.gt(new BN(0)) ? '<-$0.01' : '$0.00'))
                                  : '$0.00'}
                              </span>
                            </p>
                            <p>
                              ({glvSellWithDrawSimulator?.feesRate ? (glvSellWithDrawSimulator?.feesRate !== '-' ? glvSellWithDrawSimulator?.feesRate : '0.00%') : '0.00%'}{' '}
                              <Trans>of sell amount</Trans>)
                            </p>
                          </div>
                        )}
                      />
                    </div>
                  }
                />

                {/* Execution Details */}
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
                      <span style={{ color: '#fff' }}>{glvSellableAmountText}</span>{' '}
                      <span style={{ color: '#A3A3A3' }}>{glvSellableUsdText}</span>
                    </>
                  }
                />
              </ExchangeInfo.Group>
            </ExchangeInfo>
          </div>
        )}
      </div>
      <TokenSelectDrawer
        isGlv={poolType === 'GLV'}
        key={selectType}
        isOpen={isPanelOpen}
        selectType={selectType}
        title={tokenSelectTitle}
        payerSwapTokens={
          isGlvBuyPair &&
            (glvBuyPairLong?.tokenName === 'SOL' ||
              glvBuyPairLong?.tokenName === 'WSOL' ||
              glvBuyPairLong?.tokenName === 'PUMP' ||
              glvBuyPairLong?.tokenName === 'WPUMP')
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
        sortedTokens={gmTokens}
        onClose={() => setIsPanelOpen(false)}
        onSelectToken={(token) => {
          if (!token) {
            return;
          }
          if (selectType === 'pay') {
            setHasChangePay(true);
            setPayInfo(token);
            const payAmountBN = formatInput(
              glvSinglePayAmount,
              token?.decimals
            );
            const payPrice = toSafeBN(token?.price);
            const payMoney = payAmountBN?.mul(payPrice);
            setGlvSingleTradeMoney(payMoney);
            const glvPriceBN = toSafeBN(poolInfo?.glvPriceBN);
            const receiveAmountBN = glvPriceBN.gt(new BN(0))
              ? payMoney?.div(glvPriceBN)
              : new BN(0);
            setGlvSingleReceiveAmountBN(receiveAmountBN);
            setGlvSingleReceiveAmount(
              receiveAmountBN?.gt(new BN(0))
                ? formatAmountFree(receiveAmountBN, poolInfo?.decimals || 0, 5)
                : ''
            );
            if (
              isGlvBuyPair &&
              (glvBuyPairLong?.tokenName === 'SOL' ||
                glvBuyPairLong?.tokenName === 'WSOL' ||
                glvBuyPairLong?.tokenName === 'PUMP' ||
                glvBuyPairLong?.tokenName === 'WPUMP')
            ) {
              setGlvBuyPairLong(token);
              setHasChangeGlvBuyPairLong(true);
            }
          } else if (selectType === 'market') {
            setHasChangeGm(true);
            setGmPoolInfo(token);
          }
        }}
      />
    </div >
  );
};

export default GlvTradePanel;
