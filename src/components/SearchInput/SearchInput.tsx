import React, { FormEvent } from "react";
import "./SearchInput.scss";
import { t } from "@lingui/macro";
import searchIcon from "img/search.svg";
import { useMedia } from "react-use";
import cx from "classnames";

type Props = {
  value: string;
  setValue: (e: any) => void;
  onKeyDown: (e: any) => void;
  onInput?: (e: FormEvent<HTMLInputElement>) => void;
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
};

export default function SearchInput({
  value,
  setValue,
  onKeyDown,
  onInput,
  className,
  placeholder,
  autoFocus,
}: Props) {
  const isSmallerScreen = useMedia("(max-width: 700px)");
  const classNames = cx("Search-input", className);
  return (
    <div className={classNames}>
      <input
        type="text"
        placeholder={placeholder ?? t`Search Token`}
        value={value}
        onChange={setValue}
        onKeyDown={onKeyDown}
        onInput={onInput}
        autoFocus={typeof autoFocus === "boolean" ? autoFocus : !isSmallerScreen}
        className="Tokenselector-search-input"
        style={{
          backgroundImage: `url(${searchIcon})`,
        }}
      />
    </div>
  );
}
