import React, { useEffect, useState } from "react";
import { useWeb3React } from "@web3-react/core";
import cx from "classnames";
import useSWR from "swr";
import { ethers } from "ethers";

import Footer from "./Footer";
import Modal from "./components/Modal/Modal";

import "./Migration.css";

import {
  getConnectWalletHandler,
  useEagerConnect,
  useInactiveListener,
  fetcher,
  formatArrayAmount,
  formatAmount,
  formatAmountFree,
  parseValue,
  expandDecimals,
  getExplorerUrl,
  approveTokens,
  bigNumberify,
  helperToast,
  CHAIN_ID,
} from "./Helpers";
import { getContract } from "./Addresses";

import Reader from "./abis/Reader.json";
import Token from "./abis/Token.json";
import GmxMigrator from "./abis/GmxMigrator.json";

const { MaxUint256, AddressZero } = ethers.constants;

const precision = 1000000;
const decimals = 6;
const gmxPrice = bigNumberify(2 * precision);
const tokens = [
  {
    name: "GMT",
    symbol: "GMT",
    address: getContract(CHAIN_ID, "GMT"),
    price: bigNumberify(10.97 * precision),
    iouToken: getContract(CHAIN_ID, "GMT_GMX_IOU"),
    cap: MaxUint256,
    bonus: 0,
  },
  {
    name: "xGMT",
    symbol: "xGMT",
    address: getContract(CHAIN_ID, "XGMT"),
    price: bigNumberify(90.31 * precision),
    iouToken: getContract(CHAIN_ID, "XGMT_GMX_IOU"),
    cap: MaxUint256,
    bonus: 0,
  },
  {
    name: "GMT-USDG",
    symbol: "LP",
    address: getContract(CHAIN_ID, "GMT_USDG_PAIR"),
    price: bigNumberify(parseInt(6.68 * precision)),
    iouToken: getContract(CHAIN_ID, "GMT_USDG_GMX_IOU"),
    cap: expandDecimals(483129, 18),
    bonus: 10,
  },
  {
    name: "xGMT-USDG",
    symbol: "LP",
    address: getContract(CHAIN_ID, "XGMT_USDG_PAIR"),
    price: bigNumberify(parseInt(19.27 * precision)),
    iouToken: getContract(CHAIN_ID, "XGMT_USDG_GMX_IOU"),
    cap: expandDecimals(150191, 18),
    bonus: 10,
  },
];

const readerAddress = getContract(CHAIN_ID, "Reader");
const gmxMigratorAddress = getContract(CHAIN_ID, "GmxMigrator");

