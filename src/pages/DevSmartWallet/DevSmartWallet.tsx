import { t, Trans } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useCallback, useEffect, useState } from "react";
import { type Address, getAddress, isAddress } from "viem";

import { ARBITRUM_SEPOLIA, getChainName } from "config/chains";
import { helperToast } from "lib/helperToast";
import { switchNetwork } from "lib/wallets";
import useWallet from "lib/wallets/useWallet";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import Button from "components/Button/Button";
import ConnectWalletButton from "components/ConnectWalletButton/ConnectWalletButton";

import { DevSmartWalletDeployTab } from "./DevSmartWalletDeployTab";
import { DevSmartWalletMainTab } from "./DevSmartWalletMainTab";
import {
  type DeploySupportedChainId,
  type DevSmartWalletTab,
  type SavedSmartWalletProfile,
  DEV_SMART_WALLET_PROVIDER_CHAIN_LS_KEY,
  DEV_SMART_WALLET_PROVIDER_SAFE_LS_KEY,
  DEV_SMART_WALLET_SAVED_PROFILES_LS_KEY,
  DEV_SMART_WALLET_TAB_LABELS,
  DEV_SMART_WALLET_TABS,
  formatLogLine,
  getErrorMessage,
  isSameAddress,
  parseSavedSmartWalletProfiles,
  parseSupportedChainId,
  SAFE_TARGET_VERSION,
} from "./devSmartWalletShared";
import { DevSmartWalletSignatureTab } from "./DevSmartWalletSignatureTab";
import { DevSmartWalletTopUpTab } from "./DevSmartWalletTopUpTab";

