import React from "react";
import cx from "classnames";

import "./ChartTokenSelector.css";
import { BiChevronDown } from "react-icons/bi";

import Select, { components } from "react-select";
import { getTokens } from '../../data/Tokens'

export default function ChartTokenSelector(props) {
  const {
    disabled,
    className,
    chainId,
    selectedToken,
    onSelectToken
  } = props;

  var availableOptions = {
    43114: ['AVAX', 'ETH', 'BTC'],
    42161: ['ETH', 'BTC', 'LINK', 'UNI']
  }

  let options = getTokens(chainId)

  options = options.filter((item) => {
    return availableOptions[chainId].indexOf(item.symbol) > -1
  })

  const onSelect = async token => {
    onSelectToken(token)
  };

  const DropdownIndicator = props => {
    return (
      <components.DropdownIndicator {...props}>
        <BiChevronDown className="TokenSelector-caret" />
      </components.DropdownIndicator>
    );
  };
  function Option(props) {
    let className = cx(props.className, props.data.symbol.toLowerCase());
    props = { ...props, className };
    return <components.Option {...props} />;
  }
  function IndicatorsContainer(props) {
    return (
      <components.IndicatorsContainer {...props}>
        <BiChevronDown className="caret" />
      </components.IndicatorsContainer>
    );
  }

  function SingleValue({ data, ...props }) {
    return (
      <components.SingleValue {...props}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <span style={{ marginLeft: 5 }} className="token-label">
            {data.symbol} / USD
          </span>
        </div>
      </components.SingleValue>
    );
  }

  const customStyles = {
    option: (provided, state) => {
      return {
        ...provided,
        margin: 0,
        padding: 0,
        cursor: "pointer",
        backgroundColor: "#101124",
        color: "white",
        height: 40,
        fontSize: "1.375rem",
        lineHeight: "1.75rem"
      };
    },
    control: (provided, state) => {
      return {
        height: 40,
        display: "flex",
        cursor: "pointer",
        fontSize: "1.375rem",
        lineHeight: "1.75rem"
      };
    },
    indicatorSeparator: () => ({
      display: "none"
    }),
    dropdownIndicator: () => ({
      padding: 0,
      display: "flex"
    }),
    menu: provided => ({
      ...provided,
      background: "#16182E",
      boxShadow: "0px 3px 6px #00000066",
      border: "1px solid #262638",
      borderRadius: 4,
      fontSize: "14px",
      top: '42px',
      left: '0rem',
      width: 158
    }),
    menuList: provided => ({
      paddingTop: "0px",
      paddingBottom: "0px",
      background: "#101124",
      borderRadius: 4
    }),
    singleValue: (provided, state) => ({
      ...provided,
      color: "white",
      margin: 0,
      fontSize: "1.375rem",
      lineHeight: "1.75rem"
    }),
    valueContainer: (provided, state) => ({
      ...provided,
      paddingRight: 0
    })
  };

  var value = selectedToken;

  return (
    <div className={cx("Selector", className, { disabled })}>
      <Select
        value={value}
        options={options}
        components={{
          DropdownIndicator,
          SingleValue,
          Option,
          IndicatorsContainer
        }}
        classNamePrefix="react-select"
        onChange={onSelect}
        isSearchable={false}
        className={"chart-token-select"}
        styles={customStyles}
        getOptionLabel={e => {
          return (
            <div style={{ display: "flex", alignItems: "center" }} className={'item ' + (selectedToken.symbol === e.symbol ? 'selected' : '')}>
              <span style={{ marginLeft: 5 }} className="token-label">
                {e.symbol} / USD
              </span>
            </div>
          );
        }}
      />
    </div>
  );
}
