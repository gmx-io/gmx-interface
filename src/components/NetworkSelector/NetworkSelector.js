import React, { useState, useEffect } from "react";
import cx from "classnames";

import Modal from "../Modal/Modal";

import "./NetworkSelector.css";

import selectorDropdowns from "../../img/ic_selector_dropdowns.svg";

import Select, { components } from "react-select";
import { find } from "lodash";
import { useLockBodyScroll } from "react-use";

function getDotColor(network) {
  switch (network) {
    case "Arbitrum":
      return "#4275a8";
    case "Avalanche":
      return "#E84142";
    default:
      return "";
  }
}

export default function NetworkSelector(props) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const { small, options, disabled, label, modalLabel, className, showCaret = true } = props;
  const [selectedLabel, setSelectedLabel] = useState(label);
  const [networkChanged, setNetworkChanged] = useState(false);

  useEffect(() => {
    setSelectedLabel(label);
  }, [label, networkChanged]);

  useLockBodyScroll(isModalVisible);

  function renderOption(option) {
    var optionIcon = require("../../img/" + option.icon);
    return (
      <div className={cx("Selector-option", option.label)} onClick={() => onSelect(option)} key={option.value}>
        <img src={optionIcon.default} alt={option.icon} className="Selector-option_icon" />
        <span className="Selector-option_label">{option.label}</span>
        {selectedLabel === option.label && <div className="selected-icon"></div>}
      </div>
    );
  }

  const onSelect = async (token) => {
    setIsModalVisible(false);
    props.showModal(false);
    let network;
    try {
      network = await props.onSelect(token);
      setSelectedLabel(network);
    } catch (error) {
      console.error(error);
    }
    setNetworkChanged(true);
  };

  const DropdownIndicator = (props) => {
    return (
      <components.DropdownIndicator {...props}>
        <img src={selectorDropdowns} alt="selectorDropdowns" />
      </components.DropdownIndicator>
    );
  };
  function Option(props) {
    let className = cx(props.className, props.data.label.toLowerCase());
    props = { ...props, className };
    return <components.Option {...props} />;
  }
  function IndicatorsContainer(props) {
    return (
      <components.IndicatorsContainer {...props}>
        <img src={selectorDropdowns} alt="" />
      </components.IndicatorsContainer>
    );
  }

  function SingleValue({ data, ...props }) {
    let icon = require("../../img/" + data.icon);
    return (
      <components.SingleValue {...props}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <img src={icon.default} alt={data.label} className="network-icon" />
          <span style={{ marginLeft: 5 }} className="network-label">
            {data.label}
          </span>
        </div>
      </components.SingleValue>
    );
  }

  const customStyles = {
    option: (provided, state) => {
      const backgroundColor = "#16182e";
      return {
        ...provided,
        margin: 0,
        paddingLeft: 8,
        cursor: "pointer",
        backgroundColor,
        color: "#a0a3c4",
        height: 36,
        paddingTop: 6,
      };
    },
    control: (provided, state) => {
      return {
        width: 144,
        height: 36,
        display: "flex",
        border: "1px solid #FFFFFF29",
        borderRadius: 4,
        cursor: "pointer",
        fontSize: "14px",
        "@media (max-width: 900px)": {
          width: 72,
        },
      };
    },
    indicatorSeparator: () => ({
      display: "none",
    }),
    dropdownIndicator: () => ({
      padding: 0,
      display: "flex",
    }),
    menu: (provided) => ({
      ...provided,
      background: "#16182E",
      boxShadow: "0px 5px 12px #00000052",
      border: "1px solid #32344C",
      borderRadius: 4,
      fontSize: "14px",
    }),
    menuList: (provided) => ({
      paddingTop: "0px",
      paddingBottom: "0px",
    }),
    singleValue: (provided, state) => ({
      ...provided,
      color: "white",
      margin: 0,
      fontSize: "14px",
    }),
    valueContainer: (provided, state) => ({
      ...provided,
      paddingRight: 0,
    }),
  };

  const toggleModal = function (val) {
    setIsModalVisible(val);
    props.showModal(val);
  };

  var value = find(options, (o) => {
    return o.label === selectedLabel;
  });

  value = value || options[0];

  const valueIcon = require("../../img/" + value.icon);

  return (
    <div className={cx("Selector", className, { disabled })}>
      {isModalVisible && (
        <div>
          <Modal className="selector-modal" isVisible={isModalVisible} setIsVisible={toggleModal} label={modalLabel}>
            <div className="Selector-options">{options.map(renderOption)}</div>
          </Modal>
        </div>
      )}
      {small ? (
        <div className={cx("Selector-box", value.label)} onClick={() => toggleModal(true)}>
          <img src={valueIcon.default} alt="valueIcon" />
          {showCaret && <img src={selectorDropdowns} alt="selectorDropdowns" />}
        </div>
      ) : (
        <Select
          value={value}
          options={options}
          components={{
            DropdownIndicator,
            SingleValue,
            Option,
            IndicatorsContainer,
          }}
          classNamePrefix="react-select"
          onChange={onSelect}
          isSearchable={false}
          className={"network-select"}
          styles={customStyles}
          getOptionLabel={(e) => {
            var optionIcon = require("../../img/" + e.icon);
            return (
              <div style={{ display: "flex", alignItems: "center" }}>
                <img src={optionIcon.default} alt={e.icon} className="network-icon" />
                <span style={{ marginLeft: 5 }} className="network-label">
                  {e.label}
                </span>
                {selectedLabel === e.label && (
                  <div className="selected-icon " style={{ backgroundColor: getDotColor(e.label) }}></div>
                )}
              </div>
            );
          }}
        />
      )}
    </div>
  );
}
