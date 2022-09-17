import { BigNumber, ethers } from "ethers";
import { useEffect, useState } from "react";
import { callContract } from "../legacy";
import { getContract } from "../../config/Addresses";
import Competition from "./../../abis/Competition.json";
import { isAddressZero } from "../../lib/legacy";
import { Competition as CompetitionType, JoinRequest, Team } from "./types";
import { encodeReferralCode } from "../referrals"

export async function checkTeamName(chainId, library, name, competitionIndex) {
  if (!chainId || !library) {
    return false
  }

  const contract = getCompetitionContract(chainId, library)
  return await contract.validateName(competitionIndex, name)
}

export function useCompetitionDetails(chainId, library, competitionIndex) {
  const [loading, setLoading] = useState(true)

  const [data, setData] = useState<CompetitionType>({
    index: 0,
    start: 0,
    end: 0,
    registrationActive: false,
    active: false,
  });

  useEffect(() => {
    async function main() {
      if (!chainId || !library) {
        return
      }

      const ts = Math.round(Date.now() / 1000);

      const contract = getCompetitionContract(chainId, library);
      const { start, end } = await contract.competitions(competitionIndex);

      setData({
        index: competitionIndex,
        start: start.toNumber(),
        end: end.toNumber(),
        registrationActive: start.gt(ts),
        active: start.lte(ts) && end.gt(ts),
      })

      setLoading(false)
    }

    main()
  }, [chainId, library, competitionIndex]);

  return { data, loading };
}

export function useTeam(chainId, library, competitionIndex, leaderAddress) {
  const [data, setData] = useState<Team>({
    rank: 0,
    realizedPnl: BigNumber.from("0"),
    leaderAddress: "",
    name: "",
    members: [],
    positions: [],
    competitionIndex: 0,
  });
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function main() {
      if (!chainId || !library) {
        return
      }

      const contract = getCompetitionContract(chainId, library)

      const team = await contract.getTeam(competitionIndex, leaderAddress)

      if (isAddressZero(team.leaderAddress)) {
        setExists(false)
        return setLoading(false);
      }

      let members: Array<any> = []
      let i = 0
      while (true) {
        let tmpMembers = await contract.getTeamMembers(competitionIndex, leaderAddress, i * 50, (i + 1) * 50)

        tmpMembers = tmpMembers.filter(member => !isAddressZero(member))
        tmpMembers.forEach(member => { members.push(member) })

        if (tmpMembers.length < 50) {
          break
        }

        i++
      }

      setData({
        rank: 1,
        realizedPnl: BigNumber.from("100000000000000000000000000000000000"),
        leaderAddress: team.leaderAddress,
        name: team.name,
        members: members,
        positions: [],
        competitionIndex: competitionIndex,
      })

      setExists(true)
      setLoading(false)
    }

    main()
  }, [chainId, library, leaderAddress, competitionIndex]);

  return { data, exists, loading };
}

export function useMemberTeam(chainId, library, competitionIndex, account) {
  const [data, setData] = useState(ethers.constants.AddressZero);
  const [hasTeam, setHasTeam] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function main() {
      if (!chainId || !library) {
        return
      }

      const contract = getCompetitionContract(chainId, library)
      const res = await contract.getMemberTeam(competitionIndex, account)
      setData(res)
      setLoading(false)
      setHasTeam(!isAddressZero(res))
    }

    main()
  }, [chainId, library, competitionIndex, account])

  return { data, loading, hasTeam }
}

export function createTeam(chainId, library, competitionIndex, name, opts) {
  const contract = getCompetitionContract(chainId, library)
  return callContract(chainId, contract, "createTeam", [competitionIndex, name], opts)
}

export function createJoinRequest(chainId, library, competitionIndex, leaderAddress, referralCode, opts) {
  const contract = getCompetitionContract(chainId, library)
  return callContract(chainId, contract, "createJoinRequest", [competitionIndex, leaderAddress, encodeReferralCode(referralCode)], opts)
}

export function cancelJoinRequest(chainId, library, competitionIndex, opts) {
  const contract = getCompetitionContract(chainId, library)
  return callContract(chainId, contract, "cancelJoinRequest", [competitionIndex], opts)
}

export function approveJoinRequest(chainId, library, competitionIndex, account, opts) {
  const contract = getCompetitionContract(chainId, library)
  return callContract(chainId, contract, "approveJoinRequest", [competitionIndex, account], opts)
}

export async function getAccountJoinRequest(chainId, library, competitionIndex, account): Promise<JoinRequest|null> {
  const contract = getCompetitionContract(chainId, library)
  const res = await contract.getJoinRequest(competitionIndex, account)

  if (isAddressZero(res)) {
    return null;
  }

  return {
    leaderAddress: res,
    account: account,
  }
}

export function useAccountJoinRequest(chainId, library, competitionIndex, account) {
  const [data, setData] = useState<JoinRequest>({
    leaderAddress: ethers.constants.AddressZero,
    account: ethers.constants.AddressZero,
  })

  const [loading, setLoading] = useState(true)
  const [exists, setExists] = useState(false)

  useEffect(() => {
    async function main () {
      const req = await getAccountJoinRequest(chainId, library, competitionIndex, account)

      if (req === null) {
        setExists(false)
        setLoading(false)
        return
      }

      setData(req)
      setExists(true)
      setLoading(false)
    }

    main()
  }, [chainId, library, account, competitionIndex])

  return { data, loading, exists }

}

export function getCompetitionContract(chainId, library) {
  const address = getContract(chainId, "Competition");
  return new ethers.Contract(address, Competition.abi, library.getSigner());
}
