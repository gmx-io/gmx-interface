import React, { useState, useEffect } from 'react'
import { SWRConfig } from 'swr'

import { motion, AnimatePresence } from "framer-motion"

import { Web3ReactProvider, useWeb3React } from '@web3-react/core'
import { Web3Provider } from '@ethersproject/providers'

import {
  BrowserRouter as Router,
  Switch,
  Route,
  NavLink
} from 'react-router-dom'
import { useLocalStorage } from 'react-use'

import {
  MAINNET,
  TESTNET,
  ARBITRUM_TESTNET,
  ARBITRUM,
  DEFAULT_SLIPPAGE_AMOUNT,
  SLIPPAGE_BPS_KEY,
  IS_PNL_IN_LEVERAGE_KEY,
  BASIS_POINTS_DIVISOR,
  SHOULD_SHOW_POSITION_LINES_KEY,
  switchNetwork,
  helperToast,
  getChainName,
  useChainId,
  getAccountUrl,
  getConnectWalletHandler,
  useEagerConnect,
  useInactiveListener,
  shortenAddress,
  getExplorerUrl
} from './Helpers'

import Home from './views/Home'
import Presale from './views/Presale'
import Dashboard from './views/Dashboard'
import Stake from './views/Stake'
import Exchange from './views/Exchange'
import Actions from './views/Actions'
import OrdersOverview from './views/OrdersOverview'
import PositionsOverview from './views/PositionsOverview'
import BuyGlp from './views/BuyGlp'
import SellGlp from './views/SellGlp'
import NftWallet from './views/NftWallet'
import BeginAccountTransfer from './views/BeginAccountTransfer'
import CompleteAccountTransfer from './views/CompleteAccountTransfer'
import Debug from './views/Debug'

import cx from "classnames";
import { cssTransition } from 'react-toastify'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import Selector from './components/Selector/Selector'
import Modal from './components/Modal/Modal'
import Checkbox from './components/Checkbox/Checkbox'

import { RiMenuLine } from 'react-icons/ri'
import { FaTimes } from 'react-icons/fa'
import { BsThreeDots }  from 'react-icons/bs'

import './Font.css'
import './Shared.css'
import './App.css';
import './Input.css';
import './AppOrder.css';

import logoImg from './img/gmx-logo-final-white-small.png'

if ('ethereum' in window) {
  window.ethereum.autoRefreshOnNetworkChange = false
}

function getLibrary(provider) {
  const library = new Web3Provider(provider)
  return library
}

const Zoom = cssTransition({
  enter: 'zoomIn',
  duration: 300
})

const onNetworkSelect = option => {
  switchNetwork(option.value)
}

function inPreviewMode() {
  return false
}

function AppHeaderLinks({ small, openSettings }) {
  if (inPreviewMode()) {
    return (
      <div className="App-header-links preview">
        <div className="App-header-link-container App-header-link-home">
          <NavLink activeClassName="active" exact to="/">HOME</NavLink>
        </div>
        <div className="App-header-link-container">
          <NavLink activeClassName="active" to="/earn">EARN</NavLink>
        </div>
        <div className="App-header-link-container">
          <a href="https://gmxio.gitbook.io/gmx/" target="_blank" rel="noopener noreferrer">
            ABOUT
          </a>
        </div>
      </div>
    )
  }
  return (
    <div className="App-header-links">
      <div className="App-header-link-container App-header-link-home">
        <NavLink activeClassName="active" exact to="/">HOME</NavLink>
      </div>
      <div className="App-header-link-container">
        <NavLink activeClassName="active" to="/trade">TRADE</NavLink>
      </div>
      <div className="App-header-link-container">
        <NavLink activeClassName="active" to="/dashboard">DASHBOARD</NavLink>
      </div>
      <div className="App-header-link-container">
        <NavLink activeClassName="active" to="/earn">EARN</NavLink>
      </div>
      <div className="App-header-link-container">
        <a href="https://gmxio.gitbook.io/gmx/" target="_blank" rel="noopener noreferrer">
          ABOUT
        </a>
      </div>
      <div className="App-header-link-container">
        <a href="https://www.gmx.house/p/leaderboard" target="_blank" rel="noopener noreferrer">
          LEADERBOARD
        </a>
      </div>
      {small &&
        <div className="App-header-link-container">
          {/* eslint-disable-next-line */}
          <a href="#" onClick={openSettings}>
            SETTINGS
          </a>
        </div>
      }
    </div>
  )
}

