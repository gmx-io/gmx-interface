import { ethers } from "ethers";
import { gql } from "@apollo/client";
import { useState, useEffect } from "react";

import {
  ARBITRUM,
  // AVALANCHE,
} from "../Helpers";
import {
  arbitrumReferralsGraphClient
} from "./common"

function getGraphClient(chainId) {
  if (chainId === ARBITRUM) {
    return arbitrumReferralsGraphClient;
  // } else if (chainId === AVALANCHE) {
  //   return avalancheGraphClient;
  }
  throw new Error(`Unsupported chain ${chainId}`);
}

const DISTRIBUTION_TYPE_REBATES = "1"
const DISTRIBUTION_TYPE_DISCOUNT = "2"

export function decodeReferralCode(bytesCode) {
  try {
    ethers.utils.parseBytes32String(bytesCode)
  } catch (ex) {
    return bytesCode
  }
}

export function encodeReferralCode(code) {
  if (code.length > 31) {
    throw new Error("Code is too big")
  }
  ethers.utils.formatBytes32String(code)
}

export function useReferralsData(chainId, account) {
  const query = gql(`{
    distributions(
      first: 1000,
      orderBy: timestamp,
      orderDirection: desc,
      where: {
        receiver: "__ACCOUNT__",
        typeId_in: ["__DISTRIBUTION_TYPE_REBATES__", "__DISTRIBUTION_TYPE_DISCOUNT__"]
      }
    ) {
      receiver
      amount
      typeId
      token
      transactionHash
      timestamp
    }
    totalStats: referralVolumeStats(
      first: 1000
      where: {
        period: total
        referrer: "__ACCOUNT__"
      }
    ) {
      referralCode,
      volume,
      trades,
      tradedReferralsCount,
      totalRebateUsd,
      discountUsd
    }
  }`
    .replaceAll("__ACCOUNT__", (account || "").toLowerCase())
    .replaceAll("__DISTRIBUTION_TYPE_REBATES__", DISTRIBUTION_TYPE_REBATES)
    .replaceAll("__DISTRIBUTION_TYPE_DISCOUNT__", DISTRIBUTION_TYPE_DISCOUNT)
  );

  const [data, setData] = useState();

  useEffect(() => {
    getGraphClient(chainId).query({ query }).then(res => {
      const rebateDistributions = []
      const discountDistributions = []
      res.data.distributions.forEach(d => {
        if (d.typeId === DISTRIBUTION_TYPE_REBATES) {
          rebateDistributions.push(d)
        } else {
          discountDistributions.push(d)
        }
      })
      setData({
        rebateDistributions,
        discountDistributions,
        totalStats: res.data.totalStats.map(e => {
          return {
            ...e,
            referralCode: decodeReferralCode(e.referralCode)
          }
        })
      })
    }).catch(console.warn);
  }, [setData, query, chainId]);

  return data || null;
}