export default function DevSmartWallet() {
  const { openConnectModal } = useConnectModal();
  const { account, active, chainId: walletChainId } = useWallet();

  // ---- Tab ----
  const [activeTab, setActiveTab] = useState<DevSmartWalletTab>("main");

  // ---- Cross-tab shared state ----
  const [deployChainId, setDeployChainId] = useState<DeploySupportedChainId>(ARBITRUM_SEPOLIA);
  const [ownersInput, setOwnersInput] = useState("");
  const [providerSafeAddressInput, setProviderSafeAddressInput] = useState(() => {
    try {
      return localStorage.getItem(DEV_SMART_WALLET_PROVIDER_SAFE_LS_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [providerChainId, setProviderChainId] = useState<DeploySupportedChainId>(() => {
    try {
      return parseSupportedChainId(localStorage.getItem(DEV_SMART_WALLET_PROVIDER_CHAIN_LS_KEY)) ?? ARBITRUM_SEPOLIA;
    } catch {
      return ARBITRUM_SEPOLIA;
    }
  });
  const [validatorSafeAddressInput, setValidatorSafeAddressInput] = useState("");
  const [savedWalletProfiles, setSavedWalletProfiles] = useState<SavedSmartWalletProfile[]>(() => {
    try {
      return parseSavedSmartWalletProfiles(localStorage.getItem(DEV_SMART_WALLET_SAVED_PROFILES_LS_KEY));
    } catch {
      return [];
    }
  });
  const [activityLog, setActivityLog] = useState<string[]>([]);
  const [walletKitStatus, setWalletKitStatus] = useState("Initializing WalletConnect wallet...");
  const [walletKitInitError, setWalletKitInitError] = useState<string | undefined>();
  const [lastCreatedSafeAddress, setLastCreatedSafeAddress] = useState<Address | undefined>();
  const [lastCreatedSafeChainId, setLastCreatedSafeChainId] = useState<DeploySupportedChainId | undefined>();

  const providerSafeAddress = isAddress(providerSafeAddressInput) ? getAddress(providerSafeAddressInput) : undefined;
  const validatorSafeAddress = isAddress(validatorSafeAddressInput) ? getAddress(validatorSafeAddressInput) : undefined;

  // ---- Persist provider config to localStorage ----
  useEffect(() => {
    try {
      if (providerSafeAddressInput.trim()) {
        localStorage.setItem(DEV_SMART_WALLET_PROVIDER_SAFE_LS_KEY, providerSafeAddressInput.trim());
      } else {
        localStorage.removeItem(DEV_SMART_WALLET_PROVIDER_SAFE_LS_KEY);
      }
    } catch {
      // Ignore localStorage failures in restrictive browser contexts.
    }
  }, [providerSafeAddressInput]);

  useEffect(() => {
    try {
      localStorage.setItem(DEV_SMART_WALLET_PROVIDER_CHAIN_LS_KEY, String(providerChainId));
    } catch {
      // Ignore localStorage failures in restrictive browser contexts.
    }
  }, [providerChainId]);

  useEffect(() => {
    try {
      localStorage.setItem(DEV_SMART_WALLET_SAVED_PROFILES_LS_KEY, JSON.stringify(savedWalletProfiles));
    } catch {
      // Ignore localStorage failures in restrictive browser contexts.
    }
  }, [savedWalletProfiles]);

  // ---- Auto-fill cross-tab fields ----
  useEffect(() => {
    if (lastCreatedSafeAddress && providerSafeAddressInput.trim() === "") {
      setProviderSafeAddressInput(lastCreatedSafeAddress);
    }
  }, [providerSafeAddressInput, lastCreatedSafeAddress]);

  useEffect(() => {
    if (!validatorSafeAddressInput.trim() && providerSafeAddressInput.trim()) {
      setValidatorSafeAddressInput(providerSafeAddressInput.trim());
    }
  }, [providerSafeAddressInput, validatorSafeAddressInput]);

  useEffect(() => {
    if (!isAddress(providerSafeAddressInput)) return;
    const normalizedProviderSafeAddress = getAddress(providerSafeAddressInput);
    const matchingProfiles = savedWalletProfiles.filter((profile) =>
      isSameAddress(profile.safeAddress, normalizedProviderSafeAddress)
    );
    if (matchingProfiles.length === 1 && matchingProfiles[0].chainId !== providerChainId) {
      setProviderChainId(matchingProfiles[0].chainId);
    }
  }, [providerChainId, providerSafeAddressInput, savedWalletProfiles]);

  // ---- Shared callbacks ----
  const pushActivity = useCallback((message: string) => {
    setActivityLog((prev) => [formatLogLine(message), ...prev].slice(0, 30));
  }, []);

  function upsertSavedWalletProfile(input: {
    safeAddress: Address;
    chainId: DeploySupportedChainId;
    owners: Address[];
  }) {
    const safeAddressNormalized = getAddress(input.safeAddress);
    const owners = input.owners.map((owner) => getAddress(owner));
    const now = Date.now();
    setSavedWalletProfiles((prev) => {
      const next = [...prev];
      const index = next.findIndex(
        (profile) => profile.chainId === input.chainId && isSameAddress(profile.safeAddress, safeAddressNormalized)
      );
      if (index >= 0) {
        const prevProfile = next[index];
        next[index] = { ...prevProfile, owners: owners.length > 0 ? owners : prevProfile.owners, updatedAt: now };
      } else {
        next.unshift({
          safeAddress: safeAddressNormalized,
          chainId: input.chainId,
          owners,
          createdAt: now,
          updatedAt: now,
        });
      }
      return next.sort((a, b) => b.updatedAt - a.updatedAt);
    });
  }

  function removeSavedWalletProfile(profile: SavedSmartWalletProfile) {
    setSavedWalletProfiles((prev) =>
      prev.filter((item) => !(item.chainId === profile.chainId && isSameAddress(item.safeAddress, profile.safeAddress)))
    );
  }

  async function handleSwitchNetwork() {
    try {
      await switchNetwork(deployChainId, Boolean(active));
    } catch (error) {
      helperToast.error(t`Failed to switch network: ${getErrorMessage(error)}`);
    }
  }

  function handleSafeCreated(address: Address, chainId: DeploySupportedChainId) {
    setLastCreatedSafeAddress(address);
    setLastCreatedSafeChainId(chainId);
  }

  return (
    <AppPageLayout title="Dev Smart Wallet">
      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-16">
        {/* ---- Header ---- */}
        <div className="rounded-8 border-1/2 border-slate-600 bg-slate-950/50 p-16">
          <h1 className="text-24 font-medium">
            <Trans>Dev Smart Wallet (Safe)</Trans>
          </h1>
          <p className="mt-8 text-13 text-typography-secondary">
            <Trans>
              Use this page as a Safe deployer and a WalletConnect wallet-provider MVP. Keep /trade open in another
              browser tab/window and pair it here by pasting the WalletConnect URI.
            </Trans>
          </p>

          <div className="mt-12 flex flex-wrap items-center gap-8 text-13">
            <div className="rounded-8 border border-slate-700 px-10 py-6">
              <Trans>Deploy chain</Trans>: {getChainName(deployChainId)} ({deployChainId})
            </div>
            <div className="rounded-8 border border-slate-700 px-10 py-6">
              <Trans>WC chain</Trans>: {getChainName(providerChainId)} ({providerChainId})
            </div>
            <div className="rounded-8 border border-slate-700 px-10 py-6">
              <Trans>Owner wallet</Trans>: {active && account ? account : t`Not connected`}
            </div>
            <div className="rounded-8 border border-slate-700 px-10 py-6">
              <Trans>Owner chain</Trans>: {walletChainId ?? t`-`}
            </div>
            <div className="rounded-8 border border-slate-700 px-10 py-6">
              <Trans>WC Wallet status</Trans>: {walletKitStatus}
            </div>
            <div className="rounded-8 border border-slate-700 px-10 py-6">
              <Trans>Safe version</Trans>: {SAFE_TARGET_VERSION}
            </div>
          </div>

          <div className="mt-12 flex flex-wrap gap-8">
            {!active ? (
              <ConnectWalletButton onClick={() => openConnectModal?.()}>
                <Trans>Connect owner wallet</Trans>
              </ConnectWalletButton>
            ) : null}
            <Button variant="secondary" onClick={handleSwitchNetwork}>
              <Trans>Switch owner to deploy chain</Trans>
            </Button>
          </div>

          {walletKitInitError && (
            <div className="text-red-200 mt-12 rounded-8 border border-red-500/40 bg-red-500/10 p-12 text-13">
              {walletKitInitError}
            </div>
          )}
        </div>

        {/* ---- Tab bar ---- */}
        <div className="flex gap-2 rounded-8 border-1/2 border-slate-600 bg-slate-950/50 p-4">
          {DEV_SMART_WALLET_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-6 px-16 py-8 text-14 font-medium transition-colors ${
                activeTab === tab
                  ? "bg-blue-500 text-white"
                  : "text-typography-secondary hover:bg-slate-800 hover:text-typography-primary"
              }`}
            >
              {DEV_SMART_WALLET_TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        {/* ---- Tab content ---- */}
        {activeTab === "main" && (
          <DevSmartWalletMainTab
            providerSafeAddressInput={providerSafeAddressInput}
            setProviderSafeAddressInput={setProviderSafeAddressInput}
            providerChainId={providerChainId}
            setProviderChainId={setProviderChainId}
            providerSafeAddress={providerSafeAddress}
            savedWalletProfiles={savedWalletProfiles}
            upsertSavedWalletProfile={upsertSavedWalletProfile}
            removeSavedWalletProfile={removeSavedWalletProfile}
            lastCreatedSafeAddress={lastCreatedSafeAddress}
            lastCreatedSafeChainId={lastCreatedSafeChainId}
            setValidatorSafeAddressInput={setValidatorSafeAddressInput}
            setDeployChainId={setDeployChainId}
            setOwnersInput={setOwnersInput}
            pushActivity={pushActivity}
            activityLog={activityLog}
            onWalletKitStatusChange={setWalletKitStatus}
            onWalletKitInitErrorChange={setWalletKitInitError}
          />
        )}

        {activeTab === "deploy" && (
          <DevSmartWalletDeployTab
            deployChainId={deployChainId}
            setDeployChainId={setDeployChainId}
            ownersInput={ownersInput}
            setOwnersInput={setOwnersInput}
            pushActivity={pushActivity}
            upsertSavedWalletProfile={upsertSavedWalletProfile}
            onSafeCreated={handleSafeCreated}
          />
        )}

        {activeTab === "signature" && (
          <DevSmartWalletSignatureTab
            validatorSafeAddressInput={validatorSafeAddressInput}
            setValidatorSafeAddressInput={setValidatorSafeAddressInput}
            validatorSafeAddress={validatorSafeAddress}
            providerSafeAddressInput={providerSafeAddressInput}
            pushActivity={pushActivity}
          />
        )}

        {activeTab === "topup" && (
          <DevSmartWalletTopUpTab providerSafeAddressInput={providerSafeAddressInput} pushActivity={pushActivity} />
        )}
      </div>
    </AppPageLayout>
  );
}