function NetworkIcon({ chainId }) {
  let url
  if (chainId === MAINNET || chainId === TESTNET) {
    url = "/binance.svg"
  } else if (chainId === ARBITRUM_TESTNET || chainId === ARBITRUM) {
    url = "/arbitrum.svg"
  }
  return <img src={url} alt={getChainName(chainId)} className="Network-icon" />
}

function AppHeaderUser({ openSettings, small }) {
  const { chainId } = useChainId()
  const { active, account, activate } = useWeb3React()
  const showSelector = false
  const networkOptions = [
    { label: "Arbitrum", value: ARBITRUM },
    { label: "Binance Smart Chain (BSC)", value: MAINNET }
  ]

  if (!active) {
    const connectWallet = getConnectWalletHandler(activate)

    return (
      <div className="App-header-user">
        <button target="_blank" rel="noopener noreferrer" className="App-cta App-connect-wallet" onClick={connectWallet}>
          Connect Wallet
        </button>
      </div>
    )
  }

  const accountUrl = getAccountUrl(chainId, account)

  const icon = <NetworkIcon chainId={chainId} />
  const selectorLabel = <span>{icon}&nbsp;{getChainName(chainId)}</span>

  return (
    <div className="App-header-user">
      <a href={accountUrl} target="_blank" rel="noopener noreferrer" className="App-cta small transparent App-header-user-account">
        {shortenAddress(account, small ? 11 : 13)}
      </a>
      {showSelector && <Selector
        options={networkOptions}
        label={selectorLabel}
        onSelect={onNetworkSelect}
        className="App-header-user-netowork"
        showCaret={true}
        modalLabel="Switch Network"
        modalText="Or you can switch network manually in&nbsp;Metamask"
      />}
      {!small &&
          <button className="App-header-user-settings" onClick={openSettings}>
            <BsThreeDots />
          </button>
      }
    </div>
  )
}

