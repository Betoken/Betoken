pragma solidity 0.5.0;

import "../interfaces/Compound.sol";
import "../interfaces/KyberNetwork.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

contract TestCompoundRopsten is Compound, Ownable {
  using SafeMath for uint;

  ERC20Detailed internal constant ETH_TOKEN_ADDRESS = ERC20Detailed(0x00eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee);
  address internal constant WETH_ADDR = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
  address internal constant KYBER_ADDR = 0x818E6FECD516Ecc3849DAf6845e3EC868087B755;
  uint public constant PRECISION = 10 ** 18;
  uint256 public constant MAX_UINT = uint256(-1);
  uint public collateralRatio = 15 * (10 ** 17);

  address[] public supportedTokens;

  mapping(address => mapping(address => uint)) supplyBalancesInAsset;
  mapping(address => mapping(address => uint)) borrowBalancesInAsset;
  
  constructor(address[] memory _supportedTokens) public {
    supportedTokens = _supportedTokens;
  }

  function supply(address asset, uint amount) public returns (uint) {
    ERC20Detailed token = ERC20Detailed(asset);
    require(token.transferFrom(msg.sender, address(this), amount));

    supplyBalancesInAsset[msg.sender][asset] = supplyBalancesInAsset[msg.sender][asset].add(amount);
    
    return 0;
  }
  
  function withdraw(address asset, uint requestedAmount) public returns (uint) {
    uint256 amount = requestedAmount == MAX_UINT ? __ethToToken(asset, uint256(getAccountLiquidity(msg.sender))) : requestedAmount;
    supplyBalancesInAsset[msg.sender][asset] = supplyBalancesInAsset[msg.sender][asset].sub(amount);

    ERC20Detailed token = ERC20Detailed(asset);
    require(token.transfer(msg.sender, amount));

    // check if there's still enough liquidity
    require(getAccountLiquidity(msg.sender) >= 0);

    return 0;
  }
  
  function borrow(address asset, uint amount) public returns (uint) {
    // add to borrow balance
    borrowBalancesInAsset[msg.sender][asset] = borrowBalancesInAsset[msg.sender][asset].add(amount);

    // transfer asset
    ERC20Detailed token = ERC20Detailed(asset);
    require(token.transfer(msg.sender, amount));

    // check if there's still enough liquidity
    require(getAccountLiquidity(msg.sender) >= 0);

    return 0;
  }
  
  function repayBorrow(address asset, uint amount) public returns (uint) {
    // accept repayment
    ERC20Detailed token = ERC20Detailed(asset);
    uint256 repayAmount = amount == MAX_UINT ? borrowBalancesInAsset[msg.sender][asset] : amount;
    require(token.transferFrom(msg.sender, address(this), repayAmount));

    // subtract from borrow balance
    borrowBalancesInAsset[msg.sender][asset] = borrowBalancesInAsset[msg.sender][asset].sub(repayAmount);

    return 0;
  }
  
  function getAccountLiquidity(address account) view public returns (int) {
    uint supplyBalance = __supplyBalancesInETH(account);
    uint debt = __borrowBalancesInETH(account).mul(collateralRatio).div(PRECISION);
    if (supplyBalance > debt) {
      return int(supplyBalance.sub(debt));
    } else {
      int result = int(debt.sub(supplyBalance));
      require(result >= -result);
      return -result;
    }
  }
  
  function getSupplyBalance(address account, address asset) view public returns (uint) {
    return supplyBalancesInAsset[account][asset];
  }
  
  function getBorrowBalance(address account, address asset) view public returns (uint) {
    return borrowBalancesInAsset[account][asset];
  }
  
  function assetPrices(address asset) public view returns (uint) {
    (, uint256 rate) = KyberNetwork(KYBER_ADDR).getExpectedRate(ERC20Detailed(asset), ETH_TOKEN_ADDRESS, 10 ** 10);
    return rate;
  }

  function __tokenToETH(address asset, uint amount) internal view returns (uint) {
    // PRECISION here should be replaced with 10 ** token.decimals()
    // But that somehow causes the VM to revert, so just leave it
    // It's for testing purposes anyways
    return amount.mul(assetPrices(asset)).div(PRECISION);
  }

  function __ethToToken(address asset, uint amount) internal view returns (uint) {
    // PRECISION here should be replaced with 10 ** token.decimals()
    // But that somehow causes the VM to revert, so just leave it
    // It's for testing purposes anyways
    return amount.mul(PRECISION).div(assetPrices(asset));
  }

  function __supplyBalancesInETH(address account) internal view returns(uint _balance) {
    for (uint i = 0; i < supportedTokens.length; i++) {
      address asset = supportedTokens[i];
      _balance = _balance.add(__tokenToETH(asset, supplyBalancesInAsset[account][asset]));
    }
  }

  function __borrowBalancesInETH(address account) internal view returns(uint _balance) {
    for (uint i = 0; i < supportedTokens.length; i = i.add(1)) {
      address asset = supportedTokens[i];
      _balance = _balance.add(__tokenToETH(asset, borrowBalancesInAsset[account][asset]));
    }
  }
}