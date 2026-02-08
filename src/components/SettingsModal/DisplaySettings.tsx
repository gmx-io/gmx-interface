import { Trans } from "@lingui/macro";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";

import ExternalLink from "components/ExternalLink/ExternalLink";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import { SettingsSection } from "./shared";
import { ThemeSelector } from "./ThemeSelector";

export function DisplaySettings() {
  const settings = useSettings();

  return (
    <div className="flex flex-col gap-16 font-medium">
      <SettingsSection>
        <ToggleSwitch isChecked={settings.isLeverageSliderEnabled} setIsChecked={settings.setIsLeverageSliderEnabled}>
          <Trans>Show leverage slider</Trans>
        </ToggleSwitch>

        <ToggleSwitch isChecked={settings.showPnlAfterFees} setIsChecked={settings.setShowPnlAfterFees}>
          <Trans>Display PnL after fees</Trans>
        </ToggleSwitch>

        <ToggleSwitch isChecked={settings.isPnlInLeverage} setIsChecked={settings.setIsPnlInLeverage}>
          <Trans>Include PnL in leverage display</Trans>
        </ToggleSwitch>

        <ToggleSwitch isChecked={settings.shouldShowPositionLines} setIsChecked={settings.setShouldShowPositionLines}>
          <Trans>Show positions on chart</Trans>
        </ToggleSwitch>

        <div className="flex items-center gap-8">
          <ToggleSwitch
            isChecked={settings.breakdownNetPriceImpactEnabled}
            setIsChecked={settings.setBreakdownNetPriceImpactEnabled}
          >
            <TooltipWithPortal
              handle={<Trans>Break down net price impact</Trans>}
              position="top"
              variant="icon"
              renderContent={() => (
                <div>
                  <Trans>
                    Show detailed price impact breakdown: stored impact (increase orders) and close impact (decrease
                    orders) in tooltips and execution details.{" "}
                    <ExternalLink href="https://docs.gmx.io/docs/trading#price-impact-and-price-impact-rebates" newTab>
                      Read more
                    </ExternalLink>
                  </Trans>
                </div>
              )}
            />
          </ToggleSwitch>
        </div>
      </SettingsSection>
      <SettingsSection>
        <ThemeSelector />
      </SettingsSection>
    </div>
  );
}
