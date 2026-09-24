import {
  getGmw331Enabled,
  getGmw307Enabled,
  getGmw396Enabled,
} from '@/config/featureFlagEnable';
import './index.scss';
import Button from '@/components/Common/Button/Button';
import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { t, Trans } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import { BN_ZERO } from '@/config/constants';

import { useStoreAccount } from '@/hooks/fetchHooks/useStoreAccount';
import { useMarkets } from '@/components/Pools/Hooks/useMarkets';
import { useGlvMarkets } from '@/components/Pools/Hooks/useGlvMarkets';
import { useTokenMetadatasForGlv } from '@/components/Pools/Hooks/useTokenMetadatasForGlv';
import { formatMarketName } from '@/components/TradeBoxNew/utils/formatMarketName';
import { useStakeQueryController } from '@/components/Stake/Hooks/useStakeQueryController';
import {
  useStakeGlobalState,
  StakeGlobalState,
} from '@/components/Stake/Hooks/useStakeGlobalState';
import {
  useStakePositions,
  StakePosition,
} from '@/components/Stake/Hooks/useStakePositions';
import {
  useStakeHistoryData,
  STAKE_HISTORY_PAGE_SIZE,
} from '@/components/Stake/Hooks/useStakeHistoryData';
import { useGtEarnedTotals } from '@/components/GT/Hooks/useGtEarnedTotals';
import { useGtHistoryDataLegacy } from '@/components/GT/Hooks/useGtHistoryDataLegacy';

import { formatAmount, formatLiquidationPrice } from '@/utils/legacy/format';
import { getBalanceMap } from '@/components/Pools/utils/getBalanceMap';
import { getCumulativeInvCostFactorNow } from './utils/getCumulativeInvCostFactorNow';
import { getComputeTimeWeightedApyBN } from './utils/getComputeTimeWeightedApyBN';
import { getWeeksPassedUTC } from './utils/time';
import {
  GMX_SOLANA_GLV_TOKENS,
  GMX_SOLANA_TOKENS_RAW,
  GMX_SOLANA_STORE_ADDRESS,
  GMX_SOLANA_GLV_MARKET_TOKENS,
  GMX_SOLANA_GLV_METAL_MARKET_TOKENS,
  GMX_SOLANA_GLV_METAL_RWA_MARKET_TOKENS,
  GMX_SOLANA_GLV_METAL_RWA_COMMODITY_TOKENS,
} from '@/config/program';
import { MARKET_LIST_PER_PAGE } from '@/config/ui';
import { useAnchor } from '@/contexts/anchor';
import { BN } from '@coral-xyz/anchor';
import { useWallet } from '@solana/wallet-adapter-react';
import { getNormalizedTokenSymbolGMX } from '@/utils/token/getNormalizedTokenSymbolGMX';
import {
  isUSMarketOpen,
  isMetalMarketOpen,
  isCommodityMarketOpen,
} from '@/components/TradeBoxNew/utils/isUSMarketOpen';
// import GTHeader from '@/components/GT/GTHeader';
import Overview from './components/Overview';
import StakeList from './components/StakeList';
import UnStakeList from './components/UnStakeList';
import StakeGLVGM from './components/StakeGLVGM';
import { useMedia } from 'react-use';
import IconSelect from '@/img/stake/select.svg';
import IconSelectedAll from '@/img/stake/selectedall.svg';
import { getGlvDisplayNameByTokenAddress } from '@/utils/glv/getGlvDisplayName';
import {
  GLV_FOREX_RWA_TOKENS,
} from '@/utils/glv/glvTokens';
import { areGlvMarketsOpen } from '@/utils/glv/areGlvMarketsOpen';

const getBaseTabData = () => [
  {
    key: 'stake',
    label: t`Stake Positions`,
    value: 0,
    active: true,
  },
  {
    key: 'unstake',
    label: t`Stake/Unstake History`,
    value: 0,
    active: false,
  },
];

