import React, { useState } from 'react'
import cx from "classnames";

import { BiChevronDown } from 'react-icons/bi'

import Modal from '../Modal/Modal'

import './Selector.css';

export default function Selector(props) {
  const [isModalVisible, setIsModalVisible] = useState(false)
  const { options, disabled, label, modalLabel, modalText, className, showCaret = true } = props

  const onSelect = (token) => {
    setIsModalVisible(false)
    props.onSelect(token)
  }

  function renderOption(option) {
    return (
      <div className="Selector-option" onClick={() => onSelect(option)} key={option.value}>
        {option.label}
      </div>
    )
  }

  return (
    <div className={cx("Selector", className, { disabled })}>
      <Modal isVisible={isModalVisible} setIsVisible={setIsModalVisible} label={modalLabel}>
        <div className="Selector-options">
          {options.map(renderOption)}
        </div>
        {modalText &&
          <div className="Selector-text">
            {modalText}
          </div>
        }
      </Modal>
      <div className="Selector-box" onClick={() => setIsModalVisible(true)}>
        {label}
        {showCaret && <BiChevronDown className="Selector-caret" />}
      </div>
    </div>
  )
}
