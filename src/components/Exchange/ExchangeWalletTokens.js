import React from "react";

import "./ExchangeWalletTokens.css";
import { expandDecimals, formatAmount } from "lib/numbers";
import { bigMath } from "lib/bigmath";

export default function ExchangeWalletTokens(props) {
  const { tokens, infoTokens, onSelectToken } = props;

  return (
    <div className="ExchangeWalletTokens App-box">
      {tokens.map((token) => {
        let info = infoTokens ? infoTokens[token.address] : {};
        let balance = info.balance;
        let balanceUsd;

        if (balance && info.maxPrice) {
          balanceUsd = bigMath.mulDiv(balance, info.maxPrice, expandDecimals(1, token.decimals));
        }
        return (
          <div className="ExchangeWalletTokens-token-row" onClick={() => onSelectToken(token)} key={token.address}>
            <div className="ExchangeWalletTokens-top-row">
              <div>{token.symbol}</div>
              {balance && (
                <div className="align-right">
                  {balance > 0 && formatAmount(balance, token.decimals, 4, true)}
                  {balance == 0n && "-"}
                </div>
              )}
            </div>
            <div className="ExchangeWalletTokens-content-row">
              <div className="ExchangeWalletTokens-token-name">{token.name}</div>
              {balanceUsd !== undefined && balanceUsd > 0 && (
                <div className="align-right">${formatAmount(balanceUsd, 30, 2, true)}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
