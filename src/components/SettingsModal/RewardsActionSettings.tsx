import { t, Trans } from "@lingui/macro";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";

import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";

import { SettingLabelWithTooltip } from "./shared";

export function RewardsActionSettings() {
  const settings = useSettings();

  return (
    <ToggleSwitch
      isChecked={settings.rewardsOneClickActionEnabled}
      setIsChecked={settings.setRewardsOneClickActionEnabled}
    >
      <SettingLabelWithTooltip
        label={t`Preview one-click rewards action`}
        tooltip={
          <Trans>
            When enabled, the vesting button previews the planned action to claim rewards, stake the required GMX, and
            start vesting in one transaction. This is not supported yet. Turn this off to use the step-by-step flow.
          </Trans>
        }
      />
    </ToggleSwitch>
  );
}
