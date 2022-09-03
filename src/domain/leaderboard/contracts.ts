import { BigNumber } from "ethers";
import { useEffect, useState } from "react";
// import { getContract } from "../../config/Addresses";
// import Competition from "./../../abis/Competition.json";

export async function checkTeamName(chainId, library, name, competitionIndex) {
  return true;
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

  const ts = Math.round(Date.now() / 1000);

  useEffect(() => {
    async function main() {
      // const contract = getCompetitionContract(chainId, library);
      // const res = await contract.competitions(competitionIndex);

      // setData({
      //   start: res.start,
      //   end: res.end,
      //   registrationActive: res.start > ts,
      //   active: res.start <= ts && res.end > ts,
      // })

      setTimeout(() => {
        setData({
          start: ts + 20,
          end: ts + 60,
          registrationActive: true,
          active: false,
        })
        setLoading(false)
      }, 1000)

    }

    main()
  }, [chainId, ts]);

  return { data, loading };
}

export function useTeam(chainId, library) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    setTimeout(() => {
      setData({
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

      setLoading(false)
    }, 1000);
  }, [setData]);

  return { data, loading };
}

// function getCompetitionContract(chainId, library) {
//   const address = getContract("Competition", chainId);
//   return new ethers.Contract(address, Competition.abi, library.getSigner());
// }
