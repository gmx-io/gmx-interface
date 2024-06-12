import { ethers } from "ethers";
import useSWR from "swr";
import type { Address } from "viem";

import "./ActionsV1.css";

import { getContract } from "config/contracts";
import { useAccountOrders } from "lib/legacy";

import { getPositionQuery, getPositions } from "../../Exchange/Exchange";

import OrdersList from "components/Exchange/OrdersList";
import PositionsList from "components/Exchange/PositionsList";

import Reader from "abis/Reader.json";
import TradeHistory from "components/Exchange/TradeHistory";

import { Trans, t } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import Footer from "components/Footer/Footer";
import PageTitle from "components/PageTitle/PageTitle";
import { getServerBaseUrl } from "config/backend";
import { ARBITRUM, AVALANCHE, getChainName } from "config/chains";
import { getIsSyntheticsSupported } from "config/features";
import { getToken, getV1Tokens, getWhitelistedV1Tokens } from "config/tokens";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useInfoTokens } from "domain/tokens";
import { getTokenInfo } from "domain/tokens/utils";
import { useChainId } from "lib/chains";
import { contractFetcher } from "lib/contracts";
import { formatAmount } from "lib/numbers";
import { switchNetwork } from "lib/wallets";
import useWallet from "lib/wallets/useWallet";

const USD_DECIMALS = 30;

export default function ActionsPageV1() {
  const { active, signer } = useWallet();
  const { chainId } = useChainId();

  return <ActionsV1 chainId={chainId} signer={signer} active={active} />;
}

function ActionsV1({
  chainId,
  signer,
  active,
}: {
  chainId: number;
  signer: ethers.JsonRpcSigner | undefined;
  active: boolean;
}) {
  const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN");
  const vaultAddress = getContract(chainId, "Vault");
  const readerAddress = getContract(chainId, "Reader");

  const networkName = getChainName(chainId);

  const shouldShowPnl = false;

  const pnlUrl = `${getServerBaseUrl(chainId)}/pnl`;
  const { data: pnlData } = useSWR(pnlUrl, {
    fetcher: (url) => fetch(url).then((res) => res.json()),
  });

  const tokens = getV1Tokens(chainId);
  const whitelistedTokens = getWhitelistedV1Tokens(chainId);

  const whitelistedTokenAddresses = whitelistedTokens.map((token) => token.address);
  const tokenAddresses = tokens.map((token) => token.address);
  const { data: tokenBalances } = useSWR([active, chainId, readerAddress, "getTokenBalances", undefined], {
    fetcher: contractFetcher(signer, Reader, [tokenAddresses]),
  });

  const { data: fundingRateInfo } = useSWR([active, chainId, readerAddress, "getFundingRates"], {
    fetcher: contractFetcher(signer, Reader, [vaultAddress, nativeTokenAddress, whitelistedTokenAddresses]),
  });

  const { infoTokens } = useInfoTokens(signer, chainId, active, tokenBalances, fundingRateInfo);

  return (
    <div className="default-container page-layout">
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

      <div className="Actions-section">
        <div className="Actions-title">
          <PageTitle
            isTop
            title={t`GMX V1 Actions`}
            subtitle={
              <>
                <Trans>GMX V1 {networkName} actions for all accounts.</Trans>
                {getIsSyntheticsSupported(chainId) && (
                  <Trans>
                    <div>
                      <ExternalLink newTab={false} href="/#/accounts">
                        Check on GMX V2 {networkName}
                      </ExternalLink>{" "}
                      or{" "}
                      <span
                        className="cursor-pointer underline"
                        onClick={() => switchNetwork(chainId === ARBITRUM ? AVALANCHE : ARBITRUM, active)}
                      >
                        switch network to {chainId === ARBITRUM ? "Avalanche" : "Arbitrum"}
                      </span>
                      .
                    </div>
                  </Trans>
                )}
              </>
            }
          />
        </div>

        <TradeHistory
          infoTokens={infoTokens}
          getTokenInfo={getTokenInfo}
          chainId={chainId}
          nativeTokenAddress={nativeTokenAddress}
          shouldShowPaginationButtons={true}
        />
      </div>
      <Footer />
    </div>
  );
}

export function usePositionsV1(
  chainId: number,
  account: Address,
  signer: ethers.JsonRpcSigner | undefined,
  active: boolean
) {
  const { isPnlInLeverage: savedIsPnlInLeverage, showPnlAfterFees: savedShowPnlAfterFees } = useSettings();

  const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN");
  const vaultAddress = getContract(chainId, "Vault");
  const readerAddress = getContract(chainId, "Reader");

  let checkSummedAccount = ethers.getAddress(account);

  const tokens = getV1Tokens(chainId);
  const whitelistedTokens = getWhitelistedV1Tokens(chainId);
  const positionQuery = getPositionQuery(whitelistedTokens, nativeTokenAddress);

  const whitelistedTokenAddresses = whitelistedTokens.map((token) => token.address);
  const tokenAddresses = tokens.map((token) => token.address);
  const { data: tokenBalances } = useSWR([active, chainId, readerAddress, "getTokenBalances", account], {
    fetcher: contractFetcher(signer, Reader, [tokenAddresses]),
  });

  const { data: positionData } = useSWR([active, chainId, readerAddress, "getPositions", vaultAddress, account], {
    fetcher: contractFetcher(signer, Reader, [
      positionQuery.collateralTokens,
      positionQuery.indexTokens,
      positionQuery.isLong,
    ]),
  });

  const { data: fundingRateInfo } = useSWR([active, chainId, readerAddress, "getFundingRates"], {
    fetcher: contractFetcher(signer, Reader, [vaultAddress, nativeTokenAddress, whitelistedTokenAddresses]),
  });

  const { infoTokens } = useInfoTokens(signer, chainId, active, tokenBalances, fundingRateInfo);
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

  return { positions, positionsMap };
}

