import React from "react";
import cx from "classnames";
import "./Tab.scss";

type Option = string;

type Props = {
  options: Option[];
  option: Option;
  setOption?: (option: Option) => void;
  onChange?: (option: Option) => void;
  type?: "block" | "inline";
  className?: string;
  optionLabels?: Record<Option, string>;
  icons?: Record<Option, string>;
};

export default function Tab(props: Props) {
  const { options, option, setOption, onChange, type = "block", className, optionLabels, icons } = props;
  const onClick = (opt) => {
    if (setOption) {
      setOption(opt);
    }
    if (onChange) {
      onChange(opt);
    }
  };

  const isBlockTab = type === "block";
  return (
    <div className={cx("Tab", type, className)}>
      {options.map((opt) => {
        const label = optionLabels?.[opt] ?? opt;
        return (
          <div
            className={cx("Tab-option", { active: opt === option, muted: isBlockTab })}
            onClick={() => onClick(opt)}
            key={opt}
          >
            {icons && icons[opt] && <img className="Tab-option-icon" src={icons[opt]} alt={option} />}
            {isBlockTab ? label : <span className="muted">{label}</span>}
          </div>
        );
      })}
    </div>
  );
}
