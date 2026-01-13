import { Trans } from "@lingui/macro";
import { useEffect, useState } from "react";

import { getChainName, isTestnetChain, SourceChainId } from "config/chains";
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

  const selectedTransfer = useGmxAccountFundingHistoryItem(selectedTransferGuid, {
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

  const sourceChainName = selectedTransfer ? getChainName(selectedTransfer.sourceChainId) : undefined;

  const token = selectedTransfer ? getToken(chainId, selectedTransfer.token) : undefined;

  const handleRepeatTransaction = () => {
    if (!selectedTransfer || !token) {
      return;
    }

    if (selectedTransfer.operation === "deposit") {
      setGmxAccountDepositViewChain(selectedTransfer.sourceChainId as SourceChainId);
      setGmxAccountDepositViewTokenAddress(selectedTransfer.token);
      setGmxAccountDepositViewTokenInputValue(formatAmountFree(selectedTransfer.sentAmount, token.decimals));
      setGmxAccountModalOpen("deposit");
      return;
    }

    if (selectedTransfer.operation === "withdrawal") {
      setGmxAccountWithdrawalViewChain(selectedTransfer.sourceChainId as SourceChainId);
      setGmxAccountWithdrawalViewTokenAddress(convertTokenAddress(chainId, selectedTransfer.token, "wrapped"));
      setGmxAccountWithdrawalViewTokenInputValue(formatAmountFree(selectedTransfer.sentAmount, token.decimals));
      setGmxAccountModalOpen("withdraw");
    }
  };

  const addressLabel = selectedTransfer ? shortenAddressOrEns(selectedTransfer.account, 13) : undefined;

  const networkLabel = selectedTransfer && (
    <span>
      <img
        src={CHAIN_ID_TO_NETWORK_ICON[selectedTransfer.sourceChainId]}
        width={20}
        height={20}
        className="-my-5 inline-block size-20 rounded-full align-baseline"
      />{" "}
      {getChainName(selectedTransfer.sourceChainId)}
    </span>
  );

  const isTestnet = selectedTransfer && isTestnetChain(selectedTransfer.settlementChainId);

  return (
    <div className="text-body-medium flex grow flex-col gap-8 p-adaptive">
      {selectedTransfer?.isExecutionError ? (
        <AlertInfoCard type="error">
          <Trans>Your deposit of from {sourceChainName} was not executed due to an error.</Trans>
        </AlertInfoCard>
      ) : null}
      <SyntheticsInfoRow
        label={<Trans>Date</Trans>}
        value={selectedTransfer ? formatTradeActionTimestamp(selectedTransfer.sentTimestamp) : undefined}
      />
      <SyntheticsInfoRow
        label={selectedTransfer?.operation === "deposit" ? <Trans>From</Trans> : <Trans>To</Trans>}
        value={
          <Trans>
            {addressLabel} on {networkLabel}
          </Trans>
        }
      />
      {selectedTransfer?.sentTxn && (
        <SyntheticsInfoRow
          label={
            CHAIN_ID_TO_EXPLORER_NAME[
              selectedTransfer.operation === "deposit"
                ? selectedTransfer.sourceChainId
                : selectedTransfer.settlementChainId
            ]
          }
          value={
            <ExternalLink
              className="!no-underline"
              href={
                selectedTransfer.operation === "deposit"
                  ? CHAIN_ID_TO_TX_URL_BUILDER[selectedTransfer.sourceChainId](selectedTransfer.sentTxn)
                  : CHAIN_ID_TO_TX_URL_BUILDER[selectedTransfer.settlementChainId](selectedTransfer.sentTxn)
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
      {selectedTransfer?.sentTxn && (
        <SyntheticsInfoRow
          label={isTestnet ? <Trans>Testnet LayerZero Scan</Trans> : <Trans>LayerZero Scan</Trans>}
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
          selectedTransfer && token ? (
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
      {selectedTransfer?.receivedAmount !== undefined && (
        <>
          <SyntheticsInfoRow
            label={<Trans>Fee</Trans>}
            value={
              selectedTransfer && token ? (
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

      <div className="grow" />
      <Button variant="secondary" onClick={handleRepeatTransaction}>
        <Trans>Repeat Transaction</Trans>
      </Button>
    </div>
  );
};