export function AccountPositionsV1({
  account,
  chainId,
  signer,
  active,
}: {
  account: Address;
  chainId: number;
  signer: ethers.JsonRpcSigner | undefined;
  active: boolean;
}) {
  const { isPnlInLeverage: savedIsPnlInLeverage, showPnlAfterFees: savedShowPnlAfterFees } = useSettings();

  const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN");
  const vaultAddress = getContract(chainId, "Vault");
  const readerAddress = getContract(chainId, "Reader");

  let checkSummedAccount = ethers.getAddress(account);

  const tokens = getV1Tokens(chainId);
  const whitelistedTokens = getWhitelistedV1Tokens(chainId);

  const whitelistedTokenAddresses = whitelistedTokens.map((token) => token.address);
  const tokenAddresses = tokens.map((token) => token.address);
  const { data: tokenBalances } = useSWR([active, chainId, readerAddress, "getTokenBalances", account], {
    fetcher: contractFetcher(signer, Reader, [tokenAddresses]),
  });

  const { data: fundingRateInfo } = useSWR([active, chainId, readerAddress, "getFundingRates"], {
    fetcher: contractFetcher(signer, Reader, [vaultAddress, nativeTokenAddress, whitelistedTokenAddresses]),
  });

  const { infoTokens } = useInfoTokens(signer, chainId, active, tokenBalances, fundingRateInfo);
  const { positions, positionsMap } = usePositionsV1(chainId, account, signer, active);

  const flagOrdersEnabled = true;
  const [orders] = useAccountOrders(flagOrdersEnabled, checkSummedAccount, chainId, signer);

  return (
    <div>
      <div className="Actions-section">
        <PositionsList
          positions={positions}
          positionsMap={positionsMap}
          infoTokens={infoTokens}
          active={active}
          orders={orders}
          account={checkSummedAccount}
          signer={signer}
          flagOrdersEnabled={false}
          chainId={chainId}
          nativeTokenAddress={nativeTokenAddress}
          savedIsPnlInLeverage={savedIsPnlInLeverage}
          showPnlAfterFees={savedShowPnlAfterFees}
          hideActions
        />
      </div>
    </div>
  );
}

export function AccountOrdersV1({
  account,
  chainId,
  signer,
  active,
}: {
  account: Address;
  chainId: number;
  signer: ethers.JsonRpcSigner | undefined;
  active: boolean;
}) {
  const { isPnlInLeverage: savedIsPnlInLeverage, showPnlAfterFees: savedShowPnlAfterFees } = useSettings();

  const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN");
  const vaultAddress = getContract(chainId, "Vault");
  const readerAddress = getContract(chainId, "Reader");

  let checkSummedAccount = ethers.getAddress(account);

  const tokens = getV1Tokens(chainId);
  const whitelistedTokens = getWhitelistedV1Tokens(chainId);
  const positionQuery = getPositionQuery(whitelistedTokens, nativeTokenAddress);

  const whitelistedTokenAddresses = whitelistedTokens.map((token) => token.address);
  const tokenAddresses = tokens.map((token) => token.address);
  const { data: tokenBalances } = useSWR([active, chainId, readerAddress, "getTokenBalances", account], {
    fetcher: contractFetcher(signer, Reader, [tokenAddresses]),
  });

  const { data: positionData } = useSWR([active, chainId, readerAddress, "getPositions", vaultAddress, account], {
    fetcher: contractFetcher(signer, Reader, [
      positionQuery.collateralTokens,
      positionQuery.indexTokens,
      positionQuery.isLong,
    ]),
  });

  const { data: fundingRateInfo } = useSWR([active, chainId, readerAddress, "getFundingRates"], {
    fetcher: contractFetcher(signer, Reader, [vaultAddress, nativeTokenAddress, whitelistedTokenAddresses]),
  });

  const { infoTokens } = useInfoTokens(signer, chainId, active, tokenBalances, fundingRateInfo);
  const { positionsMap } = getPositions(
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
  const [orders, updateOrders] = useAccountOrders(flagOrdersEnabled, checkSummedAccount, chainId, signer);

  return (
    <div>
      <div className="Actions-section">
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
    </div>
  );
}

export function AccountActionsV1({
  account,
  chainId,
  signer,
  active,
}: {
  account: Address;
  chainId: number;
  signer: ethers.JsonRpcSigner | undefined;
  active: boolean;
}) {
  const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN");
  const vaultAddress = getContract(chainId, "Vault");
  const readerAddress = getContract(chainId, "Reader");

  let checkSummedAccount = ethers.getAddress(account);

  const tokens = getV1Tokens(chainId);
  const whitelistedTokens = getWhitelistedV1Tokens(chainId);

  const whitelistedTokenAddresses = whitelistedTokens.map((token) => token.address);
  const tokenAddresses = tokens.map((token) => token.address);
  const { data: tokenBalances } = useSWR([active, chainId, readerAddress, "getTokenBalances", account], {
    fetcher: contractFetcher(signer, Reader, [tokenAddresses]),
  });

  const { data: fundingRateInfo } = useSWR([active, chainId, readerAddress, "getFundingRates"], {
    fetcher: contractFetcher(signer, Reader, [vaultAddress, nativeTokenAddress, whitelistedTokenAddresses]),
  });

  const { infoTokens } = useInfoTokens(signer, chainId, active, tokenBalances, fundingRateInfo);

  return (
    <div>
      <div className="Actions-section">
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
