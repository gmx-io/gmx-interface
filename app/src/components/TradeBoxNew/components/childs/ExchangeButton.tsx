import { memo, useState, useEffect, useMemo } from 'react';
import { usePayer } from '@/components/TradeBoxNew/Hooks/usePayer';
import { useAppStore } from '@/zustand/useAppStore';
import Button from '@/components/Common/Button/Button';
import {
  useCreateOrderParamsByMarketIncrease,
  useCreateOrderParamsByLimitIncrease,
  useCreateOrderParamsByMarketSwap,
  useCreateOrderParamsByLimitSwap,
  useCreateOrderParamsByMarketTpsl,
  useCreateOrderParamsByLimitTpsl,
  isExecOrderSuccess,
  getIncreaseTpslPendingMessage,
  getExecOrderResultMessage,
} from '@/components/TradeBoxNew/utils/execOrder';
import type { ExecOrderResult } from '@/components/TradeBoxNew/utils/execOrder';
import { getExecOrderErrorInfo } from '@/components/TradeBoxNew/utils/execOrder';
import { getGmw351Enabled, getGmw399Enabled } from '@/config/featureFlagEnable';
import { helperNotice, removeNotice } from '@/utils/lib/helperNotice';
import { t, Trans } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import { BN } from '@coral-xyz/anchor';
import '@material/web/progress/circular-progress.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { useStoreProgram } from '@/contexts/anchor';
import { PublicKey, Transaction } from '@solana/web3.js';
import { getRecentBlockhash } from '@/components/TradeBoxNew/utils/getRpcOrSdkParams';
import { useShallow } from 'zustand/react/shallow';
import { selectSkipPreflight } from '@/selectors/setting/baseSelectors';
import { usePriorityFees } from '@/components/TradeBoxNew/Hooks/usePriorityFees';
import { useComputeUnits } from '@/hooks/utilsHooks/useComputeUnits';
import usePositionSocketStore from '@/zustand/positionSocketStore';
import {
  wrapSol,
  unwrapSol,
  needsWrapBeforeSwap,
  needsUnwrapAfterSwap,
} from '@/components/TradeBoxNew/utils/wraporUnwrap';
import {
  useTriggerUnwrapToken,
  useTriggerWrapToken,
} from '@/hooks/triggerHooks';
import { isRestrictedArea } from '@/components/Pools/utils/getApyData';
import { applySlippageToPrice } from '@/utils/tradebox/applySlippageToPrice';

const loadingSpinnerIcon = (
  <svg
    className="h-18 w-18 -ml-1 mr-10 animate-spin text-white"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
  </svg>
);

