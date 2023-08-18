import React from "react";
import classnames from "classnames";
import "./index.css"

export default function TableFilterSearch({value, onInput, label, className = ""}) {
  return (
    <div className="filter-search">
      <input
        type="text"
        placeholder={ label }
        value={ value }
        onChange={ onInput }
        onKeyDown={ () => undefined }
        autoFocus={ false }
        className={ classnames("filter-search-input", className) }
      />
    </div>
  );
}
