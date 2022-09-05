import { BigNumber, ethers } from "ethers";
import { useEffect, useState } from "react";
import { callContract } from "../legacy";
import { getContract } from "../../config/Addresses";
import Competition from "./../../abis/Competition.json";
import { isAddressZero } from "../../lib/legacy";

export async function checkTeamName(chainId, library, name, competitionIndex) {
  if (!chainId || !library) {
    return false
  }

  const contract = getCompetitionContract(chainId, library)
  return await contract.validateName(competitionIndex, name)
}

export function useCompetitionDetails(chainId, library, competitionIndex) {
  const [loading, setLoading] = useState(true)

  const [data, setData] = useState<{
    start: number,
    end: number,
    registrationActive: boolean,
    active: boolean
  }>({
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
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function main() {
      if (!chainId || !library) {
        return
      }

      const contract = getCompetitionContract(chainId, library)

      const team = await contract.getTeam(competitionIndex, leaderAddress)

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
        positions: []
      })

      setLoading(false)
    }

    main()
  }, [chainId, library, leaderAddress, competitionIndex]);

  return { data, loading };
}

export function useUserTeam(chainId, library, competitionIndex, leaderAddress) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function main () {
      if (!leaderAddress) {
        return setLoading(false)
      }

      const contract = getCompetitionContract(chainId, library)
      const team = await contract.getTeam(competitionIndex, leaderAddress)

      if (isAddressZero(team.leaderAddress)) {
        return setLoading(false)
      }

      setData({
        leader: team.leaderAddress,
        name: team.name,
      })

      setLoading(false)
    }

    main()
  }, [chainId, library, competitionIndex, leaderAddress])

  return { data, loading }
}

export function createTeam(chainId, library, competitionIndex, name, opts) {
  const contract = getCompetitionContract(chainId, library)
  return callContract(chainId, contract, "createTeam", [competitionIndex, name], opts)
}

function getCompetitionContract(chainId, library) {
  const address = getContract(chainId, "Competition");
  return new ethers.Contract(address, Competition.abi, library.getSigner());
}
