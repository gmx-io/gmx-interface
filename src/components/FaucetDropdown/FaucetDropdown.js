import { Menu } from "@headlessui/react";
import { t, Trans } from "@lingui/macro";
import { helperToast } from "lib/helperToast";
import { FaChevronDown, FaParachuteBox } from "react-icons/fa";
import "./FaucetDropdown.css";
import { ethers } from "ethers";
import { getExplorerUrl, MORPH_L2 } from "config/chains";
import Token from "abis/Token.json";
import { getTokenBySymbol, getTokens } from "config/tokens";
import { useDynamicChainId } from "lib/chains";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { useState, useEffect, useContext } from "react";
import WETH from "abis/WETH.json";
import TMX from "abis/TMX.json";
import BN from "bignumber.js";
import { DynamicWalletContext } from "store/dynamicwalletprovider";

function FaucetDropdown() {
  const dynamicContext = useContext(DynamicWalletContext);
  const active = dynamicContext.active;
  const account = dynamicContext.account;
  const signer = dynamicContext.signer;
  const { chainId } = useDynamicChainId();

  const txmContractAddress = "0x98e9944fdF31890F5823f351B4797e97C5f86088";

  const TMX_FAUCET = {
    name: "TMX",
    symbol: "TMX",
    address: "0x98e9944fdF31890F5823f351B4797e97C5f86088",
    decimals: 18,
    isStable: false,
    isShortable: true,
    imageUrl: "https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png?1548822744",
  };

  const [amount] = useState(1000);
  const [wethAmount] = useState("0.01");
  const [wbtcamount] = useState("0.01");
  const [txmAmount] = useState(10);
  const [tokens, setTokens] = useState();

  useEffect(() => {
    const getToken = async () => {
      const token = getTokens(chainId);
      const faucetTokens = [...token];
      if (chainId === MORPH_L2) {
        const tmx = faucetTokens.find((token) => token.name === "TMX");
        if (!tmx) {
          faucetTokens.push(TMX_FAUCET);
        }
      }
      if (token) {
        setTokens(faucetTokens);
      }
    };

    getToken();
  }, [chainId, TMX_FAUCET]);

  function mint(tokenSymbol) {
    let ethamount;
    if (active) {
      if (tokenSymbol === "WBTC") {
        ethamount = new BN(0.1).times(1e8).toString();
      } else if (tokenSymbol != "TMX") {
        const token = getTokenBySymbol(chainId, tokenSymbol);
        ethamount = (amount * 10 ** token.decimals).toLocaleString("fullwide", {
          useGrouping: false,
        });
      }
      if (tokenSymbol === "TMX") {
        const txmAmt = (txmAmount * 10 ** TMX_FAUCET.decimals).toLocaleString("fullwide", {
          useGrouping: false,
        });
        const contract = new ethers.Contract(txmContractAddress, TMX.abi, signer);
        contract
          .transferTmx(account, txmAmt.toString())
          .then(async (res) => {
            const txUrl = getExplorerUrl(chainId) + "tx/" + res.hash;
            helperToast.success(
              <div>
                <Trans>
                  Submitted! <ExternalLink href={txUrl}>View status.</ExternalLink>
                </Trans>
                <br />
              </div>
            );
          })
          .catch((e) => {
            // eslint-disable-next-line no-console
            console.error(e);
            let failMsg;
            if (
              ["not enough funds for gas", "failed to execute call with revert code InsufficientGasFunds"].includes(
                e.data?.message
              )
            ) {
              failMsg = (
                <div>
                  <Trans>
                    There is not enough ETH in your account to send this transaction.
                    <br />
                  </Trans>
                </div>
              );
            } else if (e.message?.includes("User denied transaction signature")) {
              failMsg = t`Transaction was cancelled`;
            } else {
              failMsg = t`Minting...`;
            }
            helperToast.error(failMsg);
          });
      }

      if (tokenSymbol === "ETH" || tokenSymbol === "WETH") {
        const token = getTokenBySymbol(chainId, tokenSymbol);

        const contract = new ethers.Contract(token.address, WETH.abi, signer);
        contract
          .deposit({
            value: ethers.utils.parseEther(tokenSymbol === "ETH" ? wbtcamount : wethAmount),
          })
          .then(async (res) => {
            const txUrl = getExplorerUrl(chainId) + "tx/" + res.hash;
            helperToast.success(
              <div>
                <Trans>
                  Submitted! <ExternalLink href={txUrl}>View status.</ExternalLink>
                </Trans>
                <br />
              </div>
            );
          })
          .catch((e) => {
            // eslint-disable-next-line no-console
            console.error(e);
            let failMsg;
            if (
              ["not enough funds for gas", "failed to execute call with revert code InsufficientGasFunds"].includes(
                e.data?.message
              )
            ) {
              failMsg = (
                <div>
                  <Trans>
                    There is not enough ETH in your account to send this transaction.
                    <br />
                  </Trans>
                </div>
              );
            } else if (e.message?.includes("User denied transaction signature")) {
              failMsg = t`Transaction was cancelled`;
            } else {
              failMsg = t`Mint failed`;
            }
            helperToast.error(failMsg);
          });
      } else if (tokenSymbol != "TMX") {
        const token = getTokenBySymbol(chainId, tokenSymbol);

        const contract = new ethers.Contract(token.address, Token.abi, signer);
        contract
          .mint(account, ethamount.toString())
          .then(async (res) => {
            const txUrl = getExplorerUrl(chainId) + "tx/" + res.hash;
            helperToast.success(
              <div>
                <Trans>
                  Submitted! <ExternalLink href={txUrl}>View status.</ExternalLink>
                </Trans>
                <br />
              </div>
            );
          })
          .catch((e) => {
            // eslint-disable-next-line no-console
            console.error(e);
            let failMsg;
            if (
              ["not enough funds for gas", "failed to execute call with revert code InsufficientGasFunds"].includes(
                e.data?.message
              )
            ) {
              failMsg = (
                <div>
                  <Trans>
                    There is not enough ETH in your account to send this transaction.
                    <br />
                  </Trans>
                </div>
              );
            } else if (e.message?.includes("User denied transaction signature")) {
              failMsg = t`Transaction was cancelled`;
            } else {
              failMsg = t`Mint failed`;
            }
            helperToast.error(failMsg);
          });
      }
    } else {
      let failMsg;
      failMsg = t`Please connect to metamask`;
      helperToast.error(failMsg);
    }
  }

  return (
    <Menu>
      <Menu.Button as="div">
        <button className="App-cta small transparent faucet-btn">
          <span className="faucet">Faucet</span>
          <FaChevronDown />
        </button>
      </Menu.Button>
      <div>
        <>
          <Menu.Items as="div" className="menu">
            {tokens?.map((token, index) => (
              <div key={index}>
                {!token.isNative && (
                  <Menu.Item key={index}>
                    <div
                      key={token.symbol}
                      className="menu-item"
                      onClick={(e) => {
                        mint(token.symbol);
                      }}
                    >
                      <FaParachuteBox />
                      <p>
                        <Trans>{token.symbol}</Trans>
                      </p>
                    </div>
                  </Menu.Item>
                )}
              </div>
            ))}
          </Menu.Items>
        </>
      </div>
    </Menu>
  );
}

export default FaucetDropdown;
