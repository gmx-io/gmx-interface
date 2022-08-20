pragma solidity 0.8.16;

contract CompetitionRegistration
{
    uint immutable startTime;
    uint immutable endTime;

    struct Team {
        address leader;
        string name;
    }

    mapping(address => Team) teams;

    modifier isOpen()
    {
        require(startTime <= block.timestamp, "Competition registration is not opened yet");
        require(endTime > block.timestamp, "Competition registration is closed");
        _;
    }

    constructor (uint start, uint end)
    {
        startTime = start;
        endTime = end;
    }

    function register(string calldata name) external isOpen
    {
        teams[msg.sender] = Team(msg.sender, name);
    }
}
