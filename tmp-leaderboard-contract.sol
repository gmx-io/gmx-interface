pragma solidity ^0.6.0;

import "https://github.com/gmx-io/gmx-contracts/blob/master/contracts/referrals/ReferralStorage.sol";

contract CompetitionRegistration
{
    uint startTime;
    uint endTime;
    ReferralStorage referralStorage;

    struct Team {
        address leader;
        string name;
        bytes32 referralCode;
    }

    mapping(address => Team) getTeam;
    Team[] getTeams;

    mapping(address => address) getMemberTeam;
    mapping(address => address[]) getTeamMembers;

    mapping(address => mapping(address => bool)) private joinRequests;
    mapping(address => address[]) getJoinRequests;

    modifier isOpen()
    {
        require(startTime <= block.timestamp, "Competition registration is not opened yet");
        require(endTime > block.timestamp, "Competition registration is closed");
        _;
    }

    constructor (uint start, uint end, address _referralStorage) public
    {
        startTime = start;
        endTime = end;
        referralStorage = ReferralStorage(_referralStorage);
    }

    function register(string calldata name, bytes32 referralCode) external isOpen
    {
        require(getTeam[msg.sender].leader == address(0), "you already have a team");
        require(getMemberTeam[msg.sender] == address(0), "you already joined a team as a member");
        require(referralStorage.codeOwners(referralCode) == msg.sender, "you must own the referral code");

        getTeam[msg.sender] = Team(msg.sender, name, referralCode);
        getTeams.push(getTeam[msg.sender]);
        getMemberTeam[msg.sender] = msg.sender;
        getTeamMembers[msg.sender].push(msg.sender);
    }

    function createJoinRequest(address leaderAddress) external isOpen
    {
        require(getTeam[leaderAddress].leader == leaderAddress, "team does not exist");
        require(getTeam[msg.sender].leader == address(0), "team leaders cannot create join requests");
        require(getMemberTeam[msg.sender] == address(0), "you already joined a team");

        joinRequests[leaderAddress][msg.sender] = true;
        getJoinRequests[leaderAddress].push(msg.sender);
    }

    function approveJoinRequest(address memberAddress) external isOpen
    {
        require(joinRequests[msg.sender][memberAddress], "no join request for this address");
        require(getMemberTeam[memberAddress] == address(0), "member already joined a team");

        getMemberTeam[memberAddress] = msg.sender;
        getTeamMembers[msg.sender].push(memberAddress);
    }
}
