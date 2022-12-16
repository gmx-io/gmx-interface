import Footer from "components/Footer/Footer";
import { SyntheticsSwapBox } from "components/SyntheticsSwap/SyntheticsSwapBox/SyntheticsSwapBox";

import "./SyntheticsTradePage.scss";

type Props = {
  onConnectWallet: () => void;
};

export function SyntheticsTradePage(p: Props) {
  return (
    <div className="SyntheticsTrade page-layout">
      {/* {showBanner && <ExchangeBanner hideBanner={hideBanner} />} */}
      <div className="SyntheticsTrade-content">
        <div className="SyntheticsTrade-left">
          <div
            style={{
              height: "49.6rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#16182e",
            }}
          >
            The chart
          </div>
          {/* <ExchangeTVChart
            fromTokenAddress={fromTokenAddress}
            toTokenAddress={toTokenAddress}
            infoTokens={infoTokens}
            swapOption={swapOption}
            chainId={chainId}
            positions={positions}
            savedShouldShowPositionLines={savedShouldShowPositionLines}
            orders={orders}
            setToTokenAddress={setToTokenAddress}
          /> */}
          {/* <div className="Exchange-lists large">{getListSection()}</div> */}
        </div>
        <div className="SyntheticsTrade-right">
          <div className="SyntheticsTrade-swap-box">
            <SyntheticsSwapBox onConnectWallet={p.onConnectWallet} />
          </div>
        </div>
        {/* <div className="Exchange-lists small">{getListSection()}</div> */}
      </div>
      <Footer />
    </div>
  );
}
