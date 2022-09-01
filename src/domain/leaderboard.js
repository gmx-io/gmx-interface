import { BigNumber, ethers } from "ethers";
import { useEffect, useState } from "react";
import { getContract } from "../config/Addresses";
import Competition from "./../abis/Competition.json";

const COMPETITION_INDEX = 0;

export async function checkTeamName(chainId, library, name) {
  const contract = getCompetitionContract(chainId, library);
  return await contract.validateName(COMPETITION_INDEX, name);
}

export function useCompetitionTimes(chainId, library) {
  const [times, setTimes] = useState(null);
  const ts = Math.round(Date.now() / 1000);

  useEffect(() => {
    setTimeout(() => {
      const registrationStart = ts + 5;
      const registrationEnd = ts + 10;
      const start = ts + 10;
      const end = ts + 20;

      setTimes({
        registrationStart,
        registrationEnd,
        start,
        end,
        registrationActive: true,
        active: start <= ts && end > ts,
      });
    }, 1000);
  }, [setTimes, ts]);

  return times;
}

export function useTeamLeaderboardStats(chainId, library) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    async function main() {
      setTimeout(() => {
        setStats([
          {
            id: "0x0000",
            rank: 1,
            label: "Morazzela",
            realizedPnl: BigNumber.from("100000000000000000000000000000000000").toString(),
          },
        ]);
      }, 1000);
    }

    main();
  }, [setStats]);

  return stats;
}

export function useTeam(chainId, library) {
  const [team, setTeam] = useState(null);

  useEffect(() => {
    setTimeout(() => {
      setTeam({
        leader: "000",
        name: "Morazzela",
        rank: 1,
        realizedPnl: BigNumber.from("142029000000000000000000000000000000").toString(),
        members: [
          {
            id: "0x001",
          },
        ],
        positions: [],
      });
    }, 1000);
  }, [setTeam]);

  return team;
}

function getCompetitionContract(chainId, library) {
  const address = getContract("Competition", chainId);
  return new ethers.Contract(address, Competition.abi, library.getSigner());
}
