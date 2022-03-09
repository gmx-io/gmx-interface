import React from "react";
import { Menu } from "@headlessui/react";
import { FaChevronDown } from "react-icons/fa";
import "./ChartTokenSelector.css";
import { getTokens } from '../../data/Tokens'

export default function ChartTokenSelector(props) {
  const {
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

  var value = selectedToken;

  return (
    <Menu>
      <Menu.Button as="div">
        <button className="App-cta small transparent chart-token-selector">
          <span className="chart-token-selector--current">
            {value.symbol} / USD
          </span>
          <FaChevronDown />
        </button>
      </Menu.Button>
      <div className="chart-token-menu">
        <Menu.Items as="div" className="menu-items chart-token-menu-items">
          {
            options.map((option, index) => (
              <Menu.Item key={index}>
                <div
                  className="menu-item"
                  onClick={() => {
                    onSelect(option)
                  }}
                >
                  <span style={{ marginLeft: 5 }} className="token-label">
                    {option.symbol} / USD
                  </span>
                </div>
              </Menu.Item>
            ))
          }
        </Menu.Items>
      </div>
    </Menu>
  );
}
