import { ethers } from "ethers";
import { useState } from "react";
import { callContract } from "lib/contracts";
import { getContract } from "config/contracts";
import Competition from "abis/Competition.json";
import { isAddressZero } from "lib/legacy";
import { JoinRequest } from "./types";
import { encodeReferralCode } from "domain/referrals";
import useSWR from "swr";

export async function checkTeamName(chainId, library, name, competitionIndex) {
  if (!chainId || !library) {
    return false;
  }

  const contract = getCompetitionContract(chainId, library);
  return await contract.validateName(competitionIndex, name);
}
export function useMemberTeam(chainId, library, competitionIndex, account) {
  const [data, setData] = useState(ethers.constants.AddressZero);
  const [hasTeam, setHasTeam] = useState(false);
  const [loading, setLoading] = useState(false);

  const { revalidate } = useSWR([chainId, library, competitionIndex, account], () => {
    async function main() {
      if (!chainId || !library) {
        return;
      }

      if (competitionIndex === null) {
        return;
      }

      if (!account || isAddressZero(account)) {
        setLoading(false);
        setHasTeam(false);
        return;
      }

      if (!hasCompetitionContract(chainId)) {
        setLoading(false);
        setHasTeam(false);
        return;
      }

      const contract = getCompetitionContract(chainId, library);
      const res = await contract.getMemberTeam(competitionIndex, account);
      setData(res);
      setHasTeam(!isAddressZero(res));
      setLoading(false);
    }

    main();
  });

  return { data, loading, hasTeam, revalidate };
}

export async function getAccountJoinRequest(chainId, library, competitionIndex, account): Promise<JoinRequest | null> {
  if (!chainId || !library) {
    return null;
  }

  if (!hasCompetitionContract(chainId)) {
    return null;
  }

  const contract = getCompetitionContract(chainId, library);
  const res = await contract.getJoinRequest(competitionIndex, account);

  if (isAddressZero(res)) {
    return null;
  }

  return {
    leaderAddress: res,
    account: account,
  };
}

export function useAccountJoinRequest(chainId, library, competitionIndex, account) {
  const [data, setData] = useState<JoinRequest>({
    leaderAddress: ethers.constants.AddressZero,
    account: ethers.constants.AddressZero,
  });

  const [loading, setLoading] = useState(true);
  const [exists, setExists] = useState(false);

  const { revalidate } = useSWR(chainId && library && [chainId, library, account, competitionIndex], () => {
    async function main() {
      const req = await getAccountJoinRequest(chainId, library, competitionIndex, account);

      if (req === null) {
        setExists(false);
        setLoading(false);
        return;
      }

      setData(req);
      setExists(true);
      setLoading(false);
    }

    main();
  });

  return { data, loading, exists, revalidate };
}

export async function getTeamMembers(chainId, library, competitionIndex, leaderAddress): Promise<string[]> {
  const members: string[] = [];

  if (!hasCompetitionContract(chainId)) {
    return members;
  }

  const contract = getCompetitionContract(chainId, library);

  for (let i = 0; ; i++) {
    let res = await contract.getTeamMembers(competitionIndex, leaderAddress, i * 50, i * 50 + 50);
    res = res.filter((addr) => !isAddressZero(addr));
    res.forEach((addr) => {
      members.push(addr);
    });
    if (res.length < 50) {
      break;
    }
  }

  return members;
}

export function createTeam(chainId, library, competitionIndex, name, opts) {
  const contract = getCompetitionContract(chainId, library);
  return callContract(chainId, contract, "createTeam", [competitionIndex, name], opts);
}

export function createJoinRequest(chainId, library, competitionIndex, leaderAddress, referralCode, opts) {
  const contract = getCompetitionContract(chainId, library);
  return callContract(
    chainId,
    contract,
    "createJoinRequest",
    [competitionIndex, leaderAddress, encodeReferralCode(referralCode)],
    opts
  );
}

export function cancelJoinRequest(chainId, library, competitionIndex, opts) {
  const contract = getCompetitionContract(chainId, library);
  return callContract(chainId, contract, "cancelJoinRequest", [competitionIndex], opts);
}

export function approveJoinRequest(chainId, library, competitionIndex, account, opts) {
  const contract = getCompetitionContract(chainId, library);
  return callContract(chainId, contract, "approveJoinRequest", [competitionIndex, account], opts);
}

export function removeMember(chainId, library, competitionIndex, leaderAddress, account, opts) {
  const contract = getCompetitionContract(chainId, library);
  return callContract(chainId, contract, "removeMember", [competitionIndex, leaderAddress, account], opts);
}

export function getCompetitionContract(chainId, library) {
  const address = getContract(chainId, "Competition");
  return new ethers.Contract(address, Competition.abi, library.getSigner());
}

export function hasCompetitionContract(chainId) {
  try {
    getContract(chainId, "Competition");
    return true;
  } catch (_) {
    return false;
  }
}
