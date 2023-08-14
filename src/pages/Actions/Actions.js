import React from "react";
import useSWR from "swr";
import { ethers } from "ethers";
import { useWeb3React } from "@web3-react/core";
import { useParams } from "react-router-dom";

import "./Actions.css";

import { getContract } from "config/contracts";
import { useAccountOrders } from "lib/legacy";

import { getPositions, getPositionQuery } from "../Exchange/Exchange";

import PositionsList from "components/Exchange/PositionsList";
import OrdersList from "components/Exchange/OrdersList";

import TradeHistory from "components/Exchange/TradeHistory";
import Reader from "abis/Reader.json";

import { Trans, t } from "@lingui/macro";
import { getServerBaseUrl } from "config/backend";
import { contractFetcher } from "lib/contracts";
import { useInfoTokens } from "domain/tokens";
import { getTokenInfo } from "domain/tokens/utils";
import { formatAmount } from "lib/numbers";
import { getToken, getV1Tokens, getWhitelistedV1Tokens } from "config/tokens";
import { useChainId } from "lib/chains";

const USD_DECIMALS = 30;

export default function Actions({ savedIsPnlInLeverage, savedShowPnlAfterFees }) {
  const { account } = useParams();
  const { active, library } = useWeb3React();

  const { chainId } = useChainId();
  const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN");
  const vaultAddress = getContract(chainId, "Vault");
  const readerAddress = getContract(chainId, "Reader");

  const shouldShowPnl = false;

  let checkSummedAccount = "";
  if (ethers.utils.isAddress(account)) {
    checkSummedAccount = ethers.utils.getAddress(account);
  }
  const pnlUrl = `${getServerBaseUrl(chainId)}/pnl?account=${checkSummedAccount}`;
  const { data: pnlData } = useSWR([pnlUrl], {
    fetcher: (...args) => fetch(...args).then((res) => res.json()),
  });

  const tokens = getV1Tokens(chainId);
  const whitelistedTokens = getWhitelistedV1Tokens(chainId);
  const positionQuery = getPositionQuery(whitelistedTokens, nativeTokenAddress);

  const whitelistedTokenAddresses = whitelistedTokens.map((token) => token.address);
  const tokenAddresses = tokens.map((token) => token.address);
  const { data: tokenBalances } = useSWR([active, chainId, readerAddress, "getTokenBalances", account], {
    fetcher: contractFetcher(library, Reader, [tokenAddresses]),
  });

  const { data: positionData } = useSWR([active, chainId, readerAddress, "getPositions", vaultAddress, account], {
    fetcher: contractFetcher(library, Reader, [
      positionQuery.collateralTokens,
      positionQuery.indexTokens,
      positionQuery.isLong,
    ]),
  });

  const { data: fundingRateInfo } = useSWR([active, chainId, readerAddress, "getFundingRates"], {
    fetcher: contractFetcher(library, Reader, [vaultAddress, nativeTokenAddress, whitelistedTokenAddresses]),
  });

  const { infoTokens } = useInfoTokens(library, chainId, active, tokenBalances, fundingRateInfo);
  const { positions, positionsMap } = getPositions(
    chainId,
    positionQuery,
    positionData,
    infoTokens,
    savedIsPnlInLeverage,
    savedShowPnlAfterFees,
    checkSummedAccount,
    undefined,
    undefined
  );

  const flagOrdersEnabled = true;
  const [orders, updateOrders] = useAccountOrders(flagOrdersEnabled, checkSummedAccount);

  return (
    <div className="Actions">
      {checkSummedAccount.length > 0 && (
        <div className="Actions-section">
          <Trans>Account</Trans>: {checkSummedAccount}
        </div>
      )}
      {shouldShowPnl && (
        <div className="Actions-section">
          <div className="Actions-title">
            <Trans>PnL</Trans>
          </div>
          {(!pnlData || pnlData.length === 0) && (
            <div>
              <Trans>No PnLs found</Trans>
            </div>
          )}
          {pnlData &&
            pnlData.length > 0 &&
            pnlData.map((pnlRow, index) => {
              const token = getToken(chainId, pnlRow.data.indexToken);
              return (
                <div className="TradeHistory-row App-box App-box-border" key={index}>
                  <div>
                    {token.symbol} {pnlRow.data.isLong ? t`Long` : t`Short`} <Trans>Profit</Trans>:{" "}
                    {formatAmount(pnlRow.data.profit, USD_DECIMALS, 2, true)} USD
                  </div>
                  <div>
                    {token.symbol} {pnlRow.data.isLong ? t`Long` : t`Short`} <Trans>Loss</Trans>:{" "}
                    {formatAmount(pnlRow.data.loss, USD_DECIMALS, 2, true)} USD
                  </div>
                </div>
              );
            })}
        </div>
      )}
      {checkSummedAccount.length > 0 && (
        <div className="Actions-section">
          <div className="Actions-title">
            <Trans>Positions</Trans>
          </div>
          <PositionsList
            positions={positions}
            positionsMap={positionsMap}
            infoTokens={infoTokens}
            active={active}
            orders={orders}
            account={checkSummedAccount}
            library={library}
            flagOrdersEnabled={false}
            chainId={chainId}
            nativeTokenAddress={nativeTokenAddress}
            savedIsPnlInLeverage={savedIsPnlInLeverage}
            showPnlAfterFees={savedShowPnlAfterFees}
            hideActions
          />
        </div>
      )}
      {flagOrdersEnabled && checkSummedAccount.length > 0 && (
        <div className="Actions-section">
          <div className="Actions-title">
            <Trans>Orders</Trans>
          </div>
          <OrdersList
            account={checkSummedAccount}
            infoTokens={infoTokens}
            positionsMap={positionsMap}
            chainId={chainId}
            orders={orders}
            updateOrders={updateOrders}
            hideActions
          />
        </div>
      )}
      <div className="Actions-section">
        <div className="Actions-title">
          <Trans>Actions</Trans>
        </div>
        <TradeHistory
          account={checkSummedAccount}
          infoTokens={infoTokens}
          getTokenInfo={getTokenInfo}
          chainId={chainId}
          nativeTokenAddress={nativeTokenAddress}
          shouldShowPaginationButtons={true}
        />
      </div>
    </div>
  );
}
