import { Trans } from "@lingui/macro";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";

import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";

import { SettingsSection } from "./shared";
import { ThemeSelector } from "./ThemeSelector";

export function DisplaySettings() {
  const settings = useSettings();

  return (
    <div className="flex flex-col gap-16 font-medium">
      <SettingsSection>
        <ToggleSwitch isChecked={settings.isLeverageSliderEnabled} setIsChecked={settings.setIsLeverageSliderEnabled}>
          <Trans>Show Leverage Slider</Trans>
        </ToggleSwitch>

        <ToggleSwitch isChecked={settings.showPnlAfterFees} setIsChecked={settings.setShowPnlAfterFees}>
          <Trans>Display PnL After Fees</Trans>
        </ToggleSwitch>

        <ToggleSwitch isChecked={settings.isPnlInLeverage} setIsChecked={settings.setIsPnlInLeverage}>
          <Trans>Include PnL In Leverage Display</Trans>
        </ToggleSwitch>
      </SettingsSection>
      <SettingsSection>
        <ThemeSelector />
      </SettingsSection>
    </div>
  );
}