function MigrationModal(props) {
  const {
    isVisible,
    setIsVisible,
    isPendingApproval,
    setIsPendingApproval,
    value,
    setValue,
    index,
    balances,
    active,
    account,
    library,
  } = props;
  const token = tokens[index];
  const [isMigrating, setIsMigrating] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const { data: tokenAllowance, mutate: updateTokenAllowance } = useSWR(
    [active, CHAIN_ID, token.address, "allowance", account, gmxMigratorAddress],
    {
      fetcher: fetcher(library, Token),
    }
  );

  let maxAmount;
  if (balances) {
    maxAmount = balances[index * 2];
  }

  useEffect(() => {
    if (active) {
      library.on("block", () => {
        updateTokenAllowance(undefined, true);
      });
      return () => {
        library.removeAllListeners("block");
      };
    }
  }, [active, library, updateTokenAllowance]);

  let amount = parseValue(value, 18);
  const needApproval = tokenAllowance && amount && amount.gt(tokenAllowance);

  let baseAmount;
  let bonusAmount;
  let totalAmount;

  let baseAmountUsd;
  let bonusAmountUsd;
  let totalAmountUsd;

  if (amount) {
    baseAmount = amount.mul(token.price).div(gmxPrice);
    bonusAmount = baseAmount.mul(token.bonus).div(100);
    totalAmount = baseAmount.add(bonusAmount);

    baseAmountUsd = baseAmount.mul(gmxPrice);
    bonusAmountUsd = bonusAmount.mul(gmxPrice);
    totalAmountUsd = totalAmount.mul(gmxPrice);
  }

  const getError = () => {
    if (!amount || amount.eq(0)) {
      return "Enter an amount";
    }
    if (maxAmount && amount.gt(maxAmount)) {
      return "Max amount exceeded";
    }
  };

  const onClickPrimary = () => {
    if (needApproval) {
      approveTokens({
        setIsApproving,
        library,
        tokenAddress: token.address,
        spender: gmxMigratorAddress,
        chainId: CHAIN_ID,
        onApproveSubmitted: () => {
          setIsPendingApproval(true);
        },
      });
      return;
    }

    setIsMigrating(true);
    const contract = new ethers.Contract(gmxMigratorAddress, GmxMigrator.abi, library.getSigner());
    contract
      .migrate(token.address, amount)
      .then(async (res) => {
        const txUrl = getExplorerUrl(CHAIN_ID) + "tx/" + res.hash;
        helperToast.success(
          <div>
            Migration submitted!{" "}
            <a href={txUrl} target="_blank" rel="noopener noreferrer">
              View status.
            </a>
            <br />
          </div>
        );
        setIsVisible(false);
      })
      .catch((e) => {
        console.error(e);
        helperToast.error("Migration failed");
      })
      .finally(() => {
        setIsMigrating(false);
      });
  };

  const isPrimaryEnabled = () => {
    const error = getError();
    if (error) {
      return false;
    }
    if (isApproving) {
      return false;
    }
    if (isMigrating) {
      return false;
    }
    if (needApproval && isPendingApproval) {
      return false;
    }
    return true;
  };

  const getPrimaryText = () => {
    const error = getError();
    if (error) {
      return error;
    }
    if (isApproving) {
      return `Approving...`;
    }
    if (needApproval && isPendingApproval) {
      return "Waiting for Approval";
    }
    if (needApproval) {
      return `Approve ${token.name}`;
    }
    if (isMigrating) {
      return "Migrating...";
    }
    return "Migrate";
  };

  return (
    <div className="StakeModal">
      <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={`Migrate ${token.name}`}>
        <div className="Exchange-swap-section">
          <div className="Exchange-swap-section-top">
            <div className="muted">
              <div className="Exchange-swap-usd">Migrate</div>
            </div>
            <div className="muted align-right clickable" onClick={() => setValue(formatAmountFree(maxAmount, 18, 8))}>
              Max: {formatAmount(maxAmount, 18, 4, true)}
            </div>
          </div>
          <div className="Exchange-swap-section-bottom">
            <div>
              <input
                type="number"
                placeholder="0.0"
                className="Exchange-swap-input"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
            <div className="PositionEditor-token-symbol">{token.symbol}</div>
          </div>
        </div>
        <div className="MigrationModal-info-box">
          <div className="App-info-row">
            <div className="App-info-label">{token.bonus > 0 ? "Base Tokens" : "To Receive"}</div>
            <div className="align-right">
              {baseAmount &&
                `${formatAmount(baseAmount, 18, 4, true)} GMX ($${formatAmount(
                  baseAmountUsd,
                  18 + decimals,
                  2,
                  true
                )})`}
              {!baseAmount && "-"}
            </div>
          </div>
          {token.bonus > 0 && (
            <div className="App-info-row">
              <div className="App-info-label">Bonus Tokens</div>
              <div className="align-right">
                {bonusAmount &&
                  `${formatAmount(bonusAmount, 18, 4, true)} GMX ($${formatAmount(
                    bonusAmountUsd,
                    18 + decimals,
                    2,
                    true
                  )})`}
                {!bonusAmount && "-"}
              </div>
            </div>
          )}
          {token.bonus > 0 && (
            <div className="App-info-row">
              <div className="App-info-label">To Receive</div>
              <div className="align-right">
                {totalAmount &&
                  `${formatAmount(totalAmount, 18, 4, true)} GMX ($${formatAmount(
                    totalAmountUsd,
                    18 + decimals,
                    2,
                    true
                  )})`}
                {!totalAmount && "-"}
              </div>
            </div>
          )}
        </div>
        <div className="Exchange-swap-button-container">
          <button className="App-cta Exchange-swap-button" onClick={onClickPrimary} disabled={!isPrimaryEnabled()}>
            {getPrimaryText()}
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default function Migration() {
  const [isMigrationModalVisible, setIsMigrationModalVisible] = useState(false);
  const [isPendingApproval, setIsPendingApproval] = useState(false);
  const [migrationIndex, setMigrationIndex] = useState(0);
  const [migrationValue, setMigrationValue] = useState("");

  const { connector, activate, active, account, library } = useWeb3React();
  const [activatingConnector, setActivatingConnector] = useState();
  useEffect(() => {
    if (activatingConnector && activatingConnector === connector) {
      setActivatingConnector(undefined);
    }
  }, [activatingConnector, connector]);
  const triedEager = useEagerConnect();
  useInactiveListener(!triedEager || !!activatingConnector);
  const connectWallet = getConnectWalletHandler(activate);

  const tokenAddresses = tokens.map((token) => token.address);
  const iouTokenAddresses = tokens.map((token) => token.iouToken);

  const { data: iouBalances, mutate: updateIouBalances } = useSWR(
    ["Migration:iouBalances", CHAIN_ID, readerAddress, "getTokenBalancesWithSupplies", account || AddressZero],
    {
      fetcher: fetcher(library, Reader, [iouTokenAddresses]),
    }
  );

  const { data: balances, mutate: updateBalances } = useSWR(
    ["Migration:balances", CHAIN_ID, readerAddress, "getTokenBalancesWithSupplies", account || AddressZero],
    {
      fetcher: fetcher(library, Reader, [tokenAddresses]),
    }
  );

  const { data: migratedAmounts, mutate: updateMigratedAmounts } = useSWR(
    ["Migration:migratedAmounts", CHAIN_ID, gmxMigratorAddress, "getTokenAmounts"],
    {
      fetcher: fetcher(library, GmxMigrator, [tokenAddresses]),
    }
  );

  let gmxBalance;
  let totalMigratedGmx;
  let totalMigratedUsd;

  if (iouBalances) {
    gmxBalance = bigNumberify(0);
    totalMigratedGmx = bigNumberify(0);

    for (let i = 0; i < iouBalances.length / 2; i++) {
      gmxBalance = gmxBalance.add(iouBalances[i * 2]);
      totalMigratedGmx = totalMigratedGmx.add(iouBalances[i * 2 + 1]);
    }

    totalMigratedUsd = totalMigratedGmx.mul(gmxPrice);
  }

  useEffect(() => {
    if (active) {
      library.on("block", () => {
        updateBalances(undefined, true);
        updateIouBalances(undefined, true);
        updateMigratedAmounts(undefined, true);
      });
      return () => {
        library.removeAllListeners("block");
      };
    }
  }, [active, library, updateBalances, updateIouBalances, updateMigratedAmounts]);

  const showMigrationModal = (index) => {
    setIsPendingApproval(false);
    setMigrationValue("");
    setMigrationIndex(index);
    setIsMigrationModalVisible(true);
  };

  return (
    <div className="Migration Page">
      <MigrationModal
        isVisible={isMigrationModalVisible}
        setIsVisible={setIsMigrationModalVisible}
        isPendingApproval={isPendingApproval}
        setIsPendingApproval={setIsPendingApproval}
        value={migrationValue}
        setValue={setMigrationValue}
        index={migrationIndex}
        balances={balances}
        active={active}
        account={account}
        library={library}
      />
      <div>
        <div className="Stake-title App-hero">
          <div className="Stake-title-primary App-hero-primary">
            ${formatAmount(totalMigratedUsd, decimals + 18, 0, true)}
          </div>
          <div className="Stake-title-secondary">Total Assets Migrated</div>
        </div>
      </div>
      <div className="Migration-note">Your wallet: {formatAmount(gmxBalance, 18, 4, true)} GMX</div>
      <div className="Migration-note">
        Please read the&nbsp;
        <a
          href="https://gambitprotocol.medium.com/gambit-gmx-migration-now-live-2ba999d208dd"
          target="_blank"
          rel="noopener noreferrer"
        >
          Medium post
        </a>{" "}
        before migrating.
      </div>
      <div className="Migration-cards">
        {tokens.map((token, index) => {
          const { cap, price, bonus } = token;
          const hasCap = cap.lt(MaxUint256);
          return (
            <div className={cx("border", "App-card", { primary: index === 0 })} key={index}>
              <div className="Stake-card-title App-card-title">{token.name}</div>
              <div className="Stake-card-bottom App-card-content">
                <div className="Stake-info App-card-row">
                  <div className="label">Wallet</div>
                  <div>{formatArrayAmount(balances, index * 2, 18, 4, true)}</div>
                </div>
                <div className="Stake-info App-card-row">
                  <div className="label">Migration Price</div>
                  <div>${formatAmount(price, decimals, 2, true)}</div>
                </div>
                <div className="Stake-info App-card-row">
                  <div className="label">Bonus Tokens</div>
                  <div>{parseFloat(bonus).toFixed(2)}%</div>
                </div>
                <div className="Stake-info App-card-row">
                  <div className="label">Migrated</div>
                  {!hasCap && <div>{formatArrayAmount(migratedAmounts, index, 18, 0, true)}</div>}
                  {hasCap && (
                    <div>
                      {formatArrayAmount(migratedAmounts, index, 18, 0, true)} / {formatAmount(cap, 18, 0, true)}
                    </div>
                  )}
                </div>
                <div className="App-card-options">
                  {!active && (
                    <button className="App-button-option App-card-option" onClick={connectWallet}>
                      Connect Wallet
                    </button>
                  )}
                  {active && (
                    <button className="App-button-option App-card-option" onClick={() => showMigrationModal(index)}>
                      Migrate
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <Footer />
    </div>
  );
}
