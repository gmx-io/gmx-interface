export const GMX_DAO_LINKS = {
  VOTING_POWER: "https://www.tally.xyz/gov/gmx/my-voting-power",
  DELEGATES: "https://www.tally.xyz/gov/gmx/delegates",
};

export const getGmxDAODelegateLink = (address: string) => `https://www.tally.xyz/gov/gmx/delegate/${address}`;
