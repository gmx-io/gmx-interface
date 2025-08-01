import { Trans } from "@lingui/macro";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";

import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";

import { SettingsSection } from "./shared";

export function DisplaySettings() {
  const settings = useSettings();

  return (
    <div className="mt-16">
      <SettingsSection className="gap-16">
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
    </div>
  );
}
