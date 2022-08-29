import { BigNumber } from "ethers";
import { useEffect, useState } from "react";

export async function checkTeamName(chainId, library, name) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, 500);
  });
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
            pnl: BigNumber.from("100000000000000000000000000000000000"),
          },
        ]);
      }, 1000);
    }

    main();
  }, [setStats]);

  return stats;
}
