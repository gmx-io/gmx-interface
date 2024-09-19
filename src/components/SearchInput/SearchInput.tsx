import { t } from "@lingui/macro";
import cx from "classnames";
import React, { useCallback } from "react";
import { useMedia } from "react-use";

import CrossIconComponent from "img/cross.svg?react";
import searchIcon from "img/search.svg";

type Props = {
  value: string;
  setValue: (value: string) => void;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  className?: string;
  placeholder?: string;
  size?: "s" | "m";
  /**
   * If not provided, will be set to true on small screens
   */
  autoFocus?: boolean;
  qa?: string;
};

const STYLE = {
  backgroundImage: `url(${searchIcon})`,
};

export default function SearchInput({
  value,
  setValue,
  onKeyDown,
  className,
  placeholder,
  autoFocus,
  size = "m",
  qa = "token-search-input",
}: Props) {
  const isSmallerScreen = useMedia("(max-width: 700px)");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value);
    },
    [setValue]
  );

  const handleClear = useCallback(() => {
    setValue("");
    inputRef.current?.focus();
  }, [setValue]);

  return (
    <div className={cx("relative cursor-pointer rounded-4 border border-gray-800 p-0", className)}>
      <input
        ref={inputRef}
        data-qa={qa}
        type="text"
        placeholder={placeholder ?? t`Search Token`}
        value={value}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        autoFocus={autoFocus ?? !isSmallerScreen}
        className={cx("placeholder-slate-100 block w-full bg-scroll bg-[12px_center] bg-no-repeat", {
          "bg-[length:20px_20px] py-10 pl-40 pr-10 text-16": size === "m",
          "bg-[length:15px] py-[8.5px] pl-34 pr-10 text-14 ": size === "s",
        })}
        style={STYLE}
      />
      <button
        className={cx("group absolute bottom-0 right-0 top-0 flex items-center", {
          "pr-8": size === "m",
          "pr-4": size === "s",
        })}
        onClick={handleClear}
      >
        <div
          className={cx(
            "rounded-4 p-4 text-slate-500",
            "group-hover:bg-[#50577e99] group-hover:text-slate-100 group-focus:bg-[#50577e99] group-focus:text-slate-100",
            "group-active:bg-[#50577eb3] group-active:text-gray-300"
          )}
        >
          <CrossIconComponent className="w-16" />
        </div>
      </button>
    </div>
  );
}
