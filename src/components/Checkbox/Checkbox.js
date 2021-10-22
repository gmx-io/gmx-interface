import React from 'react'

import './Checkbox.css';
import { ImCheckboxUnchecked, ImCheckboxChecked } from 'react-icons/im'

export default function Checkbox(props) {
  const { isChecked, setIsChecked } = props

  return (
    <div className="Checkbox clickable" onClick={() => setIsChecked(!isChecked)}>
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
