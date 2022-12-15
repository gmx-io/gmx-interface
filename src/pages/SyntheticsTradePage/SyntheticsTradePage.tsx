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
          <div style={{ marginRight: "100px", marginTop: "5%" }}>
            <SyntheticsSwapBox onConnectWallet={p.onConnectWallet} />
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
