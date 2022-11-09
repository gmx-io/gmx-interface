import React, { useState, useEffect } from "react";
import { useHistory } from "react-router-dom";
import { Trans, t } from "@lingui/macro";
import { useWeb3React } from "@web3-react/core";
import useSWR from "swr";
import { ethers } from "ethers";
import Tab from "../Tab/Tab";
import cx from "classnames";
import { getContract } from "config/contracts";
import {
  getBuyGlpToAmount,
  getBuyGlpFromAmount,
  getSellGlpFromAmount,
  getSellGlpToAmount,
  adjustForDecimals,
  GLP_DECIMALS,
  USD_DECIMALS,
  BASIS_POINTS_DIVISOR,
  GLP_COOLDOWN_DURATION,
  SECONDS_PER_YEAR,
  USDG_DECIMALS,
  PLACEHOLDER_ACCOUNT,
  importImage,
} from "lib/legacy";

import { useGmxPrice } from "domain/legacy";

import TokenSelector from "../Exchange/TokenSelector";
import BuyInputSection from "../BuyInputSection/BuyInputSection";
import Tooltip from "../Tooltip/Tooltip";

import ReaderV2 from "abis/ReaderV2.json";
import RewardReader from "abis/RewardReader.json";
import VaultV2 from "abis/VaultV2.json";
import GlpManager from "abis/GlpManager.json";
import RewardTracker from "abis/RewardTracker.json";
import Vester from "abis/Vester.json";
import RewardRouter from "abis/RewardRouter.json";
import Token from "abis/Token.json";

import glp24Icon from "img/ic_glp_24.svg";
import glp40Icon from "img/ic_glp_40.svg";
import arrowIcon from "img/ic_convert_down.svg";

import avalanche16Icon from "img/ic_avalanche_16.svg";
import arbitrum16Icon from "img/ic_arbitrum_16.svg";

import "./GlpSwap.css";
import { useChainId } from "lib/chains";

import { GDMarketInfo } from "./GDMarketInfo";

export function GDSwap() {
  return (
    <div className="GlpSwap">
      <div className="GlpSwap-content">
        <GDMarketInfo />
      </div>
    </div>
  );
}
