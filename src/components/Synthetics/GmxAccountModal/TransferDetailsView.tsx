import { Trans } from "@lingui/macro";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";

import { getChainName } from "config/chains";
import { CHAIN_ID_TO_NETWORK_ICON } from "config/icons";
import {
  useGmxAccountDepositViewTokenAddress,
  useGmxAccountDepositViewTokenInputValue,
  useGmxAccountModalOpen,
  useGmxAccountSelectedTransferGuid,
  useGmxAccountWithdrawViewTokenAddress,
  useGmxAccountWithdrawViewTokenInputValue,
} from "context/GmxAccountContext/hooks";
import { useChainId } from "lib/chains";
import { formatAmountFree, formatBalanceAmount } from "lib/numbers";
import { shortenAddressOrEns, switchNetwork } from "lib/wallets";
import { getToken } from "sdk/configs/tokens";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import Button from "components/Button/Button";
import ExternalLink from "components/ExternalLink/ExternalLink";

import externalLink from "img/ic_new_link_20.svg";

import { CHAIN_ID_TO_EXPLORER_NAME, CHAIN_ID_TO_TX_URL_BUILDER } from "../../../lib/chains/blockExplorers";
import { SyntheticsInfoRow } from "../SyntheticsInfoRow";
import { ModalShrinkingContent } from "./ModalShrinkingContent";
import { useGmxAccountFundingHistoryItem } from "../../../domain/multichain/useGmxAccountFundingHistory";
import { formatTradeActionTimestamp } from "../TradeHistory/TradeHistoryRow/utils/shared";

export const TransferDetailsView = () => {
  const { chainId } = useChainId();
  const { isConnected } = useAccount();

  const [, setGmxAccountModalOpen] = useGmxAccountModalOpen();
  const [, setGmxAccountDepositViewTokenAddress] = useGmxAccountDepositViewTokenAddress();
  const [, setGmxAccountDepositViewTokenInputValue] = useGmxAccountDepositViewTokenInputValue();
  const [, setGmxAccountWithdrawViewTokenAddress] = useGmxAccountWithdrawViewTokenAddress();
  const [, setGmxAccountWithdrawViewTokenInputValue] = useGmxAccountWithdrawViewTokenInputValue();

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
      switchNetwork(selectedTransfer.sourceChainId, isConnected).then(() => {
        setGmxAccountDepositViewTokenAddress(selectedTransfer.token);
        setGmxAccountDepositViewTokenInputValue(formatAmountFree(selectedTransfer.sentAmount, token.decimals));
        setGmxAccountModalOpen("deposit");
      });
      return;
    }

    if (selectedTransfer.operation === "withdrawal") {
      switchNetwork(selectedTransfer.sourceChainId, isConnected).then(() => {
        setGmxAccountWithdrawViewTokenAddress(selectedTransfer.token);
        setGmxAccountWithdrawViewTokenInputValue(formatAmountFree(selectedTransfer.sentAmount, token.decimals));
        setGmxAccountModalOpen("withdraw");
      });
    }
  };

  return (
    <ModalShrinkingContent className="text-body-medium min-h-[515px] gap-8 p-16">
      {selectedTransfer?.isExecutionError ? (
        <AlertInfoCard type="error">
          <Trans>Your deposit of from {sourceChainName} was not executed due to an error</Trans>
        </AlertInfoCard>
      ) : null}
      <SyntheticsInfoRow
        label={<Trans>Date</Trans>}
        value={selectedTransfer ? formatTradeActionTimestamp(selectedTransfer.sentTimestamp) : undefined}
      />
      <SyntheticsInfoRow
        label={<Trans>Type</Trans>}
        value={
          selectedTransfer ? (
            selectedTransfer.operation === "deposit" ? (
              <Trans>Deposit</Trans>
            ) : (
              <Trans>Withdrawal</Trans>
            )
          ) : undefined
        }
      />
      <SyntheticsInfoRow
        label={<Trans>Wallet</Trans>}
        value={
          selectedTransfer ? (
            selectedTransfer.operation === "deposit" ? (
              <Trans>GMX Balance</Trans>
            ) : (
              shortenAddressOrEns(selectedTransfer.account, 13)
            )
          ) : undefined
        }
      />
      <SyntheticsInfoRow
        label={<Trans>Amount</Trans>}
        value={
          selectedTransfer && token
            ? formatBalanceAmount(selectedTransfer.sentAmount, token.decimals, token.symbol)
            : undefined
        }
      />
      {selectedTransfer?.receivedAmount !== undefined && (
        <>
          <SyntheticsInfoRow
            label={<Trans>Fee</Trans>}
            value={
              selectedTransfer && token
                ? formatBalanceAmount(
                    selectedTransfer.sentAmount - selectedTransfer.receivedAmount,
                    token.decimals,
                    token.symbol
                  )
                : undefined
            }
          />
        </>
      )}
      <SyntheticsInfoRow
        label={
          selectedTransfer ? (
            selectedTransfer.operation === "deposit" ? (
              <Trans>From Network</Trans>
            ) : (
              <Trans>To Network</Trans>
            )
          ) : undefined
        }
        className="!items-center"
        valueClassName="-my-5"
        value={
          selectedTransfer && (
            <div className="flex items-center gap-8">
              <img
                src={CHAIN_ID_TO_NETWORK_ICON[selectedTransfer.sourceChainId]}
                width={20}
                height={20}
                className="size-20 rounded-full"
              />
              {getChainName(selectedTransfer.sourceChainId)}
            </div>
          )
        }
      />
      <SyntheticsInfoRow
        label={
          selectedTransfer ? (
            selectedTransfer.operation === "deposit" ? (
              <Trans>From Wallet</Trans>
            ) : (
              <Trans>To Wallet</Trans>
            )
          ) : undefined
        }
        value={selectedTransfer ? shortenAddressOrEns(selectedTransfer.account, 13) : undefined}
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
              href={
                selectedTransfer.operation === "deposit"
                  ? CHAIN_ID_TO_TX_URL_BUILDER[selectedTransfer.sourceChainId](selectedTransfer.sentTxn)
                  : CHAIN_ID_TO_TX_URL_BUILDER[selectedTransfer.settlementChainId](selectedTransfer.sentTxn)
              }
            >
              <div className="flex items-center gap-4">
                {shortenAddressOrEns(selectedTransfer.sentTxn, 13)}
                <img src={externalLink} alt="External Link" className="size-20" />
              </div>
            </ExternalLink>
          }
        />
      )}
      <div className="grow" />
      <Button variant="secondary" onClick={handleRepeatTransaction}>
        <Trans>Repeat Transaction</Trans>
      </Button>
    </ModalShrinkingContent>
  );
};
