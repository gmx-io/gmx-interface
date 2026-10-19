import { Trans } from "@lingui/macro";
import { useEffect, useState } from "react";
import Skeleton from "react-loading-skeleton";

import { AnyChainId, getChainName, isTestnetChain, SourceChainId } from "config/chains";
import { CHAIN_ID_TO_NETWORK_ICON } from "config/icons";
import {
  useGmxAccountDepositViewChain,
  useGmxAccountDepositViewTokenAddress,
  useGmxAccountDepositViewTokenInputValue,
  useGmxAccountModalOpen,
  useGmxAccountSelectedTransferGuid,
  useGmxAccountWithdrawalViewChain,
  useGmxAccountWithdrawalViewTokenAddress,
  useGmxAccountWithdrawalViewTokenInputValue,
} from "context/GmxAccountContext/hooks";
import { useGmxAccountFundingHistoryItem } from "domain/multichain/useGmxAccountFundingHistory";
import { useChainId } from "lib/chains";
import { CHAIN_ID_TO_EXPLORER_NAME, CHAIN_ID_TO_TX_URL_BUILDER } from "lib/chains/blockExplorers";
import { formatAmountFree } from "lib/numbers";
import { shortenAddressOrEns } from "lib/wallets";
import { convertTokenAddress, getToken } from "sdk/configs/tokens";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import { Amount } from "components/Amount/Amount";
import Button from "components/Button/Button";
import ExternalLink from "components/ExternalLink/ExternalLink";

import ExternalLinkIcon from "img/ic_new_link_20.svg?react";

import { SyntheticsInfoRow } from "../SyntheticsInfoRow";
import { formatTradeActionTimestamp } from "../TradeHistory/TradeHistoryRow/utils/shared";

import "react-loading-skeleton/dist/skeleton.css";
import "components/Skeleton/Skeleton.scss";

const labelSkeleton = (
  <Skeleton
    baseColor="#B4BBFF1A"
    highlightColor="#B4BBFF1A"
    width={64}
    height={14}
    borderRadius={4}
    className="leading-[14px]"
    inline
  />
);

const valueSkeleton = (
  <Skeleton
    baseColor="#B4BBFF1A"
    highlightColor="#B4BBFF1A"
    width={96}
    height={14}
    borderRadius={4}
    className="leading-[14px]"
    inline
  />
);

function TransferDetailsSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <SyntheticsInfoRow label={<Trans>Date</Trans>} value={valueSkeleton} />
      <SyntheticsInfoRow label={labelSkeleton} value={valueSkeleton} />
      <SyntheticsInfoRow label={labelSkeleton} value={valueSkeleton} />
      <SyntheticsInfoRow label={<Trans>Amount</Trans>} value={valueSkeleton} />
    </div>
  );
}

function TransferDetailsPlaceholder({ isLoading, hasError }: { isLoading: boolean; hasError: boolean }) {
  // error goes first: SWR keeps the error while it retries, and a retry flips isLoading back on
  if (!hasError && isLoading) {
    return <TransferDetailsSkeleton />;
  }

  return (
    <div className="flex grow items-center justify-center text-center text-typography-secondary">
      {hasError ? <Trans>Failed to load transfer details</Trans> : <Trans>Transfer not found</Trans>}
    </div>
  );
}

