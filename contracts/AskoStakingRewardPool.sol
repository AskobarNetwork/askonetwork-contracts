pragma solidity 0.5.16;

import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";
import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "./library/BasisPoints.sol";
import "./interfaces/IStakeHandler.sol";
import "./AskoStaking.sol";


contract AskoStakingRewardPool is Initializable, IStakeHandler, Ownable {
    using BasisPoints for uint;
    using SafeMath for uint;

    uint public releaseBP;
    uint public releaseInterval;
    uint public releaseStart;
    IERC20 private askoToken;
    AskoStaking private askoStaking;

    mapping(address => bool) public registeredStakers;
    mapping(uint => mapping(address=>uint)) public cycleRegistrantAmount;
    mapping(uint => mapping(address=>uint)) public cycleRegistrantClaimed;
    mapping(uint => uint) public cycleTotalRegistered;

    uint public reservedForClaims;
    uint public lastCycleSetReservedForClaims;
    mapping(uint => uint) public cycleTotalReservations;

    modifier onlyFromAskoStaking {
        require(msg.sender == address(askoStaking), "Sender must be AskoStaking sc.");
        _;
    }

    modifier onlyAfterStart {
        require(releaseStart != 0 && now > releaseStart, "Has not yet started.");
        _;
    }

    function handleStake(address staker, uint stakerDeltaValue, uint stakerFinalValue) external onlyFromAskoStaking {
        if (!registeredStakers[staker]) return;
        uint nextCycle = getCurrentCycleCount().add(1);
        cycleRegistrantAmount[nextCycle][staker] = stakerFinalValue;
        cycleTotalRegistered[nextCycle] = cycleTotalRegistered[nextCycle] + stakerDeltaValue;
    }

    function handleUnstake(address staker, uint stakerDeltaValue, uint stakerFinalValue) external onlyFromAskoStaking {
        if (!registeredStakers[staker]) return;
        uint currentCycle = getCurrentCycleCount();
        uint nextCycle = currentCycle.add(1);
        uint currentCycleRegistrantAmount = cycleRegistrantAmount[currentCycle][staker];
        if (currentCycleRegistrantAmount > stakerFinalValue) {
            uint delta = currentCycleRegistrantAmount.sub(stakerFinalValue);
            cycleRegistrantAmount[currentCycle][staker] = stakerFinalValue;
            cycleTotalRegistered[currentCycle] = cycleTotalRegistered[currentCycle] - delta;
        }
        cycleRegistrantAmount[nextCycle][staker] = stakerFinalValue;
        cycleTotalRegistered[nextCycle] = cycleTotalRegistered[nextCycle] - stakerDeltaValue;
    }

    function initialize(
        uint _releaseBP,
        uint _releaseInterval,
        uint _releaseStart,
        address _owner,
        IERC20 _askoToken,
        AskoStaking _askoStaking
    ) public initializer {
        Ownable.initialize(msg.sender);

        releaseBP = _releaseBP;
        releaseInterval = _releaseInterval;
        releaseStart = _releaseStart;
        askoToken = _askoToken;
        askoStaking = _askoStaking;

        //Due to issue in oz testing suite, the msg.sender might not be owner
        _transferOwnership(_owner);
    }

    function register() public {
        require(registeredStakers[msg.sender] == false, "Must not have registered before.");
        setReservedForClaims();
        uint amount = askoStaking.stakeValue(msg.sender);
        uint currentCycle = getCurrentCycleCount();
        cycleRegistrantAmount[currentCycle.add(1)][msg.sender] = amount;
        cycleTotalRegistered[currentCycle.add(1)] = cycleTotalRegistered[currentCycle.add(1)].add(amount);
        registeredStakers[msg.sender] = true;
    }

    function claim(uint cycle) public onlyAfterStart {
        setReservedForClaims();
        uint currentCycle = getCurrentCycleCount();
        require(registeredStakers[msg.sender], "Must register to be eligble for rewards.");
        require(cycle > 0, "Cannot claim for tokens staked before first cycle starts.");
        require(currentCycle > 1, "Cannot claim until first cycle completes.");
        require(currentCycle > cycle, "Can only claim for previous cycles.");
        require(cycleRegistrantAmount[cycle][msg.sender] > 0, "Must have registered stake for cycle.");
        require(cycleRegistrantClaimed[cycle][msg.sender] == 0, "Must not have claimed for cycle.");
        uint payout = calculatePayout(msg.sender, cycle);
        cycleRegistrantClaimed[cycle][msg.sender] = 0;
        reservedForClaims = reservedForClaims.sub(payout);
        askoToken.transfer(msg.sender, payout);
    }

    function setReleaseBP(uint _releaseBP) public onlyOwner {
        releaseBP = _releaseBP;
    }

    function setStartTime(uint _releaseStart) public onlyOwner {
        releaseStart = _releaseStart;
    }

    function calculatePayout(address staker, uint cycle) public view returns (uint) {
        if (!registeredStakers[staker]) return 0;
        if (cycleRegistrantClaimed[cycle][msg.sender] != 0) return 0;
        uint cycleTotalRegistered = cycleTotalRegistered[cycle];
        uint stakerRegistered = cycleRegistrantAmount[cycle][registrant];
        //TODO: Fix payout
        //TODO: Fix autoregistriaon - may require registration if no other action taken in 30 days.
        if (cycleTotalRegistered == 0) return 0;
        return cyclePayout.mul(cycleRegistrantAmount[cycle][staker]).div(cycleTotalRegistered);
    }

    function getCycleRegistrantAmount(uint cycle, address registrant) public view returns (uint) {
        return cycleRegistrantAmount[cycle][registrant];
    }

    function getCycleRegistrantClaim(uint cycle, address registrant) public view returns (uint) {
        return cycleRegistrantClaimed[cycle][registrant];
    }

    function getCurrentCycleCount() public view returns (uint) {
        if (now <= releaseStart) return 0;
        return now.sub(releaseStart).div(releaseInterval).add(1);
    }

    function setReservedForClaims() internal {
        uint cycle = getCurrentCycleCount();
        if (cycle <= lastCycleSetReservedForClaims) return;
        lastCycleSetReservedForClaims = cycle;
        uint reservation = askoToken.balanceOf(address(this)).sub(reservedForClaims).mulBP(releaseBP);
        reservedForClaims = reservedForClaims.add(reservation);
        cycleTotalReservations[cycle] = reservation;
    }
}
