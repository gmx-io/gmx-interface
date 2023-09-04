import React from "react";
import classnames from "classnames";
import "./index.css"

type Props = {
  value?: string;
  onInput?: (value: string) => void;
  label?: string;
  className?: string;
};

export default function TableFilterSearch({value, onInput = () => {}, label, className = ""}: Props = {}) {
  return (
    <div className="filter-search">
      <input
        type="text"
        placeholder={ label }
        value={ value }
        onChange={ (e) => onInput(e.target.value) }
        onPaste={ (e) => onInput((e.target as HTMLInputElement).value) }
        onKeyDown={ () => undefined }
        autoFocus={ false }
        className={ classnames("filter-search-input", className) }
      />
    </div>
  );
}
