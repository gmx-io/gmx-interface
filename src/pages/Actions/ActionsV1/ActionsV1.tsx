import { Trans, t } from "@lingui/macro";
import { ethers } from "ethers";
import useSWR from "swr";
import type { Address } from "viem";

import { getChainName, type UiContractsChain } from "config/chains";
import { getContract } from "config/contracts";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useInfoTokens } from "domain/tokens";
import { getTokenInfo } from "domain/tokens/utils";
import { contractFetcher } from "lib/contracts";
import { useAccountOrders } from "lib/legacy";
import useWallet from "lib/wallets/useWallet";
import { VersionNetworkSwitcherRow } from "pages/AccountDashboard/VersionNetworkSwitcherRow";
import { getPositionQuery, getPositions } from "pages/Exchange/Exchange";
import { getV1Tokens, getWhitelistedV1Tokens } from "sdk/configs/tokens";

import OrdersList from "components/Exchange/OrdersList";
import PositionsList from "components/Exchange/PositionsList";
import TradeHistory from "components/Exchange/TradeHistory";
import Footer from "components/Footer/Footer";
import PageTitle from "components/PageTitle/PageTitle";

import "./ActionsV1.css";

const versionName = "V1";

export default function ActionsPageV1({ chainId }: { chainId: UiContractsChain }) {
  const { active, signer } = useWallet();

  return <ActionsV1 chainId={chainId} signer={signer} active={active} />;
}

function ActionsV1({
  chainId,
  signer,
  active,
}: {
  chainId: UiContractsChain;
  signer: ethers.JsonRpcSigner | undefined;
  active: boolean;
}) {
  const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN");
  const vaultAddress = getContract(chainId, "Vault");
  const readerAddress = getContract(chainId, "Reader");

  const networkName = getChainName(chainId);

  const tokens = getV1Tokens(chainId);
  const whitelistedTokens = getWhitelistedV1Tokens(chainId);

  const whitelistedTokenAddresses = whitelistedTokens.map((token) => token.address);
  const tokenAddresses = tokens.map((token) => token.address);
  const { data: tokenBalances } = useSWR([active, chainId, readerAddress, "getTokenBalances", undefined], {
    fetcher: contractFetcher(signer, "Reader", [tokenAddresses]),
  });

  const { data: fundingRateInfo } = useSWR([active, chainId, readerAddress, "getFundingRates"], {
    fetcher: contractFetcher(signer, "Reader", [vaultAddress, nativeTokenAddress, whitelistedTokenAddresses]),
  });

  const { infoTokens } = useInfoTokens(signer, chainId, active, tokenBalances, fundingRateInfo);

  return (
    <div className="default-container page-layout">
      <div className="Actions-section">
        <div className="Actions-title">
          <PageTitle
            isTop
            title={t`GMX V1 Actions`}
            chainId={chainId}
            subtitle={
              <>
                <Trans>
                  GMX {versionName} {networkName} actions for all accounts.
                </Trans>
                <VersionNetworkSwitcherRow chainId={chainId} version={1} />
              </>
            }
          />
        </div>

        <TradeHistory
          infoTokens={infoTokens}
          getTokenInfo={getTokenInfo}
          chainId={chainId}
          nativeTokenAddress={nativeTokenAddress}
          shouldShowPaginationButtons
        />
      </div>
      <Footer />
    </div>
  );
}

export function usePositionsV1(
  chainId: UiContractsChain,
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
    fetcher: contractFetcher(signer, "Reader", [tokenAddresses]),
  });

  const { data: positionData } = useSWR([active, chainId, readerAddress, "getPositions", vaultAddress, account], {
    fetcher: contractFetcher(signer, "Reader", [
      positionQuery.collateralTokens,
      positionQuery.indexTokens,
      positionQuery.isLong,
    ]),
  });

  const { data: fundingRateInfo } = useSWR([active, chainId, readerAddress, "getFundingRates"], {
    fetcher: contractFetcher(signer, "Reader", [vaultAddress, nativeTokenAddress, whitelistedTokenAddresses]),
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
  chainId: UiContractsChain;
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
    fetcher: contractFetcher(signer, "Reader", [tokenAddresses]),
  });

  const { data: fundingRateInfo } = useSWR([active, chainId, readerAddress, "getFundingRates"], {
    fetcher: contractFetcher(signer, "Reader", [vaultAddress, nativeTokenAddress, whitelistedTokenAddresses]),
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
  chainId: UiContractsChain;
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
    fetcher: contractFetcher(signer, "Reader", [tokenAddresses]),
  });

  const { data: positionData } = useSWR([active, chainId, readerAddress, "getPositions", vaultAddress, account], {
    fetcher: contractFetcher(signer, "Reader", [
      positionQuery.collateralTokens,
      positionQuery.indexTokens,
      positionQuery.isLong,
    ]),
  });

  const { data: fundingRateInfo } = useSWR([active, chainId, readerAddress, "getFundingRates"], {
    fetcher: contractFetcher(signer, "Reader", [vaultAddress, nativeTokenAddress, whitelistedTokenAddresses]),
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
  chainId: UiContractsChain;
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
    fetcher: contractFetcher(signer, "Reader", [tokenAddresses]),
  });

  const { data: fundingRateInfo } = useSWR([active, chainId, readerAddress, "getFundingRates"], {
    fetcher: contractFetcher(signer, "Reader", [vaultAddress, nativeTokenAddress, whitelistedTokenAddresses]),
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
          shouldShowPaginationButtons
        />
      </div>
    </div>
  );
}
