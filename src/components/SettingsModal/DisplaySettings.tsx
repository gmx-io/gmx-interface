import { t, Trans } from "@lingui/macro";
import cx from "classnames";

import { DOCS_LINKS } from "config/links";
import { BuySellIconsMode, useSettings } from "context/SettingsContext/SettingsContextProvider";

import Button from "components/Button/Button";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { SelectorBase, useSelectorClose } from "components/SelectorBase/SelectorBase";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";

import CheckIcon from "img/ic_checked.svg?react";
import ChevronDownIcon from "img/ic_chevron_down.svg?react";

import { SettingLabelWithTooltip, SettingsSection } from "./shared";
import { ThemeSelector } from "./ThemeSelector";

function BuySellIconsOption({
  option,
  isSelected,
  onClick,
}: {
  option: { value: BuySellIconsMode; label: string };
  isSelected: boolean;
  onClick: () => void;
}) {
  const close = useSelectorClose();

  return (
    <div
      className={cx("flex cursor-pointer items-center justify-between px-14 py-8 hover:bg-fill-surfaceHover", {
        "bg-slate-700": isSelected,
      })}
      onClick={() => {
        onClick();
        close();
      }}
    >
      <div>{option.label}</div>
      {isSelected && (
        <div>
          <CheckIcon />
        </div>
      )}
    </div>
  );
}

export function DisplaySettings() {
  const settings = useSettings();

  const buySellIconsOptions: { value: BuySellIconsMode; label: string }[] = [
    { value: "all", label: t`All trades` },
    { value: "current", label: t`Current position only` },
    { value: "off", label: t`Off` },
  ];

  return (
    <div className="flex flex-col gap-16 font-medium">
      <SettingsSection>
        <div className="flex items-center gap-8">
          <ToggleSwitch isChecked={settings.isLeverageSliderEnabled} setIsChecked={settings.setIsLeverageSliderEnabled}>
            <SettingLabelWithTooltip
              label={t`Manual leverage`}
              position="top"
              tooltip={
                <div>
                  <Trans>
                    When on, leverage is set manually and determines margin and position size. When off, margin and size
                    are set freely, and leverage is derived.
                  </Trans>
                </div>
              }
            />
          </ToggleSwitch>
        </div>

        <div className="flex items-center gap-8">
          <ToggleSwitch isChecked={settings.showPnlAfterFees} setIsChecked={settings.setShowPnlAfterFees}>
            <SettingLabelWithTooltip
              label={t`Display net value and PnL after all fees`}
              position="top"
              tooltip={
                <div>
                  <Trans>Include all fees, including close fees, in net value and PnL display.</Trans>
                </div>
              }
            />
          </ToggleSwitch>
        </div>

        <ToggleSwitch isChecked={settings.isPnlInLeverage} setIsChecked={settings.setIsPnlInLeverage}>
          <Trans>Include PnL in leverage display</Trans>
        </ToggleSwitch>

        <ToggleSwitch isChecked={settings.shouldShowPositionLines} setIsChecked={settings.setShouldShowPositionLines}>
          <Trans>Show positions on chart</Trans>
        </ToggleSwitch>

        <div className="flex items-center justify-between gap-8">
          <SettingLabelWithTooltip
            label={t`Show buy/sell icons on chart`}
            position="top"
            tooltip={
              <div>
                <Trans>
                  Choose which buy/sell marks appear on the chart: all your past trades, only your current open
                  position, or none.
                </Trans>
              </div>
            }
          />
          <SelectorBase
            modalLabel={t`Show buy/sell icons on chart`}
            desktopPanelClassName="!z-[10000] w-[180px] !top-[10px]"
            chevronClassName="hidden"
            label={
              <Button variant="secondary" className="whitespace-nowrap">
                {buySellIconsOptions.find((o) => o.value === settings.buySellIconsMode)?.label}
                <ChevronDownIcon className="inline-block size-14" />
              </Button>
            }
          >
            <div className="flex flex-col">
              {buySellIconsOptions.map((opt) => (
                <BuySellIconsOption
                  key={opt.value}
                  option={opt}
                  isSelected={opt.value === settings.buySellIconsMode}
                  onClick={() => settings.setBuySellIconsMode(opt.value)}
                />
              ))}
            </div>
          </SelectorBase>
        </div>

        <div className="flex items-center gap-8">
          <ToggleSwitch
            isChecked={settings.breakdownNetPriceImpactEnabled}
            setIsChecked={settings.setBreakdownNetPriceImpactEnabled}
          >
            <SettingLabelWithTooltip
              label={t`Break down net price impact`}
              position="top"
              tooltip={
                <div>
                  <Trans>
                    Show detailed price impact breakdown: stored impact (increase orders) and close impact (decrease
                    orders) in execution details.{" "}
                    <ExternalLink href={DOCS_LINKS.priceImpact} newTab>
                      Read more
                    </ExternalLink>
                    .
                  </Trans>
                </div>
              }
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
