import { t } from "@lingui/macro";
import cx from "classnames";
import React, { useCallback, useState } from "react";
import { IoClose } from "react-icons/io5";
import { useMedia } from "react-use";

import { useOutsideClick } from "lib/useOutsideClick";

import Button from "components/Button/Button";

import CrossIconComponent from "img/cross.svg?react";
import SearchIconComponent from "img/search.svg?react";

type Props = {
  value: string;
  setValue: (value: string) => void;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  className?: string;
  placeholder?: string;
  size?: "s" | "m";
  /**
   * If not provided, will be set to false on small screens
   */
  autoFocus?: boolean;
  qa?: string;
  withClearButton?: boolean;
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
  withClearButton = false,
}: Props) {
  const isSmallerScreen = useMedia("(max-width: 700px)");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, [setIsFocused]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, [setIsFocused]);

  useOutsideClick(containerRef, handleBlur);

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

  const handleClick = useCallback(() => {
    inputRef.current?.focus();
  }, [inputRef]);

  return (
    <div className="flex h-32 gap-12">
      <div className={cx("relative flex grow cursor-pointer items-center p-0", className)} ref={containerRef}>
        <div className="absolute top-0 flex h-full items-center px-8">
          <SearchIconComponent
            height={18}
            width={18}
            onClick={handleClick}
            className={cx("relative p-2 text-slate-100")}
          />
        </div>
        <input
          ref={inputRef}
          data-qa={qa}
          type="text"
          placeholder={placeholder ?? t`Search Token`}
          value={value}
          onChange={handleChange}
          onKeyDown={onKeyDown}
          onFocus={handleFocus}
          autoFocus={autoFocus ?? !isSmallerScreen}
          className={cx("block w-full rounded-8 border bg-slate-800 leading-1 placeholder-slate-100", {
            "border-blue-300": isFocused,
            "border-slate-600": !isFocused,
            "p-8 pl-32 text-[13px]": size === "m",
            "py-[8.5px] pl-34 pr-30 text-14 ": size === "s",
          })}
        />
        {value && (
          <button
            className={cx("group absolute bottom-0 right-0 top-0 flex items-center", {
              "pr-8": size === "m",
              "pr-4": size === "s",
            })}
            onClick={handleClear}
          >
            <div
              className={cx(
                "rounded-4 p-4 text-slate-100",
                "group-hover:bg-[#50577e99] group-hover:text-slate-100 ",
                "group-active:bg-[#50577eb3] group-active:text-slate-100"
              )}
            >
              <CrossIconComponent
                className={cx("w-16", {
                  "text-slate-100": !isFocused,
                  "text-white": isFocused,
                })}
              />
            </div>
          </button>
        )}
      </div>
      {withClearButton ? (
        <Button variant="secondary" onClick={handleClear} className="!p-8">
          <IoClose size={16} />
        </Button>
      ) : null}
    </div>
  );
}
