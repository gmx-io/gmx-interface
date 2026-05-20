import { t, Trans } from "@lingui/macro";
import cx from "classnames";

import { DOCS_LINKS } from "config/links";
import { BuySellIconsMode, useSettings } from "context/SettingsContext/SettingsContextProvider";

import Button from "components/Button/Button";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { SelectorBase, useSelectorClose } from "components/SelectorBase/SelectorBase";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import CheckIcon from "img/ic_checked.svg?react";
import ChevronDownIcon from "img/ic_chevron_down.svg?react";

import { SettingsSection } from "./shared";
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
    { value: "off", label: t`None` },
    { value: "current", label: t`Current` },
    { value: "all", label: t`All` },
  ];

  return (
    <div className="flex flex-col gap-16 font-medium">
      <SettingsSection>
        <div className="flex items-center gap-8">
          <ToggleSwitch isChecked={settings.isLeverageSliderEnabled} setIsChecked={settings.setIsLeverageSliderEnabled}>
            <TooltipWithPortal
              handle={<Trans>Manual leverage</Trans>}
              position="top"
              variant="icon"
              content={
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
            <TooltipWithPortal
              handle={<Trans>Display net value and PnL after all fees</Trans>}
              position="top"
              variant="icon"
              content={
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

        <SelectorBase
          modalLabel={t`Show buy/sell icons on chart`}
          desktopPanelClassName="!z-[10000] w-[180px] !top-[10px]"
          chevronClassName="hidden"
          label={
            <div className="flex w-full items-center justify-between">
              <div>
                <Trans>Show buy/sell icons on chart</Trans>
              </div>
              <Button variant="secondary">
                {buySellIconsOptions.find((o) => o.value === settings.buySellIconsMode)?.label}
                <ChevronDownIcon className="inline-block size-14" />
              </Button>
            </div>
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

        <div className="flex items-center gap-8">
          <ToggleSwitch
            isChecked={settings.breakdownNetPriceImpactEnabled}
            setIsChecked={settings.setBreakdownNetPriceImpactEnabled}
          >
            <TooltipWithPortal
              handle={<Trans>Break down net price impact</Trans>}
              position="top"
              variant="icon"
              content={
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
