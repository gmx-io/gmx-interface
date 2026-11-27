import { Trans } from "@lingui/macro";
import { Link } from "react-router-dom";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";

import { AbFlagSettings } from "components/AbFlagsSettings/AbFlagsSettings";
import { DebugSwapsSettings } from "components/DebugSwapsSettings/DebugSwapsSettings";
import { MetricsDebugSettings } from "components/MetricsDebugSettings/MetricsDebugSettings";
import { NotificationsDebugSettings } from "components/NotificationsDebugSettings/NotificationsDebugSettings";
import TenderlySettings from "components/TenderlySettings/TenderlySettings";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";

import { RpcDebugSettings } from "./RpcDebugSettings";
import { SettingsSection } from "./shared";

interface DebugSettingsProps {
  isSettingsVisible: boolean;
}

export function DebugSettings({ isSettingsVisible }: DebugSettingsProps) {
  const settings = useSettings();

  return (
    <div className="font-medium">
      <SettingsSection className="gap-16">
        <ToggleSwitch isChecked={settings.showDebugValues} setIsChecked={settings.setShowDebugValues}>
          <Trans>Show debug values</Trans>
        </ToggleSwitch>

        <ToggleSwitch
          isChecked={settings.isErrorBoundaryDebugEnabled}
          setIsChecked={settings.setIsErrorBoundaryDebugEnabled}
        >
          <Trans>Show error boundary debug trigger</Trans>
        </ToggleSwitch>

        <ToggleSwitch
          isChecked={settings.shouldDisableValidationForTesting}
          setIsChecked={settings.setShouldDisableValidationForTesting}
        >
          <Trans>Disable validation for testing</Trans>
        </ToggleSwitch>

        <ToggleSwitch
          isChecked={settings.shouldDisableShareModalPnlCheck}
          setIsChecked={settings.setShouldDisableShareModalPnlCheck}
        >
          <Trans>Disable share modal PnL check</Trans>
        </ToggleSwitch>

        <ToggleSwitch
          isChecked={settings.isTokenPermitsQaOverrideEnabled}
          setIsChecked={settings.setIsTokenPermitsQaOverrideEnabled}
        >
          <Trans>Enable token permits regardless of UI flags</Trans>
        </ToggleSwitch>

        <ToggleSwitch
          isChecked={settings.isWalletBatchingQaOverrideEnabled}
          setIsChecked={settings.setIsWalletBatchingQaOverrideEnabled}
        >
          <Trans>Enable wallet batching regardless of UI flags</Trans>
        </ToggleSwitch>

        <div>
          <div className="mb-8">
            <Trans>Force markets closed</Trans>
          </div>
          <input
            value={settings.debugClosedMarkets ?? ""}
            onChange={(e) => settings.setDebugClosedMarkets(e.target.value)}
            placeholder="GOLD, SILVER"
            className="w-full rounded-4 border border-slate-600 px-11 py-8 text-14"
          />
          <div className="mt-8 text-12 text-typography-secondary">
            <Trans>Index token symbols, comma-separated. These markets show as closed.</Trans>
          </div>
        </div>

        <AbFlagSettings />

        <DebugSwapsSettings />

        <MetricsDebugSettings />

        <RpcDebugSettings />

        <TenderlySettings isSettingsVisible={isSettingsVisible} />

        <NotificationsDebugSettings />
      </SettingsSection>
      <SettingsSection className="mt-16 gap-16">
        <div className="text-14 font-medium text-typography-primary">
          <Trans>Links</Trans>
        </div>
        <Link
          to="/monitor"
          className="link-underline text-12 text-typography-secondary hover:text-blue-300"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <Trans>Markets monitoring</Trans>
        </Link>
        <Link
          to="/rpc-debug"
          className="link-underline text-12 text-typography-secondary hover:text-blue-300"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <Trans>RPC monitoring</Trans>
        </Link>
        <Link
          to="/oracle-keeper-debug"
          className="link-underline text-12 text-typography-secondary hover:text-blue-300"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <Trans>Oracle keeper monitoring</Trans>
        </Link>
        <Link
          to="/permits"
          className="link-underline text-12 text-typography-secondary hover:text-blue-300"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <Trans>Permits testing</Trans>
        </Link>
      </SettingsSection>
    </div>
  );
}
