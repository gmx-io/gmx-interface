import React from 'react'

import cx from "classnames";

import './Checkbox.css';
import { ImCheckboxUnchecked, ImCheckboxChecked } from 'react-icons/im'

export default function Checkbox(props) {
  const { isChecked, setIsChecked, disabled } = props

  return (
    <div className={cx("Checkbox", { disabled })} onClick={() => setIsChecked(!isChecked)}>
      <span className="Checkbox-icon-wrapper">
        {isChecked && <ImCheckboxChecked className="App-icon Checkbox-icon active" />}
        {!isChecked && <ImCheckboxUnchecked className="App-icon Checkbox-icon inactive" />}
      </span>
      <span className="Checkbox-label">
        {props.children}
      </span>
    </div>
  )
}
