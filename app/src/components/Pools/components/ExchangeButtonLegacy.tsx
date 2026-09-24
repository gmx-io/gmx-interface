import { memo, useState } from 'react';
import { usePayer } from '@/components/TradeBoxNew/Hooks/usePayer';
import Button from '@/components/Common/Button/Button';
import { Trans } from '@lingui/macro';
import '@material/web/progress/circular-progress.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { helperNotice, removeNotice } from '@/utils/lib/helperNotice';
import { useStoreProgram } from '@/contexts/anchor';
import { GMX_SOLANA_TOKENS_RAW } from '@/config/program';
import { BN } from '@coral-xyz/anchor';
import {
  create_deposits,
  create_shifts,
  create_withdrawals,
  create_glv_deposits,
  create_glv_withdrawals,
} from '@gmsol-labs/gmsol-sdk';
import { useExecOrder } from '@/components/Pools/utils/execOrder';
import { getRecentBlockhash } from '@/components/TradeBoxNew/utils/getRpcOrSdkParams';
import { usePriorityFees } from '@/components/TradeBoxNew/Hooks/usePriorityFees';
import { formatAmount } from '@/utils/legacy';
import icon_close from '@/img/close.png';
import { isRestrictedArea } from '../utils/getApyData';

function LoadingSpinner() {
  return (
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
}

function ExchangeButton({ params }: any) {
  usePriorityFees();
  const { connected, address, openConnectWalletModal } = usePayer();
  const {
    btnDisabled,
    btnMessage,
    isGlvBugSingle,
    isGlvBuyPair,
    isGlvSell,
    isBuyPair,
    isSell,
    isShift,
    poolInfo,
    payInfo,
    buyPairLong,
    glvBuySingleDepositParams,
    glvBuyPairDepositParams,
    glvSellWithDrawParams,
    isBuySingle,
    gmBuySingleDepositParams,
    gmBuyPairDepositParams,
    sellSimulatorParams,
    shiftSimulatorParams,
    onSuccess,
    onError,
  } = params || {};
  const isUs = isRestrictedArea();
  // console.log('payInfo', payInfo)
  const { signAllTransactions } = useWallet();
  const storeProgram = useStoreProgram();
  const [isLoading, setIsLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [signature, setSignature] = useState<string>('');
  const [successPayDetails, setSuccessPayDetails] = useState<string[]>([]);

  const submitData = async () => {
    if (!connected) {
      openConnectWalletModal();
      return;
    }
    setIsVisible(true);
    setIsLoading(true);
    let noticeId: number = 0;
    const connection = storeProgram.provider.connection;
    const blockhash = await getRecentBlockhash(connection);
    let glvDepositGroup;
    let didSuccess = false;
    try {
      if (isGlvBugSingle) {
        noticeId = helperNotice?.info(<Trans>Creating GLV buy order...</Trans>);
        console.log('glvBuySingleDepositParams', glvBuySingleDepositParams);
        glvDepositGroup = create_glv_deposits(
          [
            {
              ...glvBuySingleDepositParams,
            },
          ],
          {
            recent_blockhash: blockhash,
            payer: address,
            hints: new Map([
              [
                glvBuySingleDepositParams.glv_token,
                {
                  pool_tokens: {
                    long_token: poolInfo.longToken,
                    short_token: poolInfo.shortToken,
                  },
                },
              ],
            ]),
            transaction_group: {},
          }
        );
      }

      if (isGlvBuyPair) {
        noticeId = helperNotice?.info(<Trans>Creating GLV buy order...</Trans>);
        glvDepositGroup = create_glv_deposits([glvBuyPairDepositParams], {
          recent_blockhash: blockhash,
          payer: address,
          hints: new Map([
            [
              glvBuyPairDepositParams.glv_token,
              {
                pool_tokens: {
                  long_token: poolInfo.longToken,
                  short_token: poolInfo.shortToken,
                },
              },
            ],
          ]),
          transaction_group: {},
        });
      }

      if (isGlvSell) {
        console.log('glvSellWithDrawParams', glvSellWithDrawParams);
        noticeId = helperNotice?.info(
          <Trans>Creating GLV sell order...</Trans>
        );
        glvDepositGroup = create_glv_withdrawals([glvSellWithDrawParams], {
          recent_blockhash: blockhash,
          payer: address,
          hints: new Map([
            [
              glvSellWithDrawParams.glv_token,
              {
                pool_tokens: {
                  long_token: poolInfo.longToken,
                  short_token: poolInfo.shortToken,
                },
              },
            ],
          ]),
          transaction_group: {},
        });
      }

      // gm trade
      if (isBuySingle) {
        noticeId = helperNotice?.info(<Trans>Creating GM buy order...</Trans>);
        console.log('gmBuySingleDepositParams', gmBuySingleDepositParams);
        glvDepositGroup = create_deposits([gmBuySingleDepositParams], {
          recent_blockhash: blockhash,
          payer: address,
          hints: new Map([
            [
              gmBuySingleDepositParams.market_token,
              {
                pool_tokens: {
                  long_token: poolInfo.longToken,
                  short_token: poolInfo.shortToken,
                },
              },
            ],
          ]),
          transaction_group: {},
        });
      }

      if (isBuyPair) {
        noticeId = helperNotice?.info(<Trans>Creating GM buy order...</Trans>);
        console.log('gmBuyPairDepositParams', gmBuyPairDepositParams);
        glvDepositGroup = create_deposits([gmBuyPairDepositParams], {
          recent_blockhash: blockhash,
          payer: address,
          hints: new Map([
            [
              gmBuyPairDepositParams.market_token,
              {
                pool_tokens: {
                  long_token: poolInfo.longToken,
                  short_token: poolInfo.shortToken,
                },
              },
            ],
          ]),
          transaction_group: {},
        });
      }

      if (isSell) {
        noticeId = helperNotice?.info(<Trans>Creating GM sell order...</Trans>);
        glvDepositGroup = create_withdrawals([sellSimulatorParams], {
          recent_blockhash: blockhash,
          payer: address,
          hints: new Map([
            [
              sellSimulatorParams.market_token,
              {
                pool_tokens: {
                  long_token: poolInfo.longToken,
                  short_token: poolInfo.shortToken,
                },
              },
            ],
          ]),
          transaction_group: {},
        });
      }

      if (isShift) {
        noticeId = helperNotice?.info(
          <Trans>Creating GM shift order...</Trans>
        );
        glvDepositGroup = create_shifts([shiftSimulatorParams], {
          recent_blockhash: blockhash,
          payer: address,
          transaction_group: {},
        });
      }

      const signs = await useExecOrder(glvDepositGroup, {
        signAllTransactions,
        storeProgram,
      });
      if (Array.isArray(signs) && signs.length > 0) {
        if (noticeId) {
          removeNotice(noticeId);
        }
        if (isGlvBugSingle || isGlvBuyPair) {
          helperNotice.success(<Trans>GLV buy order created.</Trans>);
        } else if (isGlvSell) {
          helperNotice.success(<Trans>GLV sell order created.</Trans>);
        } else if (isBuySingle || isBuyPair) {
          helperNotice.success(<Trans>GM buy order created.</Trans>);
        } else if (isSell) {
          helperNotice.success(<Trans>GM sell order created.</Trans>);
        } else if (isShift) {
          helperNotice.success(<Trans>GM shift order created.</Trans>);
        }
        const lines: string[] = [];
        const getMeta = (addr: string | undefined) =>
          GMX_SOLANA_TOKENS_RAW[addr || ''] || {};
        const fmt = (
          amount: bigint | number | undefined,
          decimals: number,
          label: string
        ) => {
          const bn = new BN((amount || 0).toString());
          const v = formatAmount(bn, decimals, 4);
          return `-${v} ${label === 'WGMX' ? 'GMX' : label}`;
        };
        if (isGlvBugSingle && glvBuySingleDepositParams) {
          console.log('glvBuySingleDepositParams', glvBuySingleDepositParams);
          const amt = glvBuySingleDepositParams?.payNum as bigint | undefined;
          const meta = getMeta(
            glvBuySingleDepositParams?.payToken as string | undefined
          );
          const type = glvBuySingleDepositParams?.payType;
          lines.push(
            fmt(
              amt,
              meta?.decimals || 0,
              type === 'gm'
                ? 'GM:' +
                (meta?.symbol === 'WGMX'
                  ? 'GMX/USD'
                  : meta?.symbol + '/USD')
                : meta?.symbol
            )
          );
        }
        if (isGlvBuyPair && glvBuyPairDepositParams) {
          const lAmt = glvBuyPairDepositParams?.long_pay_amount as
            | bigint
            | undefined;
          const sAmt = glvBuyPairDepositParams?.short_pay_amount as
            | bigint
            | undefined;
          const lMeta = getMeta(
            glvBuyPairDepositParams?.long_pay_token as string | undefined
          );
          const sMeta = getMeta(
            glvBuyPairDepositParams?.short_pay_token as string | undefined
          );
          if (lAmt && lAmt > 0n)
            lines.push(fmt(lAmt, lMeta?.decimals || 0, lMeta?.symbol || ''));
          if (sAmt && sAmt > 0n)
            lines.push(fmt(sAmt, sMeta?.decimals || 0, sMeta?.symbol || ''));
        }
        if (isBuySingle && gmBuySingleDepositParams) {
          const lAmt = gmBuySingleDepositParams?.long_pay_amount as
            | bigint
            | undefined;
          const sAmt = gmBuySingleDepositParams?.short_pay_amount as
            | bigint
            | undefined;
          const lMeta = getMeta(poolInfo?.longToken);
          const sMeta = getMeta(poolInfo?.shortToken);
          if (lAmt && lAmt > 0n) {
            lines.push(
              fmt(lAmt, lMeta?.decimals || 0, payInfo?.tokenName || '')
            );
          }
          if (sAmt && sAmt > 0n) {
            lines.push(fmt(sAmt, sMeta?.decimals || 0, sMeta?.symbol || ''));
          }
        }
        if (isBuyPair && gmBuyPairDepositParams) {
          const lAmt = gmBuyPairDepositParams?.long_pay_amount as
            | bigint
            | undefined;
          const sAmt = gmBuyPairDepositParams?.short_pay_amount as
            | bigint
            | undefined;
          const lMeta = getMeta(poolInfo?.longToken);
          const sMeta = getMeta(poolInfo?.shortToken);
          if (lAmt && lAmt > 0n)
            lines.push(
              fmt(lAmt, lMeta?.decimals || 0, buyPairLong?.tokenName || '')
            );
          if (sAmt && sAmt > 0n)
            lines.push(fmt(sAmt, sMeta?.decimals || 0, sMeta?.symbol || ''));
        }
        if (isSell && sellSimulatorParams) {
          const amt = sellSimulatorParams?.market_token_amount as
            | bigint
            | undefined;
          if (amt && amt > 0n) {
            const decimals = poolInfo?.marketDecimals || 0;
            lines.push(fmt(amt, decimals, 'GM'));
          }
        }
        if (isGlvSell && glvSellWithDrawParams) {
          const amt = glvSellWithDrawParams?.glv_token_amount as
            | bigint
            | undefined;
          if (amt && amt > 0n) {
            const decimals = poolInfo?.decimals || 0;
            lines.push(fmt(amt, decimals, 'GLV'));
          }
        }
        if (isShift && shiftSimulatorParams) {
          const amt = shiftSimulatorParams?.from_market_token_amount as
            | bigint
            | undefined;
          if (amt && amt > 0n) {
            const decimals = poolInfo?.marketDecimals || 0;
            lines.push(fmt(amt, decimals, 'GM'));
          }
        }
        setSuccessPayDetails(lines);
        setPaymentStatus(true);
        setTimeout(() => {
          setIsVisible(false);
          setPaymentStatus(false);
        }, 2000);
        setIsLoading(false);
        setIsVisible(true);
        setSignature(
          Array.isArray(signs) ? String(signs[0] || '') : String(signs || '')
        );
        if (typeof onSuccess === 'function') onSuccess();
        didSuccess = true;
      }
    } catch (error) {
      if (noticeId) {
        removeNotice(noticeId);
      }
      setIsLoading(false);
      setIsVisible(false);
      setPaymentStatus(false);
      if (typeof onError === 'function') onError();
      console.log('error', error);
      helperNotice.error(<Trans>Failed to create order.</Trans>, {
        tradingErrorInfo: {
          actionName: isShift ? 'GM Shift' : isGlvSell ? 'GLV Withdrawal' : (isGlvBugSingle || isGlvBuyPair) ? 'GLV Deposit' : isSell ? 'GM Withdrawal' : 'GM Deposit',
          market: poolInfo?.marketToken,
          errorData: error,
        },
      });
    } finally {
      setIsLoading(false);
      if (!didSuccess && typeof onError === 'function') onError();
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
          className={`tradeBox-exchangeForm-button w-full [text-decoration:inherit]`}
          type="button"
          onClick={submitData}
          disabled={!connected ? false : isUs ? true : btnDisabled}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <LoadingSpinner />
              <Trans>Loading..</Trans>
            </div>
          ) : (
            <div>
              {!connected ? (
                <Trans>Connect Wallet</Trans>
              ) : isUs ? (
                <Trans>Access Restricted</Trans>
              ) : (
                <Trans>{btnMessage}</Trans>
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
