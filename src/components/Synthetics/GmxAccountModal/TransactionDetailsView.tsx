import ExternalLink from "components/ExternalLink/ExternalLink";
import { getChainName } from "config/chains";
import { CHAIN_ID_TO_NETWORK_ICON } from "config/icons";
import { DEV_FUNDING_HISTORY } from "context/GmxAccountContext/dev";
import { useGmxAccountSelectedTransactionHash } from "context/GmxAccountContext/hooks";
import externalLink from "img/ic_new_link_20.svg";
import { formatBalanceAmount } from "lib/numbers";
import { shortenAddressOrEns } from "lib/wallets";
import { SyntheticsInfoRow } from "../SyntheticsInfoRow";
import { formatTradeActionTimestamp } from "../TradeHistory/TradeHistoryRow/utils/shared";
import { CHAIN_ID_TO_EXPLORER_NAME, CHAIN_ID_TO_TX_URL_BUILDER } from "./constants";

export const TransactionDetailsView = () => {
  const [selectedTransactionHash] = useGmxAccountSelectedTransactionHash();

  const selectedTransaction = DEV_FUNDING_HISTORY.find((transaction) => transaction.txnId === selectedTransactionHash);

  if (!selectedTransaction) {
    return null;
  }

  return (
    <div className="text-body-medium flex grow flex-col gap-8 overflow-y-hidden">
      <div className="flex flex-col gap-8 px-16 pt-16">
        <SyntheticsInfoRow label="Date" value={formatTradeActionTimestamp(selectedTransaction.timestamp)} />
        <SyntheticsInfoRow
          label="Amount"
          value={formatBalanceAmount(
            selectedTransaction.size,
            selectedTransaction.token.decimals,
            selectedTransaction.token.symbol
          )}
        />
        <SyntheticsInfoRow
          label="Fee"
          value={formatBalanceAmount(
            34n * 10n ** 5n,
            selectedTransaction.token.decimals,
            selectedTransaction.token.symbol
          )}
        />
        <SyntheticsInfoRow
          label="Network"
          className="!items-center"
          valueClassName="-my-5"
          value={
            <div className="flex items-center gap-8">
              <img
                src={CHAIN_ID_TO_NETWORK_ICON[selectedTransaction.chainId]}
                width={20}
                height={20}
                className="size-20 rounded-full"
              />
              {getChainName(selectedTransaction.chainId)}
            </div>
          }
        />
        <SyntheticsInfoRow label="Wallet" value={shortenAddressOrEns(selectedTransaction.walletAddress, 13)} />
        <SyntheticsInfoRow
          label={CHAIN_ID_TO_EXPLORER_NAME[selectedTransaction.chainId]}
          value={
            <ExternalLink href={CHAIN_ID_TO_TX_URL_BUILDER[selectedTransaction.chainId](selectedTransaction.txnId)}>
              <div className="flex items-center gap-4">
                {shortenAddressOrEns(selectedTransaction.txnId, 13)}
                <img src={externalLink} alt="External Link" className="size-20" />
              </div>
            </ExternalLink>
          }
        />
      </div>
    </div>
  );
};
