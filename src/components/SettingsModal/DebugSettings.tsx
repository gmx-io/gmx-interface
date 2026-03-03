import { Trans } from "@lingui/macro";
import { Link } from "react-router-dom";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";

import { AbFlagSettings } from "components/AbFlagsSettings/AbFlagsSettings";
import { DebugSwapsSettings } from "components/DebugSwapsSettings/DebugSwapsSettings";
import { MetricsDebugSettings } from "components/MetricsDebugSettings/MetricsDebugSettings";
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

        <AbFlagSettings />

        <DebugSwapsSettings />

        <MetricsDebugSettings />

        <RpcDebugSettings />

        <TenderlySettings isSettingsVisible={isSettingsVisible} />
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
