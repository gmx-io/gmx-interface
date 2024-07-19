import cx from "classnames";
import { ReactNode } from "react";

import "./Tab.css";

type Props = {
  options: (string | number)[];
  option: string | number | undefined;
  setOption?: (option: any) => void;
  onChange?: (option: any) => void;
  type?: "block" | "inline";
  className?: string;
  optionLabels?: Record<string | number, ReactNode> | string[];
  icons?: Record<string, string>;
  qa?: string;
};

export default function Tab(props: Props) {
  const { options, option, setOption, onChange, type = "block", className, optionLabels, icons, qa } = props;
  const onClick = (opt) => {
    if (setOption) {
      setOption(opt);
    }
    if (onChange) {
      onChange(opt);
    }
  };

  return (
    <div data-qa={qa} className={cx("Tab", `Tab__${type}`, className)}>
      {options.map((opt) => {
        const label = optionLabels && optionLabels[opt] ? optionLabels[opt] : opt;
        return (
          <div
            data-qa={`${qa}-tab-${opt}`}
            className={cx("Tab-option", "muted", { active: opt === option })}
            onClick={() => onClick(opt)}
            key={opt}
          >
            {icons && icons[opt] && <img className="Tab-option-icon inline" src={icons[opt]} alt={String(option)} />}
            {label}
          </div>
        );
      })}
    </div>
  );
}
