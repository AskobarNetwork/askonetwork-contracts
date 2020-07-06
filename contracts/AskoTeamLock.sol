pragma solidity 0.5.16;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";


contract AskoTeamLock is Initializable {
    using SafeMath for uint;

    uint public releaseInterval;
    uint public releaseStart;
    uint public releaseAmount;
    IERC20 private askoToken;
    address[] public teamMembers;

    mapping(address => uint) public teamMemberClaimed;

    modifier onlyAfterStart {
        require(releaseStart != 0 && now > releaseStart, "Has not yet started.");
        _;
    }

    function initialize(
        uint _releaseAmount,
        uint _releaseInterval,
        uint _releaseStart,
        IERC20 _askoToken
    ) public initializer {
        releaseAmount = _releaseAmount;
        releaseInterval = _releaseInterval;
        releaseStart = _releaseStart;
        askoToken = _askoToken;

        teamMembers.push(0xd04371F7b83a317Ff92DF60915Ca1C7037a01a4c);
        teamMembers.push(0x4771a883088CD7BEae45f7d84CFbFDCF18f726c5);
        teamMembers.push(0xFD9fc91e1Bc8fBBa21ef3EbFd07EAB1247aF8B41);
        teamMembers.push(0xF142e06408972508619ee93C2b8bff15ef7c2cb3);
    }

    function claim() public returns(uint) {
        require(checkIfTeamMember(msg.sender), "Can only be called by team members.");
        uint cycle = getCurrentCycleCount();
        uint totalClaimAmount = cycle.mul(releaseAmount);
        uint toClaim = totalClaimAmount.sub(teamMemberClaimed[msg.sender]);
        teamMemberClaimed[msg.sender] = teamMemberClaimed[msg.sender].add(toClaim);
        askoToken.transfer(msg.sender, toClaim);
    }

    function getCurrentCycleCount() public view returns (uint) {
        if (now <= releaseStart) return 0;
        return now.sub(releaseStart).div(releaseInterval).add(1);
    }

    function checkIfTeamMember(address member) internal view returns (bool) {
        for (uint i; i < teamMembers.length; i++) {
            if (teamMembers[i] == member)
                return true;
        }
        return false;
    }

}
