import React from "react";
import { FiSearch } from "react-icons/fi";
import classnames from "classnames";

export default function TableFilterSearch({value, onInput, label, className = ""}) {
  return (
    <div className="input-wrapper">
      <input
        type="text"
        placeholder={label}
        className={classnames("leaderboard-search-input", "text-input", "input-small", className)}
        value={value}
        onInput={onInput}
      />
      <FiSearch className="input-logo" />
    </div>
  )
}
