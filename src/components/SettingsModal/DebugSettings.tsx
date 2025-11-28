import { Trans } from "@lingui/macro";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";

import { AbFlagSettings } from "components/AbFlagsSettings/AbFlagsSettings";
import { DebugSwapsSettings } from "components/DebugSwapsSettings/DebugSwapsSettings";
import { MetricsDebugSettings } from "components/MetricsDebugSettings/MetricsDebugSettings";
import TenderlySettings from "components/TenderlySettings/TenderlySettings";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";

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
          <Trans>Show Debug Values</Trans>
        </ToggleSwitch>

        <ToggleSwitch
          isChecked={settings.shouldDisableValidationForTesting}
          setIsChecked={settings.setShouldDisableValidationForTesting}
        >
          <Trans>Disable Validation for Testing</Trans>
        </ToggleSwitch>

        <ToggleSwitch
          isChecked={settings.shouldDisableShareModalPnlCheck}
          setIsChecked={settings.setShouldDisableShareModalPnlCheck}
        >
          <Trans>Disable Share Modal PnL Check</Trans>
        </ToggleSwitch>

        <AbFlagSettings />

        <DebugSwapsSettings />

        <MetricsDebugSettings />

        <TenderlySettings isSettingsVisible={isSettingsVisible} />
      </SettingsSection>
    </div>
  );
}
