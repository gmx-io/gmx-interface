import { Trans } from "@lingui/macro";
import { useEffect, useState } from "react";

import { getChainName } from "config/chains";
import { CHAIN_ID_TO_NETWORK_ICON } from "config/icons";
import { useGmxAccountSelectedTransferGuid } from "context/GmxAccountContext/hooks";
import { useChainId } from "lib/chains";
import { formatBalanceAmount } from "lib/numbers";
import { shortenAddressOrEns } from "lib/wallets";
import { getToken } from "sdk/configs/tokens";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import ExternalLink from "components/ExternalLink/ExternalLink";

import externalLink from "img/ic_new_link_20.svg";

import { CHAIN_ID_TO_EXPLORER_NAME, CHAIN_ID_TO_TX_URL_BUILDER } from "../../../lib/chains/blockExplorers";
import { SyntheticsInfoRow } from "../SyntheticsInfoRow";
import { useGmxAccountFundingHistoryItem } from "./useGmxAccountFundingHistory";
import { formatTradeActionTimestamp } from "../TradeHistory/TradeHistoryRow/utils/shared";

export const TransferDetailsView = () => {
  const { chainId } = useChainId();
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

  if (!selectedTransfer) {
    return null;
  }

  const sourceChainName = getChainName(selectedTransfer.sourceChainId);

  const token = getToken(chainId, selectedTransfer.token);

  return (
    <div className="text-body-medium flex grow flex-col gap-8 overflow-y-hidden">
      <div className="flex flex-col gap-8 px-16 pt-16">
        {selectedTransfer.isExecutionError ? (
          <AlertInfoCard type="error">
            <Trans>Your deposit of from {sourceChainName} was not executed due to an error</Trans>
          </AlertInfoCard>
        ) : null}
        <SyntheticsInfoRow label="Sent at" value={formatTradeActionTimestamp(selectedTransfer.sentTimestamp)} />
        {selectedTransfer.receivedTimestamp ? (
          <SyntheticsInfoRow
            label="Received at"
            value={formatTradeActionTimestamp(selectedTransfer.receivedTimestamp)}
          />
        ) : null}
        {selectedTransfer.executedTimestamp ? (
          <SyntheticsInfoRow
            label="Executed at"
            value={formatTradeActionTimestamp(selectedTransfer.executedTimestamp)}
          />
        ) : null}
        <SyntheticsInfoRow
          label="Sent Amount"
          value={formatBalanceAmount(selectedTransfer.sentAmount, token.decimals, token.symbol)}
        />
        {selectedTransfer.receivedAmount !== undefined && (
          <>
            <SyntheticsInfoRow
              label="Received Amount"
              value={formatBalanceAmount(selectedTransfer.receivedAmount, token.decimals, token.symbol)}
            />
            <SyntheticsInfoRow
              label="Fee"
              value={formatBalanceAmount(
                selectedTransfer.sentAmount - selectedTransfer.receivedAmount,
                token.decimals,
                token.symbol
              )}
            />
          </>
        )}
        <SyntheticsInfoRow
          label="Network"
          className="!items-center"
          valueClassName="-my-5"
          value={
            <div className="flex items-center gap-8">
              <img
                src={CHAIN_ID_TO_NETWORK_ICON[selectedTransfer.sourceChainId]}
                width={20}
                height={20}
                className="size-20 rounded-full"
              />
              {getChainName(selectedTransfer.sourceChainId)}
            </div>
          }
        />
        <SyntheticsInfoRow label="Wallet" value={shortenAddressOrEns(selectedTransfer.account, 13)} />
        {selectedTransfer.sentTxn && (
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
        {selectedTransfer.receivedTxn && (
          <SyntheticsInfoRow
            label={
              selectedTransfer.operation === "deposit"
                ? CHAIN_ID_TO_EXPLORER_NAME[selectedTransfer.settlementChainId]
                : CHAIN_ID_TO_EXPLORER_NAME[selectedTransfer.sourceChainId]
            }
            value={
              <ExternalLink
                href={
                  selectedTransfer.operation === "deposit"
                    ? CHAIN_ID_TO_TX_URL_BUILDER[selectedTransfer.settlementChainId](selectedTransfer.receivedTxn)
                    : CHAIN_ID_TO_TX_URL_BUILDER[selectedTransfer.sourceChainId](selectedTransfer.receivedTxn)
                }
              >
                <div className="flex items-center gap-4">
                  {shortenAddressOrEns(selectedTransfer.receivedTxn, 13)}
                  <img src={externalLink} alt="External Link" className="size-20" />
                </div>
              </ExternalLink>
            }
          />
        )}
        {selectedTransfer.executedTxn && (
          <SyntheticsInfoRow
            label={
              selectedTransfer.isExecutionError ? (
                <>
                  {CHAIN_ID_TO_EXPLORER_NAME[selectedTransfer.settlementChainId]}{" "}
                  <span className="text-red-500">Txn Failed</span>
                </>
              ) : (
                CHAIN_ID_TO_EXPLORER_NAME[selectedTransfer.settlementChainId]
              )
            }
            value={
              <ExternalLink
                href={CHAIN_ID_TO_TX_URL_BUILDER[selectedTransfer.settlementChainId](selectedTransfer.executedTxn)}
              >
                <div className="flex items-center gap-4">
                  {shortenAddressOrEns(selectedTransfer.executedTxn, 13)}
                  <img src={externalLink} alt="External Link" className="size-20" />
                </div>
              </ExternalLink>
            }
          />
        )}
      </div>
    </div>
  );
};
