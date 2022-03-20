import { useState } from "react";
import Select from "react-select";
import { useUserTradesData } from "../../Api";
import Checkbox from "../Checkbox/Checkbox";
import "./TradeHistory.css";
import "./TradeHistoryV2.css";

function TradeHistoryV2(props) {
  const { account, infoTokens, getTokenInfo, chainId, nativeTokenAddress } = props;
  let userTrades = useUserTradesData(chainId, account);
  let [activeTab, setActiveTab] = useState("all");
  const options = [
    { value: "all", label: "All" },
    { value: "margin", label: "Margin" },
    { value: "swap", label: "Swap" },
  ];

  if (!userTrades) return "Loading....";

  let { closedMarginTrades, swapTrades } = userTrades;
  let allTrades = closedMarginTrades.concat(swapTrades).sort((a, b) => a.timestamp - b.timestamp);
  function getTrades(active) {
    switch (active) {
      case "all":
        return allTrades;
      case "closed":
        return closedMarginTrades;
      case "swap":
        return swapTrades;
      default:
        return [];
    }
  }
  return (
    <div className="token-table-wrapper App-card">
      <div className="App-card-title trade-history-header">
        <div>Trade History</div>
        <Select options={options} styles={customStyles} className={"network-select"} />
      </div>
      <div className="App-card-divider"></div>
      <table className="">
        <thead>
          <tr>
            <th>Time</th>
            <th>Token</th>
            <th>Side</th>
            <th>Entry Price</th>
            <th>Exit Price</th>
            <th>PnL</th>
          </tr>
        </thead>
        <tbody>
          {/* {tokenList.map((token) => {
          const tokenInfo = infoTokens[token.address]
          let utilization = bigNumberify(0)
          if (tokenInfo && tokenInfo.reservedAmount && tokenInfo.poolAmount && tokenInfo.poolAmount.gt(0)) {
            utilization = tokenInfo.reservedAmount.mul(BASIS_POINTS_DIVISOR).div(tokenInfo.poolAmount)
          }
          let maxUsdgAmount = DEFAULT_MAX_USDG_AMOUNT
          if (tokenInfo.maxUsdgAmount && tokenInfo.maxUsdgAmount.gt(0)) {
            maxUsdgAmount = tokenInfo.maxUsdgAmount
          }

          var tokenImage = null;

          try {
            tokenImage = require('../../img/ic_' + token.symbol.toLowerCase() + '_40.svg')
          } catch (error) {
            // console.log(error)
          } */}

          {/* return (
            <tr key={token.symbol}>
              <td>
                <div className="token-symbol-wrapper">
                  <div className="App-card-title-info">
                    <div className="App-card-title-info-icon">
                      <img src={tokenImage && tokenImage.default} alt={token.symbol} width="40px" />
                    </div>
                    <div className="App-card-title-info-text">
                      <div className="App-card-info-title">{token.name}</div>
                      <div className="App-card-info-subtitle">{token.symbol}</div>
                    </div>
                    <div>
                      <AssetDropdown assetSymbol={token.symbol} assetInfo={token} />
                    </div>
                  </div>
                </div>
              </td>
              <td>
                ${formatKeyAmount(tokenInfo, "minPrice", USD_DECIMALS, 2, true)}
              </td>
              <td>
                <TooltipComponent
                  handle={`$${formatKeyAmount(tokenInfo, "managedUsd", USD_DECIMALS, 0, true)}`}
                  position="right-bottom"
                  renderContent={() => {
                    return <>
                      Pool Amount: {formatKeyAmount(tokenInfo, "managedAmount", token.decimals, 2, true)} {token.symbol}<br />
                      <br />
                      Max {tokenInfo.symbol} Capacity: ${formatAmount(maxUsdgAmount, 18, 0, true)}
                    </>
                  }}
                />
              </td>
              <td>
                {getWeightText(tokenInfo)}
              </td>
              <td>
                {formatAmount(utilization, 2, 2, false)}%
              </td>
            </tr>
          )
        })} */}
        </tbody>
      </table>
    </div>
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

export default TradeHistoryV2;
