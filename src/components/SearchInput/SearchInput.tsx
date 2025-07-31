import { t } from "@lingui/macro";
import cx from "classnames";
import React, { useCallback, useState } from "react";
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
    <div className="flex gap-12">
      <div className={cx("relative flex h-32 grow cursor-pointer items-center p-0", className)} ref={containerRef}>
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
          placeholder={placeholder ?? t`Search`}
          value={value}
          onChange={handleChange}
          onKeyDown={onKeyDown}
          onFocus={handleFocus}
          autoFocus={autoFocus ?? !isSmallerScreen}
          className={cx("block w-full rounded-8 border bg-slate-800 leading-1 placeholder-slate-100", {
            "border-blue-300": isFocused,
            "border-slate-800": !isFocused,
            "p-8 pl-32 text-[13px]": size === "m",
            "py-[8.5px] pl-34 pr-30 text-14 ": size === "s",
          })}
        />
        {value && (
          <Button
            onClick={handleClear}
            variant="ghost"
            className="!absolute right-8 top-[50%] !h-24 !min-h-0 !w-24 -translate-y-1/2 !p-0"
          >
            <CrossIconComponent
              className={cx("w-16", {
                "text-slate-100": !isFocused,
                "text-white": isFocused,
              })}
            />
          </Button>
        )}
      </div>
    </div>
  );
}
