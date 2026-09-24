import { useState, useEffect } from 'react';
import { t } from '@lingui/macro';
import ExchangeButton from '../../../PositionList/components/compose-components/ExchangeButton/index';
import Title from '../../../PositionList/components/compose-components/title/index';
import InputItem from '../../../PositionList/components/compose-components/InputItem/index';
import DataPanel from '../../../PositionList/components/compose-components/DataPanel/index';
import { formatInput } from '@/components/TradeBoxNew/utils/formatInput';
import { OrderInfo } from '@/selectors/order/types';
import { USD_DECIMALS } from '@/config/constants';
import {
  formatAmount,
  formatParseUsdToBN,
  formatDivisionBase,
  formatAmountFree,
} from '@/utils/legacy/format';
import { GMX_SOLANA_TOKENS_RAW } from '@/config/program';
import { useAppStore } from '@/zustand/useAppStore';
import { BN } from '@coral-xyz/anchor';
import { helperToast } from '@/utils/lib/helperToast';
import { helperNotice } from '@/utils/lib/helperNotice';
import { removeNotice } from '@/utils/lib/helperNotice';

import { useStoreProgram } from '@/contexts/anchor';
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { getIconUrlPath } from '@/utils/lib/icon';
import { useUpdateOrderByLimitSwap } from '@/components/TradeBoxNew/utils/execOrder';
// import { getSimulateOrderByLimitSwap } from '@/components/TradeBoxNew/utils/getSimulateResult';
import {
  getRecentBlockhash,
  getRecentPrioritizationFeesFn,
} from '@/components/TradeBoxNew/utils/getRpcOrSdkParams';
import './index.scss';
import { getNormalizedTokenSymbolForFetchingPrice } from '@/utils/token/getNormalizedTokenSymbolForFetchingPrice';
import { useShallow } from 'zustand/react/shallow';
import { useComputeUnits } from '@/hooks/utilsHooks/useComputeUnits';
// import PercentageInput from '@/components/Common/Input/PercentageInput';
export interface SwapLimitProps {
  order: OrderInfo;
  isVisible: boolean;
  onClose: () => void;
}
import { useBodyScrollLock } from '@/hooks/utilsHooks/useBodyScrollLock';

