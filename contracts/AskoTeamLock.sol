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
        address[] memory _teamMembers,
        IERC20 _askoToken
    ) public initializer {
        releaseAmount = _releaseAmount;
        releaseInterval = _releaseInterval;
        releaseStart = _releaseStart;
        askoToken = _askoToken;

        for (uint i = 0; i < _teamMembers.length; i++) {
            teamMembers.push(_teamMembers[i]);
        }
    }

    function claim() public {
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
