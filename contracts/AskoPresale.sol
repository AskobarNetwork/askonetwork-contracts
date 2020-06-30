pragma solidity 0.5.16;

import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20Mintable.sol";
import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "./uniswapV2Periphery/interfaces/IUniswapV2Router01.sol";
import "./library/BasisPoints.sol";

contract AskoPresale is Initializable, Ownable {
    using BasisPoints for uint;
    using SafeMath for uint;

    uint public maxbuyPerAddress;

    uint public maximumPresaleEther;
    uint public totalPresaleEther;

    uint public totalPresaleTokens;
    uint public totalUniswapTokens;

    uint public etherPoolDevfund;
    uint public etherPoolBuyback;
    uint public etherPoolUniswap;

    uint private buybackBP;
    uint private devfundBP;

    uint public startTime;
    uint public endTime;

    bool public isClosedByOwner = false;
    bool public requiresWhitelisting;
    bool public hasSentToUniswap = false;

    ERC20Mintable private askoToken;
    IUniswapV2Router01 private uniswapRouter;

    mapping(address => uint) public deposits;
    mapping(address => bool) public whitelist;

    modifier whenPresaleActive {
        require(totalPresaleEther < maximumPresaleEther, "Presale has sold out.");
        require(!isClosedByOwner, "Presale is closed.");
        require(startTime != 0 && now > startTime, "Presale not yet started.");
        require(endTime == 0 || now < endTime, "Presale has ended.");
        _;
    }

    modifier whenPresaleFinished {
        require(startTime != 0 && now > startTime, "Presale not yet started.");
        require(
            totalPresaleEther >= maximumPresaleEther ||
            isClosedByOwner ||
            (endTime != 0 && now > endTime),
            "Presale has not yet ended."
        );
        _;
    }

    function initialize(
        uint _buybackBP,
        uint _devfundBP,
        uint _maxbuyPerAddress,
        uint _maximumPresaleEther,
        bool _requiresWhitelisting,
        uint _totalPresaleTokens,
        uint _totalUniswapTokens,
        address owner,
        ERC20Mintable _askoToken
    ) public initializer {
        Ownable.initialize(msg.sender);

        buybackBP = _buybackBP;
        devfundBP = _devfundBP;
        askoToken = _askoToken;
        maxbuyPerAddress = _maxbuyPerAddress;
        maximumPresaleEther = _maximumPresaleEther;
        requiresWhitelisting = _requiresWhitelisting;
        totalPresaleTokens = _totalPresaleTokens;
        totalUniswapTokens = _totalUniswapTokens;

        uniswapRouter = IUniswapV2Router01(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);

        require(askoToken.balanceOf(address(this)) == totalPresaleTokens.add(totalUniswapTokens));
        askoToken.approve(address(uniswapRouter), totalUniswapTokens);
        
        //Due to issue in oz testing suite, the msg.sender might not be owner
        _transferOwnership(owner);
    }

    function deposit() public payable whenPresaleActive {
        if (requiresWhitelisting) {
            require(whitelist[msg.sender], "Address is not whitelisted for this private presale.");
        }
        require(deposits[msg.sender].add(msg.value) <= maxbuyPerAddress, "Deposit exceeds max buy per address.");
        require(totalPresaleEther.add(msg.value) <= maximumPresaleEther, "Purchase exceeds presale maximum.");

        uint etherForDevfund = msg.value.mulBP(devfundBP);
        uint etherForBuyback = msg.value.mulBP(buybackBP);
        uint etherForUniswap = msg.value.sub(etherForDevfund).sub(etherForBuyback);

        etherPoolDevfund = etherPoolDevfund.add(etherForDevfund);
        etherPoolBuyback = etherPoolBuyback.add(etherForBuyback);
        etherPoolUniswap = etherPoolUniswap.add(etherForUniswap);

        totalPresaleEther = totalPresaleEther.add(msg.value);

        deposits[msg.sender] = deposits[msg.sender].add(msg.value);
    }

    function redeem() public whenPresaleFinished {
        require(deposits[msg.sender] > 0, "No ether deposit was made by this address.");
        uint amount = deposits[msg.sender].mul(_calculateRate());
        askoToken.mint(msg.sender, amount);
    }

    function sendToUniswap() public whenPresaleFinished {
        require(etherPoolUniswap > 0, "No ether to send.");
        (uint amountToken, uint amountETH, uint liquidity) = uniswapRouter.addLiquidityETH.value(etherPoolUniswap)(
            address(askoToken),
            totalUniswapTokens,
            totalUniswapTokens,
            etherPoolUniswap,
            address(this),
            now.add(3600)
        );
        etherPoolUniswap = etherPoolUniswap.sub(amountETH);
        totalUniswapTokens = totalUniswapTokens.sub(amountToken);
    }

    function setIsClosedByOwner(bool value) public onlyOwner {
        isClosedByOwner = value;
    }

    function setRequiresWhitelisting(bool value) public onlyOwner {
        requiresWhitelisting = value;
    }

    function setHasSentToUniswap(bool value) public onlyOwner {
        hasSentToUniswap = value;
    }

    function setWhitelist(address account, bool value) public onlyOwner {
        whitelist[account] = value;
    }

    function setWhitelistForAll(address[] memory account, bool value) public onlyOwner {
        for (uint i=0; i < account.length; i++) {
            whitelist[account[i]] = value;
        }
    }

    function withdrawFromDevfund(uint amount, address payable receiver) public onlyOwner whenPresaleFinished {
        etherPoolDevfund = etherPoolDevfund.sub(amount);
        receiver.transfer(amount);
    }

    function withdrawFromBuyback(uint amount, address payable receiver) public onlyOwner whenPresaleFinished {
        etherPoolBuyback = etherPoolBuyback.sub(amount);
        receiver.transfer(amount);
    }

    function _calculateRate() internal view returns (uint) {
        return totalPresaleTokens.div(totalPresaleEther);
    }

}
