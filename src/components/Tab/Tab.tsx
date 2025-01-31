import cx from "classnames";
import { ReactNode } from "react";

import "./Tab.css";

type Props = {
  options: (string | number)[];
  option: string | number | undefined;
  setOption?: (option: any) => void;
  onChange?: (option: any) => void;
  size?: "l" | "m";
  type?: "block" | "inline";
  className?: string;
  optionLabels?: Record<string | number, ReactNode> | string[];
  optionClassnames?: Record<
    string | number,
    {
      active?: string;
      regular?: string;
    }
  >;
  commonOptionClassname?: string;
  icons?: Record<string, ReactNode>;
  qa?: string;
};

export default function Tab(props: Props) {
  const {
    options,
    option,
    setOption,
    onChange,
    type = "block",
    className,
    optionLabels,
    icons,
    qa,
    size = "m",
    commonOptionClassname,
  } = props;
  const onClick = (opt) => {
    if (setOption) {
      setOption(opt);
    }
    if (onChange) {
      onChange(opt);
    }
  };

  return (
    <div data-qa={qa} className={cx("Tab", `Tab__${type}`, `Tab__${size}`, className)}>
      {options.map((opt) => {
        const className = props.optionClassnames && props.optionClassnames[opt];
        const label = optionLabels && optionLabels[opt] ? optionLabels[opt] : opt;

        const optionClassName = opt === option ? className?.active : className?.regular;
        return (
          <div
            className={cx("Tab-option flex items-center justify-center gap-8", commonOptionClassname, optionClassName, {
              active: opt === option,
            })}
            onClick={() => onClick(opt)}
            key={opt}
            data-qa={`${qa}-tab-${opt}`}
          >
            {icons && icons[opt] && <span className="mt-2 scale-75">{icons[opt]}</span>}
            {label}
          </div>
        );
      })}
    </div>
  );
}
