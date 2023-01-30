import React from "react";
import { motion, AnimateSharedLayout } from "framer-motion";
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
      <AnimateSharedLayout>
        {options.map((opt) => {
          const label = optionLabels && optionLabels[opt] ? optionLabels[opt] : opt;
          return (
            <div
              className={cx("Tab-option", "muted", { active: opt === option })}
              onClick={() => onClick(opt)}
              key={opt}
            >
              {type === "block" && opt === option && (
                <motion.div
                  className="Tab-block-slide"
                  layoutId="block-slide"
                  animate={{ backgroundColor: "rgba(180, 187, 255, 0.2)" }}
                  transition={{ duration: 0.25 }}
                />
              )}
              {icons && icons[opt] && <img className="Tab-option-icon" src={icons[opt]} alt={option} />}
              {label}
              {type === "inline" && opt === option && (
                <motion.div className="Tab-inline-slide" layoutId="inline-slide" />
              )}
            </div>
          );
        })}
      </AnimateSharedLayout>
    </div>
  );
}
