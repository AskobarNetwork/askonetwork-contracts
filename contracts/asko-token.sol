pragma solidity 0.5.17;
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/StandaloneERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20Burnable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";
import "./library/BasisPoints.sol";


contract AskoToken is ERC20, ERC20Burnable, StandaloneERC20, Ownable {
    using BasisPoints for uint;
    using SafeMath for uint;

    uint constant public BASIS_POINTS = 10000;
    uint constant public TAX_BP = 100; //1%

    bool public isBurning = false;

    function setIsBurning(bool value) public onlyOwner {
        isBurning = value;
    }

    function findBurnAmount(uint value) public pure returns (uint) {
        return value.mulBP(value);
    }

    function transfer(address recipient, uint256 amount) public returns (bool) {

        isBurning ?
            _transferWithBurn(msg.sender, recipient, amount) :
            _transfer(msg.sender, recipient, amount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) public returns (bool) {
        isBurning ?
            _transferWithBurn(msg.sender, recipient, amount) :
            _transfer(msg.sender, recipient, amount);
        approve
        (
            msg.sender,
            allowance(
                sender,
                msg.sender
            ).sub(amount)
        );
        return true;
    }

    function _transferWithBurn(address sender, address recipient, uint256 amount) internal {
        require(sender != address(0), "ERC20: transfer from the zero address");
        require(recipient != address(0), "ERC20: transfer to the zero address");

        uint256 tokensToBurn = findBurnAmount(amount);
        uint256 tokensToTransfer = amount.sub(tokensToBurn);

        burnFrom(sender, tokensToBurn);
        _transfer(sender, recipient, tokensToTransfer);

    }
}
