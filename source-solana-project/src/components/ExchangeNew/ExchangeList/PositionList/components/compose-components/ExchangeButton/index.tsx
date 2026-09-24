/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { memo, useState, useEffect } from 'react';
import { usePayer } from '@/components/TradeBoxNew/Hooks/usePayer';
import { useAppStore } from '@/zustand/useAppStore';
import Button from '@/components/Common/Button/Button';
import { t } from '@lingui/macro';
import '@material/web/progress/circular-progress.js';
import './index.scss';

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

function ExchangeButton({
  handleSubmit,
  isOk,
  btnDisabled,
  title,
  isError,
  disabledReason,
}: {
  handleSubmit: (params: any) => void;
  isOk: boolean;
  btnDisabled?: boolean;
  title?: string;
  successCallbackInfo?: {
    sig: string;
    num: string;
    tokenName: string;
  };
  isError?: boolean;
  type?: 'decrease' | 'increase';
  showTransactionModal?: boolean;
  disabledReason?: React.ReactNode;
}) {
  const { connected, address, balance, openConnectWalletModal } = usePayer();
  const btnMessage = useAppStore((state) => state.TradeboxNew.btnMessage);
  const graphObj = useAppStore((state) => state.TradeboxNew.graphObj);
  const setPayerInfo = useAppStore((state) => state.payerSwapTokens.setPayerInfo);
  const [isLoading, setIsLoading] = useState(false);
  const [graph, setGraph] = useState<any>(null);
  useEffect(() => {
    if (connected) {
      setPayerInfo({
        connected,
        address,
        balance,
      });
      // setButtonText(t`Enter an amount`);
    } else {
      setPayerInfo({
        connected: false,
        address: null,
        balance: null,
      });
      // setButtonText(t`Connect Wallet`);
    }
  }, [connected]);

  useEffect(() => {
    if (btnMessage && !isLoading) {
      // setButtonText(btnMessage);
    }
  }, [btnMessage, isLoading]);

  useEffect(() => {
    if (graphObj) {
      setGraph(graphObj);
    }
  }, [graphObj]);

  useEffect(() => {
    if (isOk) {
      setTimeout(() => {
        setIsLoading(false);
      }, 2000);
    }
  }, [isOk]);

  useEffect(() => {
    if (isError) {
      setIsLoading(false);
    }
  }, [isError]);

  const submitData = () => {
    if (disabledReason) {
      return;
    }
    if (!connected) {
      openConnectWalletModal();
      return;
    }
    setIsLoading(true);
    if (!graph) {
      return;
    }
    handleSubmit(graph);
  };

  const buttonContent = (
    <>
      <div className="exchangeButton-buttonDiv">
        <Button
          qa="confirm-trade-button"
          variant="primary-action"
          className={`tradeBox-exchangeForm-button w-full [text-decoration:inherit]`}
          type="submit"
          onClick={() => void submitData()}
          disabled={
            btnDisabled === null
              ? true
              : btnDisabled || isLoading || Boolean(disabledReason)
          }
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <LoadingSpinner />
              {t`Loading...`}
            </div>
          ) : (
            disabledReason || (title ? t`${title}` : t`Enter an amount`)
          )}
        </Button>
      </div>
    </>
  );
  return buttonContent;
}

export default memo(ExchangeButton);
