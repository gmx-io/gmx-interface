import React from 'react'
import cx from "classnames";

import './NetworkSelector.css';

import selectorDropdowns from '../../img/ic_selector_dropdowns.svg';

import Select, { components } from 'react-select';
import { find } from 'lodash';

export default function NetworkSelector(props) {
  const { options, disabled, label, className } = props

  const onSelect = (token) => {
    props.onSelect(token)
  }

  const DropdownIndicator = (props) => {
    return (
      <components.DropdownIndicator {...props}>
        <img src={selectorDropdowns} alt="selectorDropdowns" />
      </components.DropdownIndicator>
    );
  };

  const customStyles = {
    option: (provided, state) => ({
      ...provided,
      margin: 0,
      paddingLeft: 8,
      backgroundColor: state.isFocused  && '#E8414229'
    }),
    control: () => ({
      // none of react-select's styles are passed to <Control />
      width: 144,
      height: 36,
      backgroundColor: '#28A0F052',
      display: 'flex',
      border: '1px solid #FFFFFF17',
      borderRadius: 4
    }),
    indicatorSeparator: () => ({
      display: 'none'
    }),
    dropdownIndicator: () => ({
      padding: 0,
      display: 'flex'
    }),
    menu: (provided) => ({
      ...provided,
      background: '#16182E',
      boxShadow: '0px 5px 12px #00000052',
      border: '1px solid #32344C',
      borderRadius: 4
    }),
    singleValue: (provided, state) => ({
      ...provided,
      color: 'white',
      margin: 0
    }),
    valueContainer: (provided, state) => ({
      ...provided,
      paddingRight: 0
    }),
  }

  var value = find(options, (o) => { return o.label === label })

  return (
    <div className={cx("Selector", className, { disabled })}>
      <Select
        value={value}
        options={options}
        components={{ DropdownIndicator }}
        onChange={onSelect}
        isSearchable={false}
        className="network-select"
        styles={customStyles}
        getOptionLabel={e => {
          var optionIcon = require('../../img/' + e.icon);
          return (<div style={{ display: 'flex', alignItems: 'center' }}>
            <img src={optionIcon.default} alt={e.icon} className="network-icon" />
            <span style={{ marginLeft: 5 }}>{e.label}</span>
          </div>)
        }}
      />
    </div>
  )
}
