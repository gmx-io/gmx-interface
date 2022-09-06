import { BigNumber, ethers } from "ethers";
import { useEffect, useState } from "react";
import { callContract } from "../legacy";
import { getContract } from "../../config/Addresses";
import Competition from "./../../abis/Competition.json";
import { isAddressZero } from "../../lib/legacy";

type CompetitionDetails = {
  start: number;
  end: number;
  registrationActive: boolean;
  active: boolean;
}

export async function checkTeamName(chainId, library, name, competitionIndex) {
  if (!chainId || !library) {
    return false
  }

  const contract = getCompetitionContract(chainId, library)
  return await contract.validateName(competitionIndex, name)
}

export function useCompetitionDetails(chainId, library, competitionIndex) {
  const [loading, setLoading] = useState(true)

  const [data, setData] = useState<CompetitionDetails>({
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

type Team = {
  rank: number,
  realizedPnl: BigNumber,
  leaderAddress: string,
  name: string;
  members: string[],
  positions: any[],
}

export function useTeam(chainId, library, competitionIndex, leaderAddress) {
  const [data, setData] = useState<Team>({
    rank: 0,
    realizedPnl: BigNumber.from("0"),
    leaderAddress: "",
    name: "",
    members: [],
    positions: [],
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
        positions: []
      })

      setLoading(false)
      setExists(true)
    }

    main()
  }, [chainId, library, leaderAddress, competitionIndex]);

  return { data, exists, loading };
}

export function createTeam(chainId, library, competitionIndex, name, opts) {
  const contract = getCompetitionContract(chainId, library)
  return callContract(chainId, contract, "createTeam", [competitionIndex, name], opts)
}

function getCompetitionContract(chainId, library) {
  const address = getContract(chainId, "Competition");
  return new ethers.Contract(address, Competition.abi, library.getSigner());
}