export default function StakeIndex() {
  const { i18n } = useLingui();
  const navigate = useNavigate();
  const isMobile = useMedia('(max-width: 890px)');
  const mobile = useMedia('(max-width: 768px)');
  const isScreen1024 = useMedia('(max-width: 1024px)');

  const { connected } = useWallet();
  const { owner } = useAnchor();
  const { store } = useStoreAccount(GMX_SOLANA_STORE_ADDRESS);
  const { glvs } = useGlvMarkets(GMX_SOLANA_GLV_TOKENS);
  const { tokenMetadatas: glvTokenMetadatas } = useTokenMetadatasForGlv(
    GMX_SOLANA_GLV_TOKENS
  );
  const { balanceMap } = getBalanceMap();
  const { marketInfosMap, allMarketInfos } = useMarkets();
  const { stakeQueryController, isLoading: isQueryControllerLoading } =
    useStakeQueryController();
  const { stakeGloablState, isLoading: isGlobalStateLoading } =
    useStakeGlobalState();
  const stakeGlobalStateData = stakeGloablState as Partial<StakeGlobalState>;
  const {
    stakePositions,
    isLoading: isPositionsLoading,
    refresh,
  } = useStakePositions(owner);
  const isGmw331Enabled = getGmw331Enabled();
  const isGmw307Enabled = getGmw307Enabled();
  const isGmw396Enabled = getGmw396Enabled();
  const { earnedTotals } = useGtEarnedTotals();
  const { gtHistory } = useGtHistoryDataLegacy(!isGmw331Enabled);

  const [isVisible, setIsVisible] = useState(false);
  const [tabsActive, setTabsActive] = useState('stake');
  const [historyPage, setHistoryPage] = useState(1);
  const [selectedPositions, setSelectedPositions] = useState([]);
  const [selectedClaimGtPositions, setSelectedClaimGtPositions] = useState([]);
  const [selectedUnstakPositions, setSelectedUnstakPositions] = useState([]);
  const [stakeType, setStakeType] = useState<'Stake' | 'Unstake' | 'Claim'>(
    'Stake'
  );
  const [isShowCheckBox, setIsShowCheckBox] = useState(true);
  const [isInputDisabled, setIsInputDisabled] = useState(true);
  const stakeListRef = useRef(null);

  const {
    stakeHistory,
    hasMore: hasMoreStakeHistory,
    isLoading: isStakeHistoryLoading,
    refresh: stakeHistoryRefresh,
  } = useStakeHistoryData(
    isGmw396Enabled ? historyPage : 1,
    STAKE_HISTORY_PAGE_SIZE,
    isGmw396Enabled ? tabsActive === 'unstake' : true
  );

  const isPositionsListLoading = useMemo(() => {
    if (!connected) return false;
    const hasBalanceMap = balanceMap.size > 0;
    const hasGlvs = Object.keys(glvs).length > 0;
    const hasMarketInfosMap = marketInfosMap.size > 0;
    const hasStakeGtState = Boolean(
      store?.gt?.cumulativeInvCostFactor &&
      store?.gt?.lastCumulativeInvCostFactorTs &&
      store?.gt?.mintingCost
    );
    if (
      !isPositionsLoading &&
      !isQueryControllerLoading &&
      !isGlobalStateLoading &&
      hasBalanceMap &&
      hasGlvs &&
      hasMarketInfosMap &&
      hasStakeGtState
    ) {
      return false;
    }
    return true;
  }, [
    balanceMap,
    glvs,
    marketInfosMap,
    connected,
    isPositionsLoading,
    isQueryControllerLoading,
    isGlobalStateLoading,
    store?.gt,
  ]);

  const isStakeHistoryListLoading = useMemo(() => {
    if (!connected) return false;
    const loadingBalanceMap = balanceMap.size > 0;
    const loadingGlvs = Object.keys(glvs).length > 0;
    const loadingMarketInfosMap = marketInfosMap.size > 0;
    if (
      !isStakeHistoryLoading &&
      loadingBalanceMap &&
      loadingGlvs &&
      loadingMarketInfosMap
    ) {
      return false;
    }
    return true;
  }, [balanceMap, glvs, marketInfosMap, connected, isStakeHistoryLoading]);

  const { walletMarketToken, walletBalance } = useMemo(() => {
    if (
      !connected ||
      isQueryControllerLoading ||
      !balanceMap ||
      !Object.keys(glvs).length
    ) {
      return { walletMarketToken: [], walletBalance: new BN(0) };
    }

    try {
      let userWalletBalance = new BN('0');

      const gmMarketToken = new Map(
        allMarketInfos
          .filter((item) => {
            return balanceMap?.get(item.marketToken);
          })
          .map((item) => {
            const balance = balanceMap?.get(item.marketToken);
            const minimumUnitPrice = new BN(item.marketPrice).div(
              new BN(10).pow(new BN(item.marketDecimals))
            );
            const itemPriceUsd = balance.mul(minimumUnitPrice);
            userWalletBalance = userWalletBalance.add(itemPriceUsd);
            const symbol = getNormalizedTokenSymbolGMX(
              GMX_SOLANA_TOKENS_RAW[item.indexToken].symbol
            );
            const displaySymbol = formatMarketName(item.indexToken);
            const isRwa = GMX_SOLANA_GLV_MARKET_TOKENS.includes(
              symbol?.toLocaleLowerCase()
            );
            const isMetalRwa = GMX_SOLANA_GLV_METAL_RWA_MARKET_TOKENS.includes(
              symbol?.toLocaleLowerCase()
            );
            const isCommodityRWA =
              GMX_SOLANA_GLV_METAL_RWA_COMMODITY_TOKENS.includes(
                symbol?.toLocaleLowerCase()
              );

            const gmLongToken = getNormalizedTokenSymbolGMX(
              GMX_SOLANA_TOKENS_RAW[item.longToken].symbol
            );
            const gmShortToken = getNormalizedTokenSymbolGMX(
              GMX_SOLANA_TOKENS_RAW[item.shortToken].symbol
            );
            const symbolPair = `${gmLongToken}-${gmShortToken}`;

            const data = {
              indexToken: item.indexToken,
              longToken: item.longToken,
              shortToken: item.shortToken,
              marketToken: item.marketToken,
              decimals: item.marketDecimals,
              unitPrice: minimumUnitPrice,
              balance,
              symbol,
              symbolName: '/USD',
              displaySymbol,
              symbolPair,
              poolType: 'GM',
              isRwa: isRwa || isMetalRwa || isCommodityRWA,
              isRwaOpen: !item?.closed,
            };
            return [item.marketToken, data];
          })
      );

      const glvMarketToken = new Map(
        Object.entries(glvs)
          .filter(([key]) => {
            return balanceMap?.get(key);
          })
          .map(([key, glv]) => {
            let isRwa = false;
            let isMetalRwa = false;
            let isForexRwa = false;
            let isCommodityRWA = false;
            const isGlvOpen = areGlvMarketsOpen(glv.markets, marketInfosMap);
            const gmTotalBalance = glv.markets.reduce((sum, c) => {
              const glvMarketTokenAddress = c?.marketTokenAddress?.toString();
              const glvTokenAddress = key?.toString();
              if (c?.gmBalance?.gt(new BN(0)) && marketInfosMap) {
                const glvMarketInfo = marketInfosMap.get(glvMarketTokenAddress);
                if (glvMarketInfo) {
                  isForexRwa = glvTokenAddress
                    ? GLV_FOREX_RWA_TOKENS.includes(glvTokenAddress)
                    : false;
                  isRwa = GMX_SOLANA_GLV_MARKET_TOKENS.includes(
                    GMX_SOLANA_TOKENS_RAW[
                      glvMarketInfo.indexToken
                    ]?.symbol?.toLocaleLowerCase()
                  );
                  isMetalRwa = GMX_SOLANA_GLV_METAL_RWA_MARKET_TOKENS.includes(
                    GMX_SOLANA_TOKENS_RAW[
                      glvMarketInfo.indexToken
                    ]?.symbol?.toLocaleLowerCase()
                  );
                  isCommodityRWA =
                    GMX_SOLANA_GLV_METAL_RWA_COMMODITY_TOKENS.includes(
                      GMX_SOLANA_TOKENS_RAW[
                        glvMarketInfo.indexToken
                      ]?.symbol?.toLocaleLowerCase()
                    );
                }

                const glvToken = marketInfosMap.get(glvMarketTokenAddress);
                if (glvToken) {
                  const priceUsd = c.gmBalance
                    .mul(new BN(glvToken.marketPrice))
                    .div(new BN(10).pow(new BN(glvToken.marketDecimals)));
                  return sum.add(priceUsd);
                }
              }
              return sum;
            }, new BN(0));

            const { glvAddress, longTokenAddress, shortTokenAddress } = glv;
            const balance = balanceMap.get(key) || new BN(0);
            const decimals = glvTokenMetadatas[key]?.decimals;
            const price = gmTotalBalance.div(
              glvTokenMetadatas[key].totalSupply
            );
            const itemPriceUsd = balance.mul(price);
            userWalletBalance = userWalletBalance.add(itemPriceUsd);

            const glvLongToken = getNormalizedTokenSymbolGMX(
              GMX_SOLANA_TOKENS_RAW[longTokenAddress.toString()]?.symbol
            );
            const glvShortToken = getNormalizedTokenSymbolGMX(
              GMX_SOLANA_TOKENS_RAW[shortTokenAddress.toString()]?.symbol
            );
            const symbolPair = `${glvLongToken}-${glvShortToken}`;
            const symbolAnother = getGlvDisplayNameByTokenAddress(key?.toString());

            return [
              key,
              {
                indexToken: glvAddress.toString(),
                longToken: longTokenAddress.toString(),
                shortToken: shortTokenAddress.toString(),
                marketToken: key,
                price,
                decimals,
                unitPrice: price,
                balance,
                symbol: 'GLV',
                symbolAnother,
                symbolName: '',
                symbolPair,
                poolType: 'GLV',
                isRwa: isRwa || isForexRwa || isMetalRwa || isCommodityRWA,
                isRwaOpen: isGlvOpen,
              },
            ];
          })
      );

      const computedWalletBalance = userWalletBalance.gt(new BN(0))
        ? userWalletBalance
        : new BN(0);

      const stakeList = new Map();
      if (stakeQueryController?.length) {
        stakeQueryController.forEach((item) => {
          const tokenAddress = item.lpTokenMint.toString();
          const marketToken =
            glvMarketToken.get(tokenAddress) || gmMarketToken.get(tokenAddress);
          if (
            item.isEnabled &&
            marketToken?.balance?.gt(new BN(0)) &&
            marketToken &&
            !stakeList.has(tokenAddress)
          ) {
            stakeList.set(tokenAddress, {
              ...marketToken,
              controllerIndex: item.controllerIndex,
            });
          }
        });
      }
      return {
        walletMarketToken: [...stakeList.values()],
        walletBalance: computedWalletBalance,
      };
    } catch (error) {
      console.error('GLV GM error', error);
      return { walletMarketToken: [], walletBalance: new BN(0) };
    }
  }, [
    connected,
    isQueryControllerLoading,
    balanceMap,
    glvs,
    allMarketInfos,
    marketInfosMap,
    stakeQueryController,
    glvTokenMetadatas,
  ]);

  const { stakePositionLists, stakeValue, unclaimedGTFromStake } =
    useMemo(() => {
      try {
        let userStakeValue = new BN('0');
        let userUnclaimedGTFromStake = new BN('0');
        const apyGradient = stakeGlobalStateData?.apyGradient;

        if (
          !isPositionsListLoading &&
          stakePositions &&
          stakePositions?.length &&
          Array.isArray(stakeQueryController) &&
          apyGradient?.length
        ) {
          const SECONDS_PER_YEAR = new BN(31_557_600);

          const stakeListData = stakePositions
            ?.map((item) => {
              let effectiveEndTime: number = 0;
              let cumNow: BN = new BN('0');
              let gtAmount: BN = new BN('0');
              let currentApr: string = '0';
              let isEnabled: boolean = false;
              let endTime: BN = new BN('0');

              const marketToken = item.lpMint.toString();
              const gmMarketToken = marketInfosMap.get(marketToken);
              const glvMarketToken = glvs[marketToken];

              if (stakeQueryController && stakeQueryController?.length) {
                stakeQueryController?.forEach((c) => {
                  if (
                    c.controllerAddress.toString() ===
                    item.controller.toString()
                  ) {
                    if (c.isEnabled) {
                      effectiveEndTime = Math.floor(Date.now() / 1000);
                      cumNow = getCumulativeInvCostFactorNow(
                        store?.gt?.cumulativeInvCostFactor,
                        store?.gt?.lastCumulativeInvCostFactorTs?.toNumber(),
                        store?.gt?.mintingCost,
                        effectiveEndTime
                      );
                      isEnabled = false;
                      endTime = item.stakeStartTime;
                    } else {
                      effectiveEndTime = c.disabledAt.toNumber();
                      cumNow = c.disabledCumInvCost;
                      isEnabled = true;
                      endTime = c.disabledAt;
                    }
                  }
                });
              }

              const stakeStartTime = item?.stakeStartTime.toNumber();
              const avgApr = getComputeTimeWeightedApyBN(
                stakeStartTime,
                effectiveEndTime,
                apyGradient
              );

              const avgApyPerSec = (avgApr || new BN(0)).div(SECONDS_PER_YEAR);
              const invCostIntegral = (cumNow || new BN(0)).sub(
                item?.cumInvCost || new BN(0)
              );
              const durationSeconds = effectiveEndTime - stakeStartTime;

              const index = getWeeksPassedUTC(
                isEnabled ? endTime.toNumber() : stakeStartTime
              );
              const aprValue: BN = apyGradient[index] || new BN('0');
              const currentAprValue = aprValue.gt(new BN('0'))
                ? formatLiquidationPrice(aprValue.muln(100), {
                  displayDecimals: 2,
                  showDollarSign: false,
                  useCommas: false,
                })
                : 0;
              currentApr = `${Number(currentAprValue).toFixed(2)}%`;

              const SCALE = new BN(10).pow(new BN(MARKET_LIST_PER_PAGE));
              const stakedValueUsd = item?.stakedValueUsd || new BN(0);
              const perSecFactor = stakedValueUsd.mul(avgApyPerSec).div(SCALE);
              const gtRaw = perSecFactor.mul(invCostIntegral).div(SCALE);

              if (durationSeconds <= 0) {
                gtAmount = new BN('0');
              } else {
                gtAmount = gtRaw;
              }

              userStakeValue = userStakeValue.add(stakedValueUsd);
              userUnclaimedGTFromStake = userUnclaimedGTFromStake.add(gtAmount);

              if (gmMarketToken) {
                const balance = item?.stakedAmount;
                const minimumUnitPrice = new BN(gmMarketToken.marketPrice).div(
                  new BN(10).pow(new BN(gmMarketToken.marketDecimals))
                );
                const symbol = getNormalizedTokenSymbolGMX(
                  GMX_SOLANA_TOKENS_RAW[gmMarketToken.indexToken].symbol
                );
                const displaySymbol = formatMarketName(
                  gmMarketToken.indexToken
                );
                const isRwa = GMX_SOLANA_GLV_MARKET_TOKENS.includes(
                  symbol?.toLocaleLowerCase()
                );
                const isMetalRwa =
                  GMX_SOLANA_GLV_METAL_RWA_MARKET_TOKENS.includes(
                    symbol?.toLocaleLowerCase()
                  );
                const isCommodityRWA =
                  GMX_SOLANA_GLV_METAL_RWA_COMMODITY_TOKENS.includes(
                    symbol?.toLocaleLowerCase()
                  );

                return {
                  indexToken: gmMarketToken.indexToken,
                  marketToken: gmMarketToken.marketToken,
                  longToken: gmMarketToken.longToken,
                  shortToken: gmMarketToken.shortToken,
                  decimals: gmMarketToken.marketDecimals,
                  symbol,
                  symbolName: '/USD',
                  displaySymbol,
                  unitPrice: minimumUnitPrice,
                  balance,
                  symbolPair: `${getNormalizedTokenSymbolGMX(GMX_SOLANA_TOKENS_RAW[gmMarketToken.longToken].symbol)}-${getNormalizedTokenSymbolGMX(GMX_SOLANA_TOKENS_RAW[gmMarketToken.shortToken].symbol)}`,
                  poolType: 'GM',
                  gtAmount,
                  currentApr,
                  isRwa: isRwa || isMetalRwa || isCommodityRWA,
                  isRwaOpen: !gmMarketToken?.closed,
                  isEnabled,
                  endTime,
                  ...item,
                };
              } else if (glvMarketToken) {
                const isGlvOpen = areGlvMarketsOpen(
                  glvMarketToken.markets,
                  marketInfosMap
                );
                const gmTotalBalance = glvMarketToken.markets.reduce(
                  (sum, c) => {
                    if (c?.gmBalance?.gt(new BN(0)) && marketInfosMap) {
                      const glvToken = marketInfosMap.get(
                        c.marketTokenAddress.toString()
                      );
                      if (glvToken) {
                        const priceUsd = c.gmBalance
                          .mul(new BN(glvToken.marketPrice))
                          .div(new BN(10).pow(new BN(glvToken.marketDecimals)));
                        return sum.add(priceUsd);
                      }
                    }
                    return sum;
                  },
                  new BN(0)
                );

                const decimals = glvTokenMetadatas[marketToken]?.decimals;
                const price = gmTotalBalance.div(
                  glvTokenMetadatas[marketToken].totalSupply
                );
                const balance = item?.stakedAmount;
                const glvToken = glvMarketToken.glvTokenAddress.toString();
                const symbolAnother = getGlvDisplayNameByTokenAddress(glvToken);

                return {
                  indexToken: glvMarketToken.glvAddress.toString(),
                  longToken: glvMarketToken.longTokenAddress.toString(),
                  shortToken: glvMarketToken.shortTokenAddress.toString(),
                  marketToken: glvMarketToken.glvTokenAddress.toString(),
                  price,
                  decimals,
                  unitPrice: price,
                  balance,
                  symbol: 'GLV',
                  symbolAnother,
                  symbolName: '',
                  symbolPair: `${getNormalizedTokenSymbolGMX(GMX_SOLANA_TOKENS_RAW[glvMarketToken.longTokenAddress].symbol)}-${getNormalizedTokenSymbolGMX(GMX_SOLANA_TOKENS_RAW[glvMarketToken.shortTokenAddress].symbol)}`,
                  poolType: 'GLV',
                  gtAmount,
                  currentApr,
                  isRwa: true,
                  isRwaOpen: isGlvOpen,
                  isEnabled,
                  endTime,
                  ...item,
                };
              }
            })
            .filter((c) => c && c?.balance?.gt(new BN(0)));

          return {
            stakePositionLists: stakeListData,
            stakeValue: userStakeValue,
            unclaimedGTFromStake: userUnclaimedGTFromStake,
          };
        }
        return {
          stakePositionLists: [],
          stakeValue: new BN('0'),
          unclaimedGTFromStake: new BN('0'),
        };
      } catch (error) {
        console.error('Stake positions compute error', error);
        return {
          stakePositionLists: [],
          stakeValue: new BN('0'),
          unclaimedGTFromStake: new BN('0'),
        };
      }
    }, [
      stakePositions,
      isPositionsListLoading,
      marketInfosMap,
      glvs,
      stakeQueryController,
      stakeGlobalStateData,
      store,
      glvTokenMetadatas,
    ]);

  const unStakePositionLists = useMemo(() => {
    if (stakeHistory && stakeHistory.length && !isStakeHistoryListLoading) {
      const stakeHistoryListData = stakeHistory.map((item) => {
        const marketToken = item.lpMint.toString();
        const gmMarketToken = marketInfosMap.get(marketToken);
        const glvMarketToken = glvs[marketToken];

        if (gmMarketToken) {
          const symbol = getNormalizedTokenSymbolGMX(
            GMX_SOLANA_TOKENS_RAW[gmMarketToken.indexToken].symbol
          );
          const displaySymbol = formatMarketName(gmMarketToken.indexToken);
          const isRwa = GMX_SOLANA_GLV_MARKET_TOKENS.includes(
            symbol?.toLocaleLowerCase()
          );
          const isMetalRwa = GMX_SOLANA_GLV_METAL_MARKET_TOKENS.includes(
            symbol?.toLocaleLowerCase()
          );

          return {
            indexToken: gmMarketToken.indexToken,
            longToken: gmMarketToken.longToken,
            shortToken: gmMarketToken.shortToken,
            marketToken: gmMarketToken.marketToken,
            decimals: gmMarketToken.marketDecimals,
            symbol,
            symbolName: '/USD',
            symbolPair: `${getNormalizedTokenSymbolGMX(GMX_SOLANA_TOKENS_RAW[gmMarketToken.longToken].symbol)}-${getNormalizedTokenSymbolGMX(GMX_SOLANA_TOKENS_RAW[gmMarketToken.shortToken].symbol)}`,
            poolType: 'GM',
            isRwa: isRwa || isMetalRwa,
            displaySymbol,
            ...item,
          };
        } else if (glvMarketToken) {
          const decimals = glvTokenMetadatas[marketToken]?.decimals;
          const glvToken = glvMarketToken.glvTokenAddress.toString();
          const symbolAnother = getGlvDisplayNameByTokenAddress(glvToken);

          return {
            indexToken: glvMarketToken.glvAddress.toString(),
            longToken: glvMarketToken.longTokenAddress.toString(),
            shortToken: glvMarketToken.shortTokenAddress.toString(),
            marketToken: glvMarketToken.glvTokenAddress.toString(),
            decimals,
            symbol: 'GLV',
            symbolAnother,
            symbolName: '',
            symbolPair: `${getNormalizedTokenSymbolGMX(GMX_SOLANA_TOKENS_RAW[glvMarketToken.longTokenAddress].symbol)}-${getNormalizedTokenSymbolGMX(GMX_SOLANA_TOKENS_RAW[glvMarketToken.shortTokenAddress].symbol)}`,
            poolType: 'GLV',
            isRwa: false,
            ...item,
          };
        }
      });
      return stakeHistoryListData.filter(Boolean);
    }
    return [];
  }, [
    stakeHistory,
    isStakeHistoryListLoading,
    marketInfosMap,
    glvs,
    glvTokenMetadatas,
  ]);

  // Claimed GT from Stake
  const stakeGtAccount = useMemo(() => {
    if (isGmw331Enabled) {
      return earnedTotals.stakeBN;
    }
    if (gtHistory?.length) {
      return gtHistory.reduce((acc, item) => {
        return item?.action === 'stake' ? acc.add(item?.amountBN) : acc;
      }, BN_ZERO);
    }
    return BN_ZERO;
  }, [isGmw331Enabled, earnedTotals.stakeBN, gtHistory]);

  const tabsData = useMemo(() => {
    const base = getBaseTabData();
    base[0].value = stakePositions?.length || 0;
    if (isGmw396Enabled) {
      // History tab keeps value for field consistency; badge is not rendered
      base[1].value = 0;
    } else {
      base[1].value = unStakePositionLists?.length || 0;
    }
    return base;
  }, [
    i18n._locale,
    stakePositions?.length,
    unStakePositionLists?.length,
    isGmw396Enabled,
  ]);

  useEffect(() => {
    if (!connected) {
      setSelectedPositions([]);
    }
  }, [connected]);

  const modalTitle = useMemo(() => {
    if (stakeType === 'Stake') return `${t`Stake`} GLV/GM`;
    if (stakeType === 'Unstake') return `${t`Unstake`} GLV/GM`;
    if (stakeType === 'Claim') return t`Claim GT`;
    return '';
  }, [stakeType]);

  const handleUnstakeClick = (position: StakePosition) => {
    setSelectedUnstakPositions(position);
    setIsShowCheckBox(false);
    setIsInputDisabled(false);
    setStakeType('Unstake');
    setIsVisible(true);
  };

  const handleClaimGtClick = (position: StakePosition) => {
    setSelectedClaimGtPositions(position);
    setIsShowCheckBox(false);
    setIsInputDisabled(true);
    setStakeType('Claim');
    setIsVisible(true);
  };

  const handleStakeRefresh = () => {
    setTimeout(() => {
      void refresh();
      void stakeHistoryRefresh();
    }, 1000);
    if (['Unstake', 'Claim'].includes(stakeType)) {
      stakeListRef?.current?.handleSelectAllPositionClick('all');
    }
  };

  const handleClaimGt = useMemo(() => {
    const isClaimGtDisabled = selectedPositions.every((c) =>
      c?.gtAmount?.lte(new BN(0))
    );
    return (
      !selectedPositions?.length ||
      !stakeGlobalStateData?.claimEnabled ||
      isClaimGtDisabled
    );
  }, [selectedPositions, stakeGlobalStateData?.claimEnabled]);

  return (
    <div className={`stake-content${isGmw307Enabled ? ' feature-gmw-307' : ''}`}>
      {/* {mobile && <div className="header-left"><GTHeader /></div>} */}
      <div className={`title ${mobile || isScreen1024 ? '' : '!pt-[0]'}`}>
        <p>
          <Trans>Stake</Trans>
        </p>
        <p>
          <Trans>Stake your GLV and GM tokens to earn GT rewards.</Trans>
        </p>
      </div>

      {/* content */}
      <div>
        <Overview
          isPositionsListLoading={isPositionsListLoading}
          stakeGloablState={stakeGlobalStateData as StakeGlobalState}
          walletBalance={walletBalance}
          stakeValue={stakeValue}
          unclaimedGTFromStake={unclaimedGTFromStake}
          stakeGtAccount={stakeGtAccount}
          onStake={() => {
            setIsShowCheckBox(true);
            setIsInputDisabled(false);
            setStakeType('Stake');
            setIsVisible(true);
          }}
          onBuy={() => {
            navigate(`/pools`);
          }}
        />
      </div>

      {/* list */}
      <div className="stake-list-box">
        <div className="header">
          <div className="tabs-box">
            {tabsData &&
              tabsData.map((item) => {
                return (
                  <div
                    key={item.key}
                    className={`item ${tabsActive === item.key ? 'active' : ''}`}
                    onClick={() => {
                      setTabsActive(item.key);
                      if (isGmw396Enabled && item.key === 'unstake') {
                        setHistoryPage(1);
                      }
                    }}
                  >
                    <p>{item.label}</p>
                    {(!isGmw396Enabled || item.key === 'stake') && (
                      <span>{item.value}</span>
                    )}
                  </div>
                );
              })}
          </div>
          {!isMobile && tabsActive === 'stake' && (
            <div className="tabs-btn">
              <Button
                variant="primary"
                type="button"
                disabled={handleClaimGt}
                className={`stake-action-button btn ${handleClaimGt ? 'disabled-button' : 'active-button'}`}
                onClick={() => {
                  const claimGtPositions = selectedPositions.filter((c) =>
                    c?.gtAmount?.gt(new BN(0))
                  );
                  setSelectedClaimGtPositions(claimGtPositions);
                  setIsShowCheckBox(false);
                  setIsInputDisabled(true);
                  setStakeType('Claim');
                  setIsVisible(true);
                }}
              >
                <Trans>Claim GT</Trans>
              </Button>
              <Button
                variant="primary"
                type="button"
                disabled={!selectedPositions?.length}
                className={`stake-action-button btn ${!selectedPositions?.length ? 'disabled-button' : 'active-button'}`}
                onClick={() => {
                  setSelectedUnstakPositions(selectedPositions);
                  setIsShowCheckBox(true);
                  setIsInputDisabled(false);
                  setStakeType('Unstake');
                  setIsVisible(true);
                }}
              >
                <Trans>Unstake {selectedPositions?.length} Positions</Trans>
              </Button>
            </div>
          )}
        </div>
        {isMobile && tabsActive === 'stake' && (
          <div className="mobile-claim">
            <div
              className={`mobile-select-icon${stakePositionLists.length === 0 ? ' no-positions' : ''}`}
            >
              <img
                className="icon cursor-pointer"
                onClick={() =>
                  stakeListRef?.current?.handleSelectAllPositionClick()
                }
                src={
                  selectedPositions?.some((item) => item?.select)
                    ? IconSelectedAll
                    : IconSelect
                }
              />
            </div>
            {tabsActive === 'stake' && (
              <div className="tabs-btn">
                <Button
                  variant="primary"
                  type="button"
                  disabled={handleClaimGt}
                  className={`stake-action-button btn ${handleClaimGt ? 'disabled-button' : 'active-button'}`}
                  onClick={() => {
                    const claimGtPositions = selectedPositions.filter((c) =>
                      c?.gtAmount?.gt(new BN(0))
                    );
                    setSelectedClaimGtPositions(claimGtPositions);
                    setIsShowCheckBox(false);
                    setIsInputDisabled(true);
                    setStakeType('Claim');
                    setIsVisible(true);
                  }}
                >
                  <Trans>Claim GT</Trans>
                </Button>
                <Button
                  variant="primary"
                  type="button"
                  disabled={!selectedPositions?.length}
                  className={`stake-action-button btn ${!selectedPositions?.length ? 'disabled-button' : 'active-button'}`}
                  onClick={() => {
                    setSelectedUnstakPositions(selectedPositions);
                    setIsShowCheckBox(true);
                    setIsInputDisabled(false);
                    setStakeType('Unstake');
                    setIsVisible(true);
                  }}
                >
                  <Trans>Unstake {selectedPositions?.length} Positions</Trans>
                </Button>
              </div>
            )}
          </div>
        )}
        <div style={{ display: tabsActive === 'stake' ? 'block' : 'none' }}>
          <StakeList
            ref={stakeListRef}
            isPositionsLoading={isPositionsListLoading}
            stakePositions={stakePositionLists}
            stakeGloablState={stakeGlobalStateData as StakeGlobalState}
            setSelectedPositions={setSelectedPositions}
            onUnstakeClick={handleUnstakeClick}
            onClaimGtClick={handleClaimGtClick}
          />
        </div>
        <div style={{ display: tabsActive === 'unstake' ? 'block' : 'none' }}>
          {isGmw396Enabled ? (
            <UnStakeList
              unStakePositions={unStakePositionLists}
              isStakeHistoryLoading={isStakeHistoryListLoading}
              page={historyPage}
              hasMore={hasMoreStakeHistory}
              onPageChange={setHistoryPage}
            />
          ) : (
            <UnStakeList
              unStakePositions={unStakePositionLists}
              isStakeHistoryLoading={isStakeHistoryListLoading}
            />
          )}
        </div>
        {/* {
          tabsActive === 'stake' ? 
          <StakeList
            isPositionsLoading={isPositionsLoading}
            stakePositions={stakePositionLists}
            stakeGloablState={stakeGlobalStateData as StakeGlobalState}
            setSelectedPositions={setSelectedPositions} 
            onUnstakeClick={handleUnstakeClick}
            onClaimGtClick={handleClaimGtClick}
          /> : <UnStakeList
            setSelectedPositions={setSelectedPositions} 
          />
        } */}
      </div>

      {isVisible && (
        <StakeGLVGM
          isVisible={isVisible}
          setIsVisible={setIsVisible}
          stakeType={stakeType}
          isShowCheckBox={isShowCheckBox}
          isInputDisabled={isInputDisabled}
          modalTitle={modalTitle}
          walletMarketToken={walletMarketToken}
          selectedPositions={selectedPositions}
          selectedClaimGtPositions={selectedClaimGtPositions}
          selectedUnstakPositions={selectedUnstakPositions}
          stakeGloablState={stakeGlobalStateData as StakeGlobalState}
          stakeQueryController={stakeQueryController}
          onStakeRefresh={handleStakeRefresh}
        />
      )}
    </div>
  );
}
