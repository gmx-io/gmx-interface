import React from 'react'

import './Checkbox.css';
import { ImCheckboxUnchecked, ImCheckboxChecked } from 'react-icons/im'

export default function Checkbox(props) {
  const { isChecked, setIsChecked } = props

  return (
    <div className="Checkbox clickable" onClick={() => setIsChecked(!isChecked)}>
      {isChecked && <ImCheckboxChecked className="App-icon Checkbox-icon active" />}
      {!isChecked && <ImCheckboxUnchecked className="App-icon Checkbox-icon inactive" />}
      {props.children}
    </div>
  )
}
