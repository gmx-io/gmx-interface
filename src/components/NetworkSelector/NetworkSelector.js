import React from 'react'
import cx from "classnames";

import './NetworkSelector.css';

import selectorDropdowns from '../../img/ic_selector_dropdowns.svg';

import Select, { components } from 'react-select';
import { find } from 'lodash';

import {
  ARBITRUM,
  AVALANCHE
} from '../../Helpers'

export default function NetworkSelector(props) {
  const { options, disabled, label, className } = props

  const onSelect = async (token) => {
    await props.onSelect(token)
  }

  const DropdownIndicator = (props) => {
    return (
      <components.DropdownIndicator {...props}>
        <img src={selectorDropdowns} alt="selectorDropdowns" />
      </components.DropdownIndicator>
    );
  };

  const customStyles = {
    option: (provided, state) => {
      const backgroundColor = (state.value === ARBITRUM && state.isFocused) ? '#1d446b' : ((state.value === AVALANCHE && state.isFocused) ? '#371e32' : '')
      return {
        ...provided,
        margin: 0,
        paddingLeft: 8,
        backgroundColor,
        cursor: 'pointer',
        height: 36,
        paddingTop: 6
      }
    },
    control: (provided, state) => {
      return {
        width: 144,
        height: 36,
        backgroundColor: state.selectProps.value.value === ARBITRUM ? '#1d446b' : '#371e32',
        display: 'flex',
        border: '1px solid #FFFFFF17',
        borderRadius: 4,
        cursor: 'pointer',
        fontSize: '14px',
        "@media (max-width: 900px)": {
          width: 72,
        },
      }
    },
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
      borderRadius: 4,
      fontSize: '14px'
    }),
    singleValue: (provided, state) => ({
      ...provided,
      color: 'white',
      margin: 0,
      fontSize: '14px',
      "@media only screen and (max-width: 1200px)": {
        "& > span": {
          display: 'none'
        },
      },
    }),
    valueContainer: (provided, state) => ({
      ...provided,
      paddingRight: 0
    })
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
            <span style={{ marginLeft: 5 }} className="network-label">{e.label}</span>
          </div>)
        }}
      />
    </div>
  )
}