export default function SwapLimit({
  order,
  isVisible,
  onClose,
}: SwapLimitProps) {
  if (!isVisible) {
    return <></>;
  }
  const {
    inSymbol,
    outSymbol,
    finalOutputTokenAddress,
    initialCollateralTokenAddress,
    minOutputAmount,
    initialCollateralDeltaAmount,
  } = order || {};
  const { signAllTransactions } = useWallet();
  const { slippage } = useAppStore(useShallow((state) => state.TradeboxNew));
  const { payerInfo } = useAppStore(
    useShallow((state) => state.payerSwapTokens)
  );
  const { tokenPriceMap } = useAppStore(
    useShallow((state) => state.tickersState)
  );
  const storeProgram = useStoreProgram();
  const [resultMaxStr, setResultMaxStr] = useState<
    string | number | undefined
  >();
  const [triggerTokenList, setTriggerTokenList] = useState([]);
  const [amount, setAmount] = useState<string | number | undefined>();
  const [outAmount, setOutAmount] = useState<string | number | undefined>();
  const [outAmountBN, setOutAmountBN] = useState<BN | undefined>();
  const [minReceive, setMinReceive] = useState('');
  const inTokenSymbol = getNormalizedTokenSymbolForFetchingPrice(inSymbol);
  const outTokenSymbol = getNormalizedTokenSymbolForFetchingPrice(outSymbol);
  const inTokenAddress = initialCollateralTokenAddress?.toString();
  const outTokenAddress = finalOutputTokenAddress?.toString();
  const inTokenDecimals = GMX_SOLANA_TOKENS_RAW[inTokenAddress]?.decimals;
  const outTokenDecimals = GMX_SOLANA_TOKENS_RAW[outTokenAddress]?.decimals;
  const initialCollateralTokenPrice = new BN(
    tokenPriceMap.get(inTokenAddress)?.price
  );
  const finalOutputTokenPrice = new BN(
    tokenPriceMap.get(outTokenAddress)?.price
  );
  const payAmount = formatAmount(
    initialCollateralDeltaAmount,
    inTokenDecimals,
    6
  );
  const [btnTitle, setBtnTitle] = useState<string>(
    t`Enter a new ratio or allowed slippage`
  );
  const [btnDisabled, setBtnDisabled] = useState<boolean>(null);
  const [isOk, setIsOk] = useState(false);
  const [isError, setIsError] = useState(false);
  const { computeUnitPrice } = useComputeUnits();
  const title = order?.isLong
    ? t`Edit Limit Swap ${inSymbol === 'WGMX' ? 'GMX' : inSymbol}/USD`
    : t`Edit TP: Short ${inSymbol === 'WGMX' ? 'GMX' : inSymbol}/USD`;
  const dataList = [
    {
      title: t`Min Receive`,
      content: (
        <>
          <span>
            {minReceive} {outSymbol === 'WGMX' ? 'GMX' : outSymbol}
          </span>
        </>
      ),
    },
  ];
  useEffect(() => {
    const inToken = {
      inTokenAmount: initialCollateralDeltaAmount,
      symbol: inTokenSymbol,
      triggerPrice: new BN(initialCollateralDeltaAmount).mul(
        new BN(10).pow(new BN(outTokenDecimals))
      ),
      decimals: inTokenDecimals,
      price: initialCollateralTokenPrice,
    };
    const outToken = {
      outTokenAmount: minOutputAmount,
      symbol: outTokenSymbol,
      triggerPrice: new BN(minOutputAmount).mul(
        new BN(10).pow(new BN(inTokenDecimals))
      ),
      decimals: outTokenDecimals,
      price: finalOutputTokenPrice,
    };

    const triggerTokenList = inToken?.triggerPrice?.gt(outToken?.triggerPrice)
      ? [inToken, outToken]
      : [outToken, inToken];
    setTriggerTokenList(triggerTokenList);

    if (triggerTokenList && triggerTokenList.length) {
      const valueMaxBN = formatParseUsdToBN('1', triggerTokenList[1].decimals);
      const payMaxPrice = valueMaxBN.mul(triggerTokenList[1]?.price);
      const receiveMaxPrice = payMaxPrice.div(triggerTokenList[0]?.price);
      const markPrice = formatAmount(
        receiveMaxPrice,
        triggerTokenList[1].decimals,
        3,
        true,
        false
      );
      console.log(
        'triggerTokenList[0]?.triggerPrice',
        triggerTokenList[0]?.triggerPrice.toString()
      );
      console.log(
        'triggerTokenList[1]?.triggerPrice',
        triggerTokenList[1]?.triggerPrice.toString()
      );
      console.log(
        'triggerTokenList[1]?.decimals',
        triggerTokenList[1]?.decimals
      );
      const triggerPrice = formatDivisionBase(
        triggerTokenList[0]?.triggerPrice,
        triggerTokenList[1]?.triggerPrice
      );
      // const triggerPrice = formatAmountFree(triggerTokenList[0]?.triggerPrice, USD_DECIMALS - outTokenDecimals);
      setAmount(triggerPrice || '0');
      setResultMaxStr(markPrice || '0');
    }
    setOutAmount(formatAmount(new BN(minOutputAmount), outToken.decimals, 6));
  }, []);

  useEffect(() => {
    handleLimitChange(amount);
  }, [amount]);

  const handleLimitChange = (value: string) => {
    if (!amount || amount === '0') {
      setMinReceive('0.0000');
      return;
    }
    if (!value) {
      setOutAmount(formatAmount(new BN(minOutputAmount), outTokenDecimals, 6));
      return;
    }

    const PRECISION = new BN(10).pow(new BN(20));
    const mulBN = (a: BN, b: BN, decimals: BN): BN => {
      return a.mul(b).div(decimals);
    };

    const divBN = (a: BN, b: BN, decimals: BN): BN => {
      return a.mul(decimals).div(b);
    };

    const toDecimal = (
      bn: BN,
      decimals: number,
      displayDecimals: number = decimals
    ): string => {
      const s = bn.toString().padStart(decimals + 1, '0');
      const intPart = s.slice(0, -decimals) || '0';
      let fracPart = s.slice(-decimals);
      if (displayDecimals < decimals) {
        fracPart = fracPart.slice(0, displayDecimals);
      }
      fracPart = fracPart.replace(/0+$/, '');
      return fracPart ? `${intPart}.${fracPart}` : intPart;
    };
    const payBN = mulBN(
      formatParseUsdToBN(payAmount, 14),
      PRECISION,
      PRECISION
    );
    const limtBN = mulBN(formatParseUsdToBN(value, 14), PRECISION, PRECISION);
    const receiveBN = divBN(payBN, limtBN, PRECISION);
    const receiveAmount = receiveBN.div(
      new BN(10).pow(
        new BN(20 - GMX_SOLANA_TOKENS_RAW[outTokenAddress]?.decimals)
      )
    );
    const minReceive = receiveAmount
      .mul(new BN(10000).sub(new BN(slippage)))
      .div(new BN(10000));
    const minReceiveStr = formatAmount(minReceive, outTokenDecimals, 4);
    setMinReceive(minReceiveStr);
    setOutAmountBN(receiveAmount);
    const receiveAmountStr = toDecimal(receiveBN, 20, outTokenDecimals);
    // receive amout
    setOutAmount(receiveAmountStr);
  };

  // useEffect(() => {
  //     const simulateOrder = async () => {
  //         if (!order || !amount || amount.trim() === '') {
  //             return;
  //         }

  //         try {
  //             const marketInfo = order.marketInfo;
  //             const payTokenNum = order.initialCollateralDeltaAmount;
  //             const payTokenValue = payTokenNum.mul(initialCollateralTokenUnitPrice);
  //             const outToken = order.finalOutputTokenAddress.toBase58()
  //             const simResult = await getSimulateOrderByLimitSwap(payTokenValue, priorityFees, {
  //                 payToken: order.initialCollateralTokenAddress.toBase58(),
  //                 collateralToken,
  //                 outToken: outToken,
  //                 marketInfo,
  //                 minOutputAmount: outAmountBN,
  //                 payTokenNum: order.initialCollateralDeltaAmount,
  //                 graphObj,
  //                 tradeMoney: order.initialCollateralDeltaAmount,
  //                 marketDirection: order.isLong,
  //             });
  //             if (!simResult) {
  //                 return;
  //             }
  //             const { swapReports } = simResult;
  //             const token_out_amount = swapReports[swapReports.length - 1].swapData?.result?.token_out_amount
  //             console.log('token_out_amount', token_out_amount?.toString());

  //         } catch (error) {
  //             console.error('error:', error);
  //         }
  //     };

  //     simulateOrder();
  // }, [order, amount]);
  useBodyScrollLock(true);

  return (
    <div className="swap-limit">
      <div className="market-decrease-overlay" onClick={onClose} />

      <div className="market-decrease-modal edit-collateral">
        <Title title={title} onClose={onClose} />
        <div
          className="market-decrease-content"
          style={{ paddingBottom: '3rem' }}
        >
          <InputItem
            title={t`Limit Price`}
            value={amount as string}
            unit={
              <div className="change-unit">
                <img
                  src={getIconUrlPath(triggerTokenList[0]?.symbol, 24)}
                  alt=""
                  width={20}
                />
                <span>{triggerTokenList[0]?.symbol}</span>
                <span>per</span>
                <img
                  src={getIconUrlPath(triggerTokenList[1]?.symbol, 24)}
                  alt=""
                  width={20}
                />
                <span>{triggerTokenList[1]?.symbol}</span>
              </div>
            }
            mark={resultMaxStr as string}
            onChange={(value) => {
              setAmount(value);
              const valueBn = formatInput(
                value,
                USD_DECIMALS - inTokenDecimals
              );
              console.log('valueBn', valueBn.toString());
              const markPrice = new BN(order?.marketInfo?.unitPrice);
              console.log('markPrice', markPrice.toString());
              if (!value) {
                setBtnDisabled(true);
                setBtnTitle(t`Enter a new ratio or allowed slippage`);
              }
              if (valueBn.lt(markPrice)) {
                setBtnDisabled(true);
                setBtnTitle(t`Price below Mark Price`);
              } else {
                setBtnDisabled(false);
                setBtnTitle(t`Update Trigger Order`);
              }
              handleLimitChange(value);
            }}
          />
        </div>

        <ExchangeButton
          title={t`${btnTitle}`}
          btnDisabled={btnDisabled}
          handleSubmit={async (graph) => {
            const noticeId = helperNotice.info(t`Updating limit swap order...`);
            const connection = storeProgram.provider.connection;
            // const PrioritizationFees = await getRecentPrioritizationFeesFn(connection)
            const PrioritizationFees = computeUnitPrice;
            const blockhash = await getRecentBlockhash(connection);
            const payer = new PublicKey(payerInfo.address).toBase58();

            const params = {
              blockhash,
              payer,
              market_token: order?.marketTokenAddress.toBase58(),
              PrioritizationFees,
              min_output: outAmountBN,
              order_addr: order?.orderAddress.toBase58(),
              signAllTransactions,
              storeProgram,
            };
            try {
              const result = await useUpdateOrderByLimitSwap(params);
              if (result.length) {
                if (noticeId) {
                  removeNotice(noticeId);
                }
                helperNotice.success(t`Limit swap order updated.`);
                setIsOk(true);
                setTimeout(() => {
                  onClose();
                }, 2000);
              }
            } catch (error) {
              setIsError(true);
              if (noticeId) {
                removeNotice(noticeId);
              }
              helperNotice.error(t`Failed to update limit swap order.`, {
                tradingErrorInfo: { actionName: 'Update Swap Order', errorData: error },
              });
              setIsOk(false);
            }
          }}
          isOk={isOk}
          isError={isError}
        />
        <DataPanel dataList={dataList} />
      </div>
    </div>
  );
}
