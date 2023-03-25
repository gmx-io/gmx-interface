import React from "react";

import cx from "classnames";

import "./Tab.css";

export default function Tab(props) {
  const { options, option, setOption, onChange, type = "block", className, optionLabels, icons } = props;
  const onClick = (opt) => {
    if (setOption) {
      setOption(opt);
    }
    if (onChange) {
      onChange(opt);
    }
  };

  return (
    <div className={cx("Tab", type, className)}>
      {options.map((opt) => {
        const label = optionLabels && optionLabels[opt] ? optionLabels[opt] : opt;
        return (
          <div
            className={cx("Tab-option", { active: opt === option, muted: type === "block" })}
            onClick={() => onClick(opt)}
            key={opt}
          >
            {icons && icons[opt] && <img className="Tab-option-icon" src={icons[opt]} alt={option} />}
            {type === "inline" ? <span className="muted">{label}</span> : label}
          </div>
        );
      })}
    </div>
  );
}
