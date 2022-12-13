import Footer from "components/Footer/Footer";
import { SyntheticsSwapBox } from "components/SyntheticsSwap/SyntheticsSwapBox";

import "./SyntheticsTradePage.scss";

export function SyntheticsTradePage() {
  return (
    <div className="SyntheticsTrade page-layout">
      {/* {showBanner && <ExchangeBanner hideBanner={hideBanner} />} */}
      <div className="SyntheticsTrade-content">
        <div className="SyntheticsTrade-left">
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
          <div style={{ marginRight: "300px", marginTop: "30%" }}>
            <SyntheticsSwapBox />
          </div>

          {/* <div className="Exchange-wallet-tokens">
            <div className="Exchange-wallet-tokens-content">
              <ExchangeWalletTokens tokens={tokens} infoTokens={infoTokens} onSelectToken={onSelectWalletToken} />
            </div>
          </div> */}
        </div>
        {/* <div className="Exchange-lists small">{getListSection()}</div> */}
      </div>
      <Footer />
    </div>
  );
}