function ExchangeButton() {
  usePriorityFees();
  const { i18n } = useLingui();
  const { connected, address, balance, openConnectWalletModal } = usePayer();
  const skipPreflight = useAppStore(selectSkipPreflight);
  const {
    payTokenNum,
    btnMessage,
    btnDisabled,
    setPayTokenNum,
    setTradeMoney,
    setSizeNumber,
    setScale,
    slippage,
    marketDirection,
    graphObj,
    tradeMoney,
    marketType,
    limitPrice,
    simulationData,
    setLimitPrice,
    setBtnDisabled,
    setBtnMessage,
    setSimulationData,
    isForbiddenTrade,
  } = useAppStore(useShallow((state) => state.TradeboxNew));
  const {
    setSelectSwapReceiveToken,
    selectSwapPayToken,
    selectSwapReceiveToken,
    setSwapFinished,
  } = useAppStore(useShallow((state) => state.swap));
  const { collateralToken } = useAppStore(
    useShallow((state) => state.collateralTokens)
  );
  const { markets, marketInfo } = useAppStore(
    useShallow((state) => state.markets)
  );
  const { setPayerInfo, payerSwapTokenInfo, payerInfo } = useAppStore(
    useShallow((state) => state.payerSwapTokens)
  );
  const { indexToken } = useAppStore(useShallow((state) => state.indexTokens));
  const { setTpPrice, setSlPrice, tpPrice, slPrice, enableTpsl, setTpsl } =
    useAppStore(useShallow((state) => state.tpSlTokens));
  const { trigger: wrapToken } = useTriggerWrapToken();
  const { trigger: unwrapToken } = useTriggerUnwrapToken();
  const { tokenPriceMap } = useAppStore(
    useShallow((state) => state.tickersState)
  );
  const currentPrice = useMemo(
    () => tokenPriceMap.get(indexToken)?.unitPrice,
    [tokenPriceMap, indexToken]
  );

  const { signAllTransactions } = useWallet();
  const { computeUnitPrice } = useComputeUnits();
  const setIsRefreshPositionAndOrder = usePositionSocketStore(
    (state) => state.setIsRefreshPositionAndOrder
  );
  const storeProgram = useStoreProgram();
  const [isLoading, setIsLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [signature, setSignature] = useState<string>('');
  const [graph, setGraph] = useState<any>(null);
  const [swapPayAmount, setSwapPayAmount] = useState<BN>(new BN(0));
  const isUs = isRestrictedArea();

  const handleSolWsolConversion = async (
    fromTokenAddress: string,
    toTokenAddress: string,
    amount: BN
  ): Promise<Transaction[]> => {
    if (!connected || !address || amount.isZero()) {
      console.log(
        'Skipping conversion: not connected, no address, or zero amount'
      );
      return [];
    }

    const transactions: Transaction[] = [];
    const connection = storeProgram.provider.connection;
    const ownerPublicKey = new PublicKey(address);

    console.log('SOL/WSOL conversion parameters:', {
      fromToken: fromTokenAddress,
      toToken: toTokenAddress,
      amount: amount.toString(),
      owner: ownerPublicKey.toBase58(),
    });

    if (needsWrapBeforeSwap(new PublicKey(fromTokenAddress))) {
      try {
        console.log('Wrapping SOL to WSOL');
        const wrapTransaction = await wrapSol(
          connection,
          ownerPublicKey,
          amount
        );

        // Ensure feePayer is set
        wrapTransaction.feePayer = ownerPublicKey;

        transactions.push(wrapTransaction);
        console.log('Wrap transaction created successfully');
      } catch (error) {
        console.error('Error creating wrap transaction:', error);
        helperNotice.error(<Trans>Failed to create SOL wrap order.</Trans>, {
          tradingErrorInfo: { actionName: 'Wrap SOL', errorData: error },
        });
      }
    }
    if (
      needsUnwrapAfterSwap(
        new PublicKey(fromTokenAddress),
        new PublicKey(toTokenAddress)
      )
    ) {
      try {
        console.log('Unwrapping WSOL to SOL');
        const unwrapTransaction = await unwrapSol(connection, ownerPublicKey);

        // Ensure feePayer is set
        unwrapTransaction.feePayer = ownerPublicKey;

        transactions.push(unwrapTransaction);
        console.log('Unwrap transaction created successfully');
      } catch (error) {
        console.error('Error creating unwrap transaction:', error);
        helperNotice.error(<Trans>Failed to create SOL unwrap order.</Trans>, {
          tradingErrorInfo: { actionName: 'Unwrap SOL', errorData: error },
        });
      }
    }

    console.log('Created transactions:', transactions.length);
    return transactions;
  };

  useEffect(() => {
    if (!btnMessage || btnMessage === 'Enter an amount') {
      setBtnMessage('');
    } else {
      setBtnMessage('');
    }
  }, [i18n.locale]);
  const isActiveTrade =
    marketDirection === 'Long' ||
    marketDirection === 'Short' ||
    marketDirection === 'Swap';
  useEffect(() => {
    if (connected) {
      setPayerInfo({
        connected,
        address,
        balance,
      });
      setBtnDisabled(true);
    } else {
      setPayerInfo({
        connected: false,
        address: null,
        balance: null,
      });
      setPayTokenNum(new BN(0));
      setSizeNumber(null);
      setScale(null);
      setTpPrice(null);
      setSlPrice(null);
      setTradeMoney(new BN(0));
      setLimitPrice(null);
      setTpsl({
        tpGainMoney: '',
        slLossMoney: '',
        tpGainRate: '',
        slLossRate: '',
      });
      setSimulationData({});
      setBtnDisabled(false);
    }
  }, [connected]);

  useEffect(() => {
    if (graphObj) {
      setGraph(graphObj);
    }
  }, [graphObj]);

  const submitData = async () => {
    if (!connected) {
      openConnectWalletModal();
      return;
    }
    setIsVisible(true);
    setIsLoading(true);
    let noticeId: number = 0;
    if (marketDirection === 'Swap') {
      switch (marketType) {
        case 'Market':
          if (
            selectSwapPayToken?.tokenAddress ===
            'So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH' &&
            selectSwapReceiveToken?.tokenAddress ===
            'So11111111111111111111111111111111111111112'
          ) {
            noticeId = helperNotice.info(<Trans>Creating SOL wrap order...</Trans>);
          } else if (
            selectSwapPayToken?.tokenAddress ===
            'So11111111111111111111111111111111111111112' &&
            selectSwapReceiveToken?.tokenAddress ===
            'So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH'
          ) {
            noticeId = helperNotice.info(<Trans>Creating SOL unwrap order...</Trans>);
          } else if (
            selectSwapPayToken?.tokenAddress ===
            'pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn' &&
            selectSwapReceiveToken?.tokenAddress ===
            'HTHR6CbWSqrVCB83onNwKKH1W3qpGoKbpqvs9sgK7PEC'
          ) {
            // noticeId = helperNotice.info(<></>);
          } else if (
            selectSwapPayToken?.tokenAddress ===
            'HTHR6CbWSqrVCB83onNwKKH1W3qpGoKbpqvs9sgK7PEC' &&
            selectSwapReceiveToken?.tokenAddress ===
            'pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn'
          ) {
            // noticeId = helperNotice.info(<></>);
          } else {
            noticeId = helperNotice.info(
              <Trans>Creating market swap order...</Trans>
            );
          }
          break;
        case 'Limit':
          noticeId = helperNotice.info(
            <Trans>Creating limit swap order...</Trans>
          );
          break;
      }
    } else {
      const hasTp = Boolean(enableTpsl && tpPrice);
      const hasSl = Boolean(enableTpsl && slPrice);
      if (getGmw351Enabled() && enableTpsl && (hasTp || hasSl)) {
        noticeId = helperNotice.info(
          getIncreaseTpslPendingMessage(
            marketType === 'Limit' ? 'Limit' : 'Market',
            hasTp,
            hasSl
          )
        );
      } else {
        switch (marketType) {
          case 'Market':
            noticeId = helperNotice.info(
              <Trans>Creating market increase order...</Trans>
            );
            break;
          case 'Limit':
            noticeId = helperNotice.info(
              <Trans>Creating limit increase order...</Trans>
            );
            break;
        }
      }
    }
    // params
    let hints = new Map();
    let path: string[] = [];
    let pay_token = '';
    let collateral_or_swap_out_token = collateralToken;
    const connection = storeProgram.provider.connection;
    const blockhash = await getRecentBlockhash(connection);
    const payer = new PublicKey(payerInfo.address).toBase58();
    const skip_wrap_native_on_pay = payerSwapTokenInfo?.tokenName === 'WSOL';
    const skip_unwrap_native_on_receive =
      selectSwapReceiveToken?.tokenName === 'WSOL';
    // const PrioritizationFees = await getRecentPrioritizationFeesFn(connection);
    const PrioritizationFees = computeUnitPrice;
    const isSwap = !(marketDirection === 'Long' || marketDirection === 'Short');
    if (!isSwap) {
      if (
        !tradeMoney ||
        tradeMoney.lte(new BN(0)) ||
        !payTokenNum ||
        payTokenNum.lte(new BN(0))
      ) {
        if (noticeId) {
          removeNotice(noticeId);
        }
        helperNotice.error(t`Enter an amount`);
        setIsLoading(false);
        setIsVisible(false);
        return;
      }

      if (
        marketType === 'Limit' &&
        (!limitPrice || limitPrice.lte(new BN(0)))
      ) {
        if (noticeId) {
          removeNotice(noticeId);
        }
        helperNotice.error(t`Enter a price`);
        setIsLoading(false);
        setIsVisible(false);
        return;
      }
    }
    if (!graph) {
      if (noticeId) {
        removeNotice(noticeId);
      }
      setIsLoading(false);
      setIsVisible(false);
      return null;
    }
    graph.update_value(BigInt(tradeMoney?.toString()));
    graph.update_base_cost(BigInt(1000000000000000000000));
    if (!isSwap) {
      // long or short order
      // let swapPathObj;
      pay_token =
        payerSwapTokenInfo.tokenAddress ===
          'So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH'
          ? 'So11111111111111111111111111111111111111112'
          : payerSwapTokenInfo.tokenAddress || '';
      // if (enableTpsl) {
      //   swapPathObj = await getBestSwapPath(
      //     graph,
      //     collateral_or_swap_out_token,
      //     pay_token,
      //   );
      // } else {
      //   swapPathObj = await getBestSwapPath(
      //     graph,
      //     pay_token,
      //     collateral_or_swap_out_token,
      //   );
      // }
      // console.log('swapPathObj11', swapPathObj)
      // path = swapPathObj.path;
      path = simulationData?.path;
      hints = new Map([
        [
          new PublicKey(marketInfo?.marketToken).toBase58(),
          {
            long_token: new PublicKey(marketInfo?.longToken).toBase58(),
            short_token: new PublicKey(marketInfo?.shortToken).toBase58(),
          },
        ],
      ]);
    } else {
      // swap order
      pay_token =
        selectSwapPayToken?.tokenAddress ===
          'So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH'
          ? 'So11111111111111111111111111111111111111112'
          : selectSwapPayToken?.tokenAddress || '';
      collateral_or_swap_out_token =
        selectSwapReceiveToken?.tokenAddress ===
          'So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH'
          ? 'So11111111111111111111111111111111111111112'
          : selectSwapReceiveToken.tokenAddress || '';
      path = simulationData?.path;
      if (path?.length) {
        const swapMarketInfo = path.map((i) =>
          markets.find((item) => item.marketToken === i)
        );
        if (!swapMarketInfo) {
          return;
        }
        hints = new Map([
          ...swapMarketInfo.map((item) => [
            new PublicKey(item?.marketToken).toBase58(),
            {
              long_token: new PublicKey(item?.longToken).toBase58(),
              short_token: new PublicKey(item?.shortToken).toBase58(),
            },
          ]),
        ]);
      }
    }
    const transaction_group = {};
    if (marketDirection === 'Long' || marketDirection === 'Short') {
      if (!currentPrice || Number(currentPrice) <= 0) {
        helperNotice.error(
          <Trans>Price data unavailable. Please wait and try again.</Trans>
        );
        setIsLoading(false);
        return;
      }
    }
    let acceptable_price = new BN(0);
    const isLong = marketDirection === 'Long';
    if (!isSwap) {
      const baseAcceptablePrice =
        marketType === 'Limit' ? limitPrice : new BN(currentPrice || 0);
      if (!baseAcceptablePrice || baseAcceptablePrice.lte(new BN(0))) {
        if (noticeId) {
          removeNotice(noticeId);
        }
        helperNotice.error(t`Failed to create order.`);
        setIsLoading(false);
        return;
      }
      acceptable_price = applySlippageToPrice(
        slippage,
        baseAcceptablePrice,
        true,
        isLong
      );
    }
    const params = {
      marketInfo,
      skip_wrap_native_on_pay,
      skip_unwrap_native_on_receive,
      marketDirection,
      tradeMoney,
      payTokenNum,
      payer,
      blockhash,
      PrioritizationFees,
      connection,
      transaction_group,
      pay_token,
      collateral_or_swap_out_token,
      hints,
      path,
      signAllTransactions,
      storeProgram,
      tpPrice,
      slPrice,
      limitPrice,
      selectSwapPayToken,
      selectSwapReceiveToken,
      acceptable_price,
      slippage,
    };

    let iswraporUnwrapFlag = false;
    try {
      let solWsolTransactions: Transaction[] = [];
      let result;
      if (marketDirection === 'Long' || marketDirection === 'Short') {
        if (enableTpsl) {
          if (marketType === 'Market') {
            result = await useCreateOrderParamsByMarketTpsl(params);
          }
          if (marketType === 'Limit') {
            result = await useCreateOrderParamsByLimitTpsl(params);
          }
          if (getGmw351Enabled()) {
            if (result) {
              if (noticeId) {
                removeNotice(noticeId);
              }
              const execResult = result as ExecOrderResult;
              const toast = getExecOrderResultMessage(
                execResult.intended,
                execResult
              );
              if (toast) {
                if (toast.type === 'success') {
                  helperNotice.success(toast.message);
                  setIsRefreshPositionAndOrder(true);
                  if (execResult.signatures[0]) {
                    setSignature(execResult.signatures[0]);
                  }
                } else {
                  helperNotice.error(toast.message, {
                    tradingErrorInfo: getExecOrderErrorInfo(execResult, 'Open Position with TP/SL', collateral_or_swap_out_token),
                  });
                  if (
                    execResult.succeeded.some(
                      (k) => k === 'MarketIncrease' || k === 'LimitIncrease'
                    )
                  ) {
                    setIsRefreshPositionAndOrder(true);
                    if (execResult.signatures[0]) {
                      setSignature(execResult.signatures[0]);
                    }
                  }
                }
              } else if (isExecOrderSuccess(execResult)) {
                helperNotice.success(
                  marketType === 'Limit' ? (
                    <Trans>Limit increase order created.</Trans>
                  ) : (
                    <Trans>Market increase order created.</Trans>
                  )
                );
                setIsRefreshPositionAndOrder(true);
                if (execResult.signatures[0]) {
                  setSignature(execResult.signatures[0]);
                }
              } else {
                helperNotice.error(<Trans>Failed to create order.</Trans>, {
                  tradingErrorInfo: getExecOrderErrorInfo(execResult, 'Open Position with TP/SL', collateral_or_swap_out_token),
                });
              }
            }
          } else if (result && (result as string[]).length) {
            if (noticeId) {
              removeNotice(noticeId);
            }
            if (marketType === 'Market') {
              helperNotice.success(<Trans>Market increase order with TP&SL order created.</Trans>);
            } else {
              helperNotice.success(<Trans>Limit increase order with TP&SL order created.</Trans>);
            }
          }
          return;
        }
        if (marketType === 'Market') {
          result = await useCreateOrderParamsByMarketIncrease(params);
        }
        if (marketType === 'Limit') {
          result = await useCreateOrderParamsByLimitIncrease(params);
        }
      }

      if (marketDirection === 'Swap') {
        setSwapPayAmount(selectSwapPayToken?.payAmount);
        setSwapFinished(true);
        if (marketType === 'Market') {
          const iswraporUnwrap =
            (selectSwapPayToken?.tokenAddress ===
              'So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH' &&
              selectSwapReceiveToken?.tokenAddress ===
              'So11111111111111111111111111111111111111112') ||
            (selectSwapPayToken?.tokenAddress ===
              'So11111111111111111111111111111111111111112' &&
              selectSwapReceiveToken?.tokenAddress ===
              'So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH');
          const isPumpWraporUnwrap =
            selectSwapPayToken?.tokenAddress ===
            'pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn' &&
            selectSwapReceiveToken?.tokenAddress ===
            'HTHR6CbWSqrVCB83onNwKKH1W3qpGoKbpqvs9sgK7PEC';
          const isWpumpUnwrap =
            selectSwapPayToken?.tokenAddress ===
            'HTHR6CbWSqrVCB83onNwKKH1W3qpGoKbpqvs9sgK7PEC' &&
            selectSwapReceiveToken?.tokenAddress ===
            'pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn';
          if (iswraporUnwrap) {
            iswraporUnwrapFlag = true;
            const fromTokenAddress = selectSwapPayToken.tokenAddress;
            const toTokenAddress = selectSwapReceiveToken.tokenAddress;
            const amount = selectSwapPayToken.payAmount || new BN(0);

            try {
              const blockhash = await getRecentBlockhash(
                storeProgram.provider.connection
              );
              solWsolTransactions = await handleSolWsolConversion(
                fromTokenAddress,
                toTokenAddress,
                amount
              );
              if (solWsolTransactions.length > 0 && address) {
                const ownerPublicKey = new PublicKey(address);
                for (const tx of solWsolTransactions) {
                  tx.feePayer = ownerPublicKey;
                  tx.recentBlockhash = blockhash;
                }
                const signedTransactions =
                  await signAllTransactions(solWsolTransactions);
                for (const signedTx of signedTransactions) {
                  const txid =
                    await storeProgram.provider.connection.sendRawTransaction(
                      signedTx.serialize()
                    );
                  setSignature(txid);
                }
                setPaymentStatus(true);
                if (noticeId) {
                  removeNotice(noticeId);
                }

                if (
                  selectSwapPayToken?.tokenAddress ===
                  'So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH' &&
                  selectSwapReceiveToken?.tokenAddress ===
                  'So11111111111111111111111111111111111111112'
                ) {
                  noticeId = helperNotice.success(
                    <Trans>SOL wrap order created.</Trans>
                  );
                } else if (
                  selectSwapPayToken?.tokenAddress ===
                  'So11111111111111111111111111111111111111112' &&
                  selectSwapReceiveToken?.tokenAddress ===
                  'So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH'
                ) {
                  noticeId = helperNotice.success(
                    <Trans>SOL unwrap order created.</Trans>
                  );
                }
              }
            } catch (error) {
              iswraporUnwrapFlag = true;
              setPaymentStatus(false);
              setIsLoading(false);
              if (noticeId) {
                removeNotice(noticeId);
              }
              helperNotice.error(<Trans>Failed to create order.</Trans>, {
                tradingErrorInfo: { actionName: 'Wrap/Unwrap SOL', errorData: error },
              });
            }
            return;
          }

          if (isPumpWraporUnwrap || isWpumpUnwrap) {
            iswraporUnwrapFlag = true;
            const amount = selectSwapPayToken.payAmount || new BN(0);
            try {
              if (isPumpWraporUnwrap && wrapToken) {
                await wrapToken({
                  amount,
                  unwrappedTokenAddress: new PublicKey(
                    selectSwapPayToken.tokenAddress
                  ),
                  skipPreflight,
                });
              }
              if (isWpumpUnwrap && unwrapToken) {
                console.log('unwrapToken', {
                  amount: amount?.toString(),
                  unwrappedTokenAddress: selectSwapReceiveToken.tokenAddress,
                  skipPreflight,
                });
                await unwrapToken({
                  amount,
                  unwrappedTokenAddress: new PublicKey(
                    selectSwapReceiveToken.tokenAddress
                  ),
                  skipPreflight,
                });
              }
            } catch (error) {
              iswraporUnwrapFlag = true;
              setPaymentStatus(false);
              setIsLoading(false);
              if (noticeId) {
                removeNotice(noticeId);
              }
            }
            return;
          }

          result = await useCreateOrderParamsByMarketSwap(params);
        }
        if (marketType === 'Limit') {
          result = await useCreateOrderParamsByLimitSwap(params);
        }
      }
      if (getGmw351Enabled()) {
        const execResult = result as ExecOrderResult | undefined;
        if (execResult && isExecOrderSuccess(execResult)) {
          if (marketDirection === 'Long' || marketDirection === 'Short') {
            setIsRefreshPositionAndOrder(true);
          }
          if (noticeId) {
            removeNotice(noticeId);
          }
          if (marketDirection === 'Swap') {
            switch (marketType) {
              case 'Market':
                helperNotice.success(<Trans>Market swap order created.</Trans>);
                break;
              case 'Limit':
                helperNotice.success(<Trans>Limit swap order created.</Trans>);
                break;
            }
          } else {
            switch (marketType) {
              case 'Market':
                helperNotice.success(
                  <Trans>Market increase order created.</Trans>
                );
                break;
              case 'Limit':
                helperNotice.success(
                  <Trans>Limit increase order created.</Trans>
                );
                break;
            }
          }
          setSignature(execResult.signatures[0]);
        } else if (execResult && !isExecOrderSuccess(execResult)) {
          if (noticeId) {
            removeNotice(noticeId);
          }
          helperNotice.error(<Trans>Failed to create order.</Trans>, {
            tradingErrorInfo: getExecOrderErrorInfo(execResult, isSwap ? 'Swap' : 'Open Position', collateral_or_swap_out_token),
          });
        }
      } else if (result && (result as string[]).length) {
        if (marketDirection === 'Long' || marketDirection === 'Short') {
          setIsRefreshPositionAndOrder(true);
        }
        if (noticeId) {
          removeNotice(noticeId);
        }
        if (marketDirection === 'Swap') {
          switch (marketType) {
            case 'Market':
              helperNotice.success(<Trans>Market swap order created.</Trans>);
              break;
            case 'Limit':
              helperNotice.success(<Trans>Limit swap order created.</Trans>);
              break;
          }
        } else {
          switch (marketType) {
            case 'Market':
              helperNotice.success(
                <Trans>Market increase order created.</Trans>
              );
              break;
            case 'Limit':
              helperNotice.success(
                <Trans>Limit increase order created.</Trans>
              );
              break;
          }
        }
        setSignature((result as string[])[0]);
      }
    } catch (error) {
      if (noticeId) {
        removeNotice(noticeId);
      }
      helperNotice.error(<Trans>Failed to create order.</Trans>, {
        tradingErrorInfo: {
          actionName: isSwap ? 'Swap' : 'Open Position',
          collateral: collateral_or_swap_out_token,
          errorData: error,
        },
      });
      setIsLoading(false);
      setIsVisible(false);
      setSignature('');
      setPaymentStatus(false);
    } finally {
      if (!iswraporUnwrapFlag) {
        setPaymentStatus(true);
      }
      setTimeout(() => {
        const isPositionTrade = marketDirection === 'Long' || marketDirection === 'Short';
        setBtnDisabled(!isPositionTrade);
        if (!isPositionTrade) setBtnMessage('Enter an amount');
        setIsLoading(false);
        setIsVisible(false);
        setSignature('');
        setPaymentStatus(false);
        if (!isPositionTrade) {
          setPayTokenNum(getGmw399Enabled() ? new BN(0) : null);
          setTradeMoney(new BN(0));
          setSizeNumber(getGmw399Enabled() ? new BN(0) : null);
          setScale(new BN(0));
        }
        setTpPrice(null);
        setSlPrice(null);
        setLimitPrice(null);
        const nullSwapReceiveToken = {
          ...selectSwapReceiveToken,
        };
        nullSwapReceiveToken.receiveAmount = new BN(0);
        setSelectSwapReceiveToken(nullSwapReceiveToken);
        setTpsl({
          tpGainMoney: '',
          slLossMoney: '',
          tpGainRate: '',
          slLossRate: '',
        });
        setSimulationData({});
      }, 2000);
    }
  };

  const handleModalClose = () => {
    setIsVisible(false);
    setPaymentStatus(false);
  };
  const buttonContent = (
    <>
      <div className="tradeBox-exchangeForm-buttonDiv">
        <Button
          qa="confirm-trade-button"
          variant="primary-action"
          className={`tradeBox-exchangeForm-button w-full [text-decoration:inherit] ${isActiveTrade ? 'active-trade' : ''}`}
          type="submit"
          onClick={submitData}
          // disabled={btnDisabled}
          disabled={
            isUs ? true : btnDisabled === null ? true : btnDisabled || isLoading
          }
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              {loadingSpinnerIcon}
              <Trans>Loading..</Trans>
            </div>
          ) : (
            <div>
              {!connected ? (
                <Trans>Connect Wallet</Trans>
              ) : isUs ? (
                <Trans>Access Restricted</Trans>
              ) : isForbiddenTrade ? (
                <Trans>Market Is Not Open</Trans>
              ) : btnMessage ? (
                btnMessage
              ) : (
                <Trans>Enter an amount</Trans>
              )}
            </div>
          )}
        </Button>
      </div>
    </>
  );
  return buttonContent;
}

export default memo(ExchangeButton as React.FC);
