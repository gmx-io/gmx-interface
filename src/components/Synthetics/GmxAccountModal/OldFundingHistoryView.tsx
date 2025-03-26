import TokenIcon from "components/TokenIcon/TokenIcon";
import { useGmxAccountModalOpen, useGmxAccountSelectedTransactionHash } from "context/GmxAccountContext/hooks";
import { FundingHistoryItem } from "context/GmxAccountContext/types";
import { formatBalanceAmount } from "lib/numbers";
import { useState } from "react";
import { formatTradeActionTimestamp } from "../TradeHistory/TradeHistoryRow/utils/shared";
import { useGmxAccountFundingHistory, FundingHistoryItemLabel } from "./GmxAccountModal";

const FundingHistoryView = () => {
  const [, setIsVisibleOrView] = useGmxAccountModalOpen();
  const [, setSelectedTransactionHash] = useGmxAccountSelectedTransactionHash();
  const [searchQuery, setSearchQuery] = useState("");

  const fundingHistory = useGmxAccountFundingHistory();

  const filteredFundingHistory = fundingHistory.filter((balance) => {
    const matchesSearch = balance.token.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handleTransactionClick = (transaction: FundingHistoryItem) => {
    setSelectedTransactionHash(transaction.txnId);
    setIsVisibleOrView("transactionDetails");
  };

  return (
    <div className="flex grow flex-col gap-8 overflow-y-hidden">
      <div className="px-16 pt-16">
        <input
          type="text"
          placeholder="Search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-4 bg-slate-700 px-12 py-8 text-white placeholder:text-slate-100"
        />
      </div>

      <div className="grow overflow-y-auto">
        {filteredFundingHistory.map((transaction) => (
          <div
            role="button"
            tabIndex={0}
            key={transaction.id}
            className="flex w-full cursor-pointer items-center justify-between px-16 py-8 text-left -outline-offset-4 gmx-hover:bg-slate-700"
            onClick={() => handleTransactionClick(transaction)}
          >
            <div className="flex items-center gap-8">
              <TokenIcon symbol={transaction.token.symbol} displaySize={40} importSize={40} />
              <div>
                <div>{transaction.token.symbol}</div>
                <FundingHistoryItemLabel status={transaction.status} operation={transaction.operation} />
              </div>
            </div>
            <div className="text-right">
              <div>{formatBalanceAmount(transaction.size, transaction.token.decimals, transaction.token.symbol)}</div>
              <div className="text-body-small text-slate-100">{formatTradeActionTimestamp(transaction.timestamp)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