export const TransferDetailsView = () => {
  const { chainId } = useChainId();

  const [, setGmxAccountModalOpen] = useGmxAccountModalOpen();
  const [, setGmxAccountDepositViewChain] = useGmxAccountDepositViewChain();
  const [, setGmxAccountWithdrawalViewChain] = useGmxAccountWithdrawalViewChain();
  const [, setGmxAccountDepositViewTokenAddress] = useGmxAccountDepositViewTokenAddress();
  const [, setGmxAccountDepositViewTokenInputValue] = useGmxAccountDepositViewTokenInputValue();
  const [, setGmxAccountWithdrawalViewTokenAddress] = useGmxAccountWithdrawalViewTokenAddress();
  const [, setGmxAccountWithdrawalViewTokenInputValue] = useGmxAccountWithdrawalViewTokenInputValue();

  const [selectedTransferGuid] = useGmxAccountSelectedTransferGuid();

  const [isTransferPending, setIsTransferPending] = useState(false);

  const {
    transfer: selectedTransfer,
    isLoading,
    error,
  } = useGmxAccountFundingHistoryItem(selectedTransferGuid, {
    refetch: isTransferPending,
  });

  useEffect(() => {
    if (!selectedTransfer) {
      return;
    }

    if (selectedTransfer.operation === "deposit" && selectedTransfer.step !== "received") {
      setIsTransferPending(true);
      return;
    }

    if (selectedTransfer.operation === "withdrawal" && selectedTransfer.step !== "executed") {
      setIsTransferPending(true);
      return;
    }
  }, [selectedTransfer]);

  const token = selectedTransfer ? getToken(chainId, selectedTransfer.token) : undefined;

  let sourceChainId: number | undefined;
  let initialChainId: number | undefined;
  if (selectedTransfer) {
    if (selectedTransfer.sourceChainId === 0) {
      sourceChainId = selectedTransfer.settlementChainId;
      initialChainId = selectedTransfer.settlementChainId;
    } else {
      sourceChainId = selectedTransfer.sourceChainId;
      if (selectedTransfer.operation === "deposit") {
        initialChainId = selectedTransfer.sourceChainId;
      } else {
        initialChainId = selectedTransfer.settlementChainId;
      }
    }
  }

  const sourceChainName = sourceChainId ? getChainName(sourceChainId) : undefined;

  const handleRepeatTransaction = () => {
    if (!selectedTransfer || !token || !sourceChainId) {
      return;
    }

    if (selectedTransfer.operation === "deposit") {
      setGmxAccountDepositViewChain(sourceChainId as SourceChainId);
      setGmxAccountDepositViewTokenAddress(selectedTransfer.token);
      setGmxAccountDepositViewTokenInputValue(formatAmountFree(selectedTransfer.sentAmount, token.decimals));
      setGmxAccountModalOpen("deposit");
      return;
    }

    if (selectedTransfer.operation === "withdrawal") {
      setGmxAccountWithdrawalViewChain(sourceChainId as SourceChainId);
      setGmxAccountWithdrawalViewTokenAddress(convertTokenAddress(chainId, selectedTransfer.token, "wrapped"));
      setGmxAccountWithdrawalViewTokenInputValue(formatAmountFree(selectedTransfer.sentAmount, token.decimals));
      setGmxAccountModalOpen("withdraw");
    }
  };

  const addressLabel = selectedTransfer ? shortenAddressOrEns(selectedTransfer.account, 13) : undefined;

  const networkLabel = selectedTransfer && sourceChainId && (
    <span>
      <img
        src={CHAIN_ID_TO_NETWORK_ICON[sourceChainId as SourceChainId]}
        width={20}
        height={20}
        className="-my-5 inline-block size-20 rounded-full align-baseline"
      />{" "}
      {getChainName(sourceChainId)}
    </span>
  );

  const isTestnet = selectedTransfer && isTestnetChain(selectedTransfer.settlementChainId);

  return (
    <div className="text-body-medium flex grow flex-col gap-8 p-adaptive">
      {selectedTransfer ? (
        <>
          <SyntheticsInfoRow
            label={<Trans>Date</Trans>}
            value={formatTradeActionTimestamp(selectedTransfer.sentTimestamp)}
          />
          <SyntheticsInfoRow
            label={selectedTransfer.operation === "deposit" ? <Trans>From</Trans> : <Trans>To</Trans>}
            value={
              <Trans>
                {addressLabel} on {networkLabel}
              </Trans>
            }
          />
          {selectedTransfer.sentTxn && initialChainId && (
            <SyntheticsInfoRow
              label={CHAIN_ID_TO_EXPLORER_NAME[initialChainId as AnyChainId]}
              value={
                <ExternalLink
                  className="!no-underline"
                  href={CHAIN_ID_TO_TX_URL_BUILDER[initialChainId as AnyChainId](selectedTransfer.sentTxn)}
                >
                  <div className="flex items-center gap-4">
                    {shortenAddressOrEns(selectedTransfer.sentTxn, 13)}
                    <ExternalLinkIcon className="size-20 text-typography-secondary" />
                  </div>
                </ExternalLink>
              }
            />
          )}
          {selectedTransfer.sentTxn && selectedTransfer.sourceChainId !== 0 && (
            <SyntheticsInfoRow
              label={isTestnet ? <Trans>Testnet LayerZero scan</Trans> : <Trans>LayerZero scan</Trans>}
              value={
                <ExternalLink
                  className="!no-underline"
                  href={
                    isTestnet
                      ? CHAIN_ID_TO_TX_URL_BUILDER["layerzero-testnet"](selectedTransfer.sentTxn)
                      : CHAIN_ID_TO_TX_URL_BUILDER["layerzero"](selectedTransfer.sentTxn)
                  }
                >
                  <div className="flex items-center gap-4">
                    {shortenAddressOrEns(selectedTransfer.sentTxn, 13)}
                    <ExternalLinkIcon className="size-20 text-typography-secondary" />
                  </div>
                </ExternalLink>
              }
            />
          )}
          <SyntheticsInfoRow
            label={<Trans>Amount</Trans>}
            value={
              token ? (
                <Amount
                  amount={selectedTransfer.sentAmount}
                  decimals={token.decimals}
                  isStable={token.isStable}
                  symbol={token.symbol}
                  symbolClassName="text-typography-secondary"
                />
              ) : undefined
            }
          />
          {selectedTransfer.receivedAmount !== undefined && (
            <>
              <SyntheticsInfoRow
                label={<Trans>Fee</Trans>}
                value={
                  token ? (
                    <Amount
                      amount={selectedTransfer.sentAmount - selectedTransfer.receivedAmount}
                      decimals={token.decimals}
                      isStable={token.isStable}
                      symbol={token.symbol}
                      symbolClassName="text-typography-secondary"
                    />
                  ) : undefined
                }
              />
            </>
          )}
        </>
      ) : (
        <TransferDetailsPlaceholder isLoading={isLoading} hasError={error !== undefined} />
      )}

      <div className="grow" />
      {selectedTransfer?.isExecutionError ? (
        <AlertInfoCard type="error" hideClose>
          <Trans>Deposit from {sourceChainName} failed</Trans>
        </AlertInfoCard>
      ) : null}
      <Button variant="secondary" onClick={handleRepeatTransaction} disabled={!selectedTransfer}>
        <Trans>Repeat transaction</Trans>
      </Button>
    </div>
  );
};
