import { getChainName } from "config/chains";
import { CHAIN_ID_TO_NETWORK_ICON } from "config/icons";
import { useGmxAccountSelectedTransferGuid, useGmxAccountSettlementChainId } from "context/GmxAccountContext/hooks";
import { formatBalanceAmount } from "lib/numbers";
import { shortenAddressOrEns } from "lib/wallets";
import { getToken } from "sdk/configs/tokens";

import ExternalLink from "components/ExternalLink/ExternalLink";

import externalLink from "img/ic_new_link_20.svg";

import { CHAIN_ID_TO_EXPLORER_NAME, CHAIN_ID_TO_TX_URL_BUILDER } from "../../../lib/chains/blockExplorers";
import { SyntheticsInfoRow } from "../SyntheticsInfoRow";
import { useGmxAccountFundingHistoryItem } from "./useGmxAccountFundingHistory";
import { formatTradeActionTimestamp } from "../TradeHistory/TradeHistoryRow/utils/shared";

export const TransferDetailsView = () => {
  const [settlementChainId] = useGmxAccountSettlementChainId();
  const [selectedTransferGuid] = useGmxAccountSelectedTransferGuid();

  const selectedTransaction = useGmxAccountFundingHistoryItem(selectedTransferGuid);

  if (!selectedTransaction) {
    return null;
  }

  const token = getToken(settlementChainId, selectedTransaction.token);

  return (
    <div className="text-body-medium flex grow flex-col gap-8 overflow-y-hidden">
      <div className="flex flex-col gap-8 px-16 pt-16">
        <SyntheticsInfoRow label="Sent at" value={formatTradeActionTimestamp(selectedTransaction.sentTimestamp)} />
        {selectedTransaction.receivedTimestamp ? (
          <SyntheticsInfoRow
            label="Received at"
            value={formatTradeActionTimestamp(selectedTransaction.receivedTimestamp)}
          />
        ) : null}
        {selectedTransaction.executedTimestamp ? (
          <SyntheticsInfoRow
            label="Executed at"
            value={formatTradeActionTimestamp(selectedTransaction.executedTimestamp)}
          />
        ) : null}
        <SyntheticsInfoRow
          label="Amount"
          value={formatBalanceAmount(selectedTransaction.amount, token.decimals, token.symbol)}
        />
        {/* <SyntheticsInfoRow label="Fee" value={""} /> */}
        <SyntheticsInfoRow
          label="Network"
          className="!items-center"
          valueClassName="-my-5"
          value={
            <div className="flex items-center gap-8">
              <img
                src={CHAIN_ID_TO_NETWORK_ICON[selectedTransaction.sourceChainId]}
                width={20}
                height={20}
                className="size-20 rounded-full"
              />
              {getChainName(selectedTransaction.sourceChainId)}
            </div>
          }
        />
        <SyntheticsInfoRow label="Wallet" value={shortenAddressOrEns(selectedTransaction.account, 13)} />
        <SyntheticsInfoRow
          label={CHAIN_ID_TO_EXPLORER_NAME[selectedTransaction.sourceChainId]}
          value={
            <ExternalLink
              href={CHAIN_ID_TO_TX_URL_BUILDER[selectedTransaction.sourceChainId](selectedTransaction.sentTxn)}
            >
              <div className="flex items-center gap-4">
                {shortenAddressOrEns(selectedTransaction.sentTxn, 13)}
                <img src={externalLink} alt="External Link" className="size-20" />
              </div>
            </ExternalLink>
          }
        />
        {selectedTransaction.receivedTxn && (
          <SyntheticsInfoRow
            label={CHAIN_ID_TO_EXPLORER_NAME[selectedTransaction.settlementChainId]}
            value={
              <ExternalLink
                href={CHAIN_ID_TO_TX_URL_BUILDER[selectedTransaction.settlementChainId](
                  selectedTransaction.receivedTxn
                )}
              >
                <div className="flex items-center gap-4">
                  {shortenAddressOrEns(selectedTransaction.receivedTxn, 13)}
                  <img src={externalLink} alt="External Link" className="size-20" />
                </div>
              </ExternalLink>
            }
          />
        )}
        {selectedTransaction.executedTxn && (
          <SyntheticsInfoRow
            label={CHAIN_ID_TO_EXPLORER_NAME[selectedTransaction.settlementChainId]}
            value={
              <ExternalLink
                href={CHAIN_ID_TO_TX_URL_BUILDER[selectedTransaction.settlementChainId](
                  selectedTransaction.executedTxn
                )}
              >
                <div className="flex items-center gap-4">
                  {shortenAddressOrEns(selectedTransaction.executedTxn, 13)}
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
