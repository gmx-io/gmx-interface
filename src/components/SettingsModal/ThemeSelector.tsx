import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { useCallback } from "react";

import { useTheme } from "context/ThemeContext/ThemeContext";

import Button from "components/Button/Button";
import { SelectorBase, useSelectorClose } from "components/SelectorBase/SelectorBase";

import CheckIcon from "img/ic_checked.svg?react";
import ChevronDownIcon from "img/ic_chevron_down.svg?react";

function ThemeOption({
  option,
  isSelected,
  onClick,
}: {
  option: { value: string; label: string };
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

export function ThemeSelector() {
  const { themeMode, setThemeMode } = useTheme();

  const themes = [
    { value: "system", label: t`System` },
    { value: "dark", label: t`Dark` },
    { value: "light", label: t`Light` },
  ];

  const currentTheme = themes.find((t) => t.value === themeMode);

  const onSelectTheme = useCallback(
    (value: string) => {
      setThemeMode(value as "dark" | "light" | "system");
    },
    [setThemeMode]
  );

  return (
    <SelectorBase
      modalLabel={t`Theme`}
      desktopPanelClassName="!z-[10000] w-[140px] !top-[10px]"
      chevronClassName="hidden"
      label={
        <div className="flex w-full items-center justify-between">
          <div className="text-typography-secondary">
            <Trans>Theme</Trans>
          </div>
          <Button variant="secondary">
            {currentTheme?.label}
            <ChevronDownIcon className="inline-block size-12" />
          </Button>
        </div>
      }
    >
      <div className="flex flex-col">
        {themes.map((themeOption) => (
          <ThemeOption
            key={themeOption.value}
            option={themeOption}
            isSelected={themeOption.value === themeMode}
            onClick={() => onSelectTheme(themeOption.value)}
          />
        ))}
      </div>
    </SelectorBase>
  );
}
