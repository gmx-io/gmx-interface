import { getContract } from "../Addresses";
import CompetitionRegistration from "../abis/CompetitionRegistration.json";
import { BigNumber, ethers } from "ethers";
import { callContract } from ".";
import { decodeReferralCode, encodeReferralCode } from "./referrals";
import { useEffect, useState } from "react";
import { ARBITRUM, AVALANCHE, isAddressZero } from "../Helpers";
import { arbitrumLeaderboardClient, avalancheLeaderboardClient } from "./common";

export function useLeaderboardStats(chainId, library) {
  const [data, setData] = useState()

  useEffect(async () => {
    if (!chainId || !library) {
      return
    }

    const contract = getCompetitionContract(chainId, library)
    const res = await contract.getTeams(0)

    setData([res].map(team => ({
      leader: team.leader,
      name: team.name,
      pnl: BigNumber.from("1000000000000000000000000000000000000")
    })))
  }, [chainId, library])

  return data
  // const ts = periodToTimestamp(period, Math.round(Date.now() / 1000))

  // const query = gql(`{
  //   userStats(
  //     first: 25
  //     orderBy: pnl
  //     orderDirection: desc
  //     where: {
  //       period: "${period}"
  //       timestamp: ${ts}
  //     }
  //   ) {
  //     account
  //     pnl
  //     timestamp
  //   }
  // }`)

  // const [res, setRes] = useState();

  // useEffect(() => {
  //   Promise.all([
  //     getLeaderboardGraphClient(AVALANCHE).query({ query }),
  //     // getLeaderboardGraphClient(ARBITRUM).query({ query })
  //   ]).then(data => {
  //     const result = {}
  //     data.forEach(d => {
  //       d.data.userStats.forEach(user => {
  //         if (!result[user.account]) {
  //           result[user.account] = {
  //             id: user.account,
  //             pnl: BigNumber.from(user.pnl)
  //           }
  //         } else {
  //           result[user.account].pnl = result[user.account].pnl.add(user.pnl)
  //         }
  //       })
  //     })
  //     setRes(Object.values(result).sort((a, b) => a.pnl.gt(b.pnl) ? -1 : 1))
  //   })
  // }, [setRes, query]);

  // return res ? res : null;
}

export function useTeams(chainId, library)
{
  const [data, setData] = useState(null)

  useEffect(async () => {
    const contract = getCompetitionContract(chainId, library)
    const res = await contract.getTeams(0)
    setData([res].map(team => ({
      leader: team.leader,
      name: team.name,
      referralCode: team.referralCode
    })))
  }, [setData, library, chainId])

  return data
}

export function useTimes(chainId, library)
{
  const [data, setData] = useState(null)

  useEffect(async () => {
    if (!library || !chainId) {
      return
    }

    const contract = getCompetitionContract(chainId, library)

    const times = await Promise.all([
      contract.startTime(),
      contract.endTime()
    ])

    const ts = Math.round(Date.now() / 1000)
    const start = times[0].toNumber()
    const end = times[1].toNumber()

    setData({
      start,
      end,
      lower: ts < start,
      greater: ts > end,
      between: ts >= start && ts < end
    })

  }, [setData, chainId])

  return data
}

export function useTeam(chainId, library, account)
{
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(async () => {
    if (!chainId || !library || !account) {
      return
    }

    const contract = getCompetitionContract(chainId, library)

    const res = await contract.getTeam(account)

    if (isAddressZero(res.leader)) {
      setData(false)
      setLoading(false)
      return
    }

    setData({
      leader: res.leader,
      name: res.name,
      referralCode: decodeReferralCode(res.referralCode)
    })

    setLoading(false)
  }, [setData, setLoading, account, chainId, library])

  return { data, loading }
}


export async function registerTeam(chainId, library, name, referral, opts)
{
  referral = encodeReferralCode(referral)
  const contract = getCompetitionContract(chainId, library)
  return callContract(chainId, contract, "register", [name, referral], opts)
}

function getCompetitionContract(chainId, library)
{
  const competitionRegistrationAddress = getContract(chainId, "CompetitionRegistration")
  return new ethers.Contract(competitionRegistrationAddress, CompetitionRegistration.abi, library.getSigner())
}

function getLeaderboardGraphClient(chainId) {
  if (chainId === AVALANCHE) {
    return avalancheLeaderboardClient;
  } else if (chainId === ARBITRUM) {
    return arbitrumLeaderboardClient;
  }
  throw new Error(`Unsupported chain ${chainId}`);
}