function FullApp() {
  const { connector, library } = useWeb3React()
  const { chainId } = useChainId()
  const [activatingConnector, setActivatingConnector] = useState()
  useEffect(() => {
    if (activatingConnector && activatingConnector === connector) { setActivatingConnector(undefined) }
  }, [activatingConnector, connector, chainId])
  const triedEager = useEagerConnect()
  useInactiveListener(!triedEager || !!activatingConnector)

  const [isDrawerVisible, setIsDrawerVisible] = useState(undefined)
  const fadeVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  }
  const slideVariants = {
    hidden: { y: "-100%" },
    visible: { y: 0 }
  }

  const [isSettingsVisible, setIsSettingsVisible] = useState(false)
  const [savedSlippageAmount, setSavedSlippageAmount] = useLocalStorage(
    SLIPPAGE_BPS_KEY,
    DEFAULT_SLIPPAGE_AMOUNT
  )
  const [slippageAmount, setSlippageAmount] = useState(0)
  const [isPnlInLeverage, setIsPnlInLeverage] = useState(false)

  const [savedIsPnlInLeverage, setSavedIsPnlInLeverage] = useLocalStorage(
    IS_PNL_IN_LEVERAGE_KEY,
    false
  )

  const [savedShouldShowPositionLines, setSavedShouldShowPositionLines] = useLocalStorage(
    SHOULD_SHOW_POSITION_LINES_KEY,
    false
  )

  const openSettings = () => {
    const slippage = parseInt(savedSlippageAmount)
    setSlippageAmount(slippage / BASIS_POINTS_DIVISOR * 100)
    setIsPnlInLeverage(savedIsPnlInLeverage)
    setIsSettingsVisible(true)
  }

  const saveAndCloseSettings = () => {
    const slippage = parseFloat(slippageAmount)
    if (isNaN(slippage)) {
      helperToast.error("Invalid slippage value")
      return
    }
    if (slippage > 5) {
      helperToast.error("Slippage should be less than 5%")
      return
    }

    const basisPoints = slippage * BASIS_POINTS_DIVISOR / 100
    if (parseInt(basisPoints) !== parseFloat(basisPoints)) {
      helperToast.error("Max slippage precision is 0.01%")
      return
    }

    setSavedIsPnlInLeverage(isPnlInLeverage)
    setSavedSlippageAmount(basisPoints)
    setIsSettingsVisible(false)
  }

  const [pendingTxns, setPendingTxns] = useState([])

  useEffect(() => {
    const checkPendingTxns = async () => {
      const updatedPendingTxns = []
      for (let i = 0; i < pendingTxns.length; i++) {
        const pendingTxn = pendingTxns[i]
        const receipt = await library.getTransactionReceipt(pendingTxn.hash)
        if (receipt) {
          if (receipt.status === 0) {
            const txUrl = getExplorerUrl(chainId) + "tx/" + pendingTxn.hash
            helperToast.error(
              <div>
              Txn failed. <a href={txUrl} target="_blank" rel="noopener noreferrer">View</a>
              <br/>
              </div>
            )
          }
          if (receipt.status === 1 && pendingTxn.message) {
            const txUrl = getExplorerUrl(chainId) + "tx/" + pendingTxn.hash
            helperToast.success(
              <div>
              {pendingTxn.message}. <a href={txUrl} target="_blank" rel="noopener noreferrer">View</a>
              <br/>
              </div>
            )
          }
          continue
        }
        updatedPendingTxns.push(pendingTxn)
      }

      if (updatedPendingTxns.length !== pendingTxns.length) {
        setPendingTxns(updatedPendingTxns)
      }
    }

    const interval = setInterval(() => {
      checkPendingTxns()
    }, 2 * 1000)
    return () => clearInterval(interval);
  }, [library, pendingTxns, chainId])

  return (
    <Router>
      <div className="App">
        <div className="App-background-side-1"></div>
        <div className="App-background-side-2"></div>
        <div className="App-background"></div>
        <div className="App-background-ball-1"></div>
        <div className="App-background-ball-2"></div>
        <div className="App-highlight"></div>
        <div className="App-content">
          {isDrawerVisible &&
            <AnimatePresence>
              {isDrawerVisible &&
                <motion.div className="App-header-backdrop"
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  variants={fadeVariants}
                  transition={{ duration: 0.2 }}
                  onClick={() => setIsDrawerVisible(!isDrawerVisible)}
                  >
                </motion.div>}
            </AnimatePresence>
          }
          <header>
            <div className="App-header large">
              <div className="App-header-container-left">
                <NavLink exact activeClassName="active" className="App-header-link-main" to="/">
                  <img src={logoImg} alt="MetaMask" />
                  GMX
                </NavLink>
                <AppHeaderLinks />
              </div>
              <div className="App-header-container-right">
                <AppHeaderUser openSettings={openSettings} />
              </div>
            </div>
            <div className={cx("App-header", "small", { active: isDrawerVisible })}>
              <div className={cx("App-header-link-container", "App-header-top", { active: isDrawerVisible })}>
                <div className="App-header-container-left">
                  <div className="App-header-link-main">
                    <img src={logoImg} alt="MetaMask" />
                    GMX
                  </div>
                </div>
                <div className="App-header-container-right">
                  <AppHeaderUser openSettings={openSettings} small />
                  <div onClick={() => setIsDrawerVisible(!isDrawerVisible)}>
                    {!isDrawerVisible && <RiMenuLine className="App-header-menu-icon" />}
                    {isDrawerVisible && <FaTimes className="App-header-menu-icon" />}
                  </div>
                </div>
              </div>
              <AnimatePresence>
                {isDrawerVisible &&
                  <motion.div
                    onClick={() => setIsDrawerVisible(false)}
                    className="App-header-links-container App-header-drawer"
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    variants={slideVariants}
                    transition={{ duration: 0.2 }}
                    >
                  <AppHeaderLinks small openSettings={openSettings} />
                </motion.div>}
              </AnimatePresence>
            </div>
          </header>
          <Switch>
            <Route exact path="/">
              <Home />
            </Route>
            <Route exact path="/trade">
              <Exchange
                savedIsPnlInLeverage={savedIsPnlInLeverage}
                setSavedIsPnlInLeverage={setSavedIsPnlInLeverage}
                savedSlippageAmount={savedSlippageAmount}
                setPendingTxns={setPendingTxns}
                pendingTxns={pendingTxns}
                savedShouldShowPositionLines={savedShouldShowPositionLines}
                setSavedShouldShowPositionLines={setSavedShouldShowPositionLines}
              />
            </Route>
            <Route exact path="/presale">
              <Presale />
            </Route>
            <Route exact path="/dashboard">
              <Dashboard />
            </Route>
            <Route exact path="/earn">
              <Stake setPendingTxns={setPendingTxns} />
            </Route>
            <Route exact path="/buy_glp">
              <BuyGlp
                savedSlippageAmount={savedSlippageAmount}
                setPendingTxns={setPendingTxns}
              />
            </Route>
            <Route exact path="/sell_glp">
              <SellGlp
                savedSlippageAmount={savedSlippageAmount}
                setPendingTxns={setPendingTxns}
              />
            </Route>
            <Route exact path="/about">
              <Home />
            </Route>
            <Route exact path="/nft_wallet">
              <NftWallet />
            </Route>
            <Route exact path="/actions/:account">
              <Actions />
            </Route>
            <Route exact path="/orders_overview">
              <OrdersOverview />
            </Route>
            <Route exact path="/positions_overview">
              <PositionsOverview />
            </Route>
            <Route exact path="/actions">
              <Actions />
            </Route>
            <Route exact path="/begin_account_transfer">
              <BeginAccountTransfer
                setPendingTxns={setPendingTxns}
              />
            </Route>
            <Route exact path="/complete_account_transfer/:sender/:receiver">
              <CompleteAccountTransfer
                setPendingTxns={setPendingTxns}
              />
            </Route>
            <Route exact path="/debug">
              <Debug />
            </Route>
          </Switch>
        </div>
      </div>
      <ToastContainer
        limit={1}
        transition={Zoom}
        position="bottom-right"
        autoClose={7000}
        hideProgressBar={true}
        newestOnTop={false}
        closeOnClick={false}
        draggable={false}
        pauseOnHover
      />
      <Modal className="App-settings" isVisible={isSettingsVisible} setIsVisible={setIsSettingsVisible} label="Settings">
        <div className="App-settings-row">
          <div>
            Slippage Tolerance
          </div>
          <div className="App-slippage-tolerance-input-container">
            <input type="number" className="App-slippage-tolerance-input" min="0" value={slippageAmount} onChange={(e) => setSlippageAmount(e.target.value)} />
            <div className="App-slippage-tolerance-input-percent">%</div>
          </div>
        </div>
        <div className="Exchange-settings-row">
          <Checkbox isChecked={isPnlInLeverage} setIsChecked={setIsPnlInLeverage}>
            Include PnL in leverage display
          </Checkbox>
        </div>
        <button className="App-cta Exchange-swap-button" onClick={saveAndCloseSettings}>Save</button>
      </Modal>
    </Router>
  )
}

function PreviewApp() {
  const [isDrawerVisible, setIsDrawerVisible] = useState(undefined)
  const fadeVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  }
  const slideVariants = {
    hidden: { y: "-100%" },
    visible: { y: 0 }
  }

  return (
    <Router>
      <div className="App">
        <div className="App-background-side-1"></div>
        <div className="App-background-side-2"></div>
        <div className="App-background"></div>
        <div className="App-background-ball-1"></div>
        <div className="App-background-ball-2"></div>
        <div className="App-highlight"></div>
        <div className="App-content">
          {isDrawerVisible &&
            <AnimatePresence>
              {isDrawerVisible &&
                <motion.div className="App-header-backdrop"
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  variants={fadeVariants}
                  transition={{ duration: 0.2 }}
                  onClick={() => setIsDrawerVisible(!isDrawerVisible)}
                  >
                </motion.div>}
            </AnimatePresence>
          }
          <header>
            <div className="App-header large preview">
              <div className="App-header-container-left">
                <NavLink exact activeClassName="active" className="App-header-link-main" to="/">
                  <img src={logoImg} alt="MetaMask" />
                  GMX
                </NavLink>
              </div>
              <div className="App-header-container-right">
                <AppHeaderLinks />
              </div>
            </div>
            <div className={cx("App-header", "small", { active: isDrawerVisible })}>
              <div className={cx("App-header-link-container", "App-header-top", { active: isDrawerVisible })}>
                <div className="App-header-container-left">
                  <div className="App-header-link-main">
                    <img src={logoImg} alt="MetaMask" />
                    GMX
                  </div>
                </div>
                <div className="App-header-container-right">
                  <div onClick={() => setIsDrawerVisible(!isDrawerVisible)}>
                    {!isDrawerVisible && <RiMenuLine className="App-header-menu-icon" />}
                    {isDrawerVisible && <FaTimes className="App-header-menu-icon" />}
                  </div>
                </div>
              </div>
              <AnimatePresence>
                {isDrawerVisible &&
                  <motion.div
                    onClick={() => setIsDrawerVisible(false)}
                    className="App-header-links-container App-header-drawer"
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    variants={slideVariants}
                    transition={{ duration: 0.2 }}
                    >
                  <AppHeaderLinks small />
                </motion.div>}
              </AnimatePresence>
            </div>
          </header>
          <Switch>
            <Route exact path="/">
              <Home />
            </Route>
            <Route exact path="/earn">
              <Stake />
            </Route>
          </Switch>
        </div>
      </div>
    </Router>
  )
}

function App() {
  if (inPreviewMode()) {
    return (
      <Web3ReactProvider getLibrary={getLibrary}>
        <PreviewApp />
      </Web3ReactProvider>
    )
  }

  return (
    <SWRConfig value={{ refreshInterval: 5000 }}>
      <Web3ReactProvider getLibrary={getLibrary}>
        <FullApp />
      </Web3ReactProvider>
    </SWRConfig>
  )
}

export default App;
