pragma solidity 0.5.0;

import "./CompoundOrderLogic.sol";

contract LongCEtherOrderLogic is CompoundOrderLogic {
  function executeOrder(uint256 _minPrice, uint256 _maxPrice) public onlyOwner isValidToken(compoundTokenAddr) {
    super.executeOrder(_minPrice, _maxPrice);
    
    // Ensure token's price is between _minPrice and _maxPrice
    uint256 tokenPrice = PRECISION; // The price of ETH in ETH is just 1
    tokenPrice = __tokenToDAI(address(0), tokenPrice); // Convert token price to be in DAI
    require(tokenPrice >= _minPrice && tokenPrice <= _maxPrice); // Ensure price is within range

    // Get funds in DAI from BetokenFund
    require(dai.transferFrom(owner(), address(this), collateralAmountInDAI)); // Transfer DAI from BetokenFund

    // Convert received DAI to longing token
    (,uint256 actualTokenAmount) = __sellDAIForToken(collateralAmountInDAI);

    // Enter Compound markets
    CEther market = CEther(compoundTokenAddr);
    address[] memory markets = new address[](2);
    markets[0] = compoundTokenAddr;
    markets[1] = address(CDAI);
    COMPTROLLER.enterMarkets(markets);
    // Get loan from Compound in DAI
    require(market.mint.value(actualTokenAmount)() == 0); // Transfer tokens into Compound as supply
    require(CDAI.borrow(loanAmountInDAI) == 0);// Take out loan in DAI
    (bool negLiquidity, ) = getCurrentLiquidityInDAI();
    require(!negLiquidity); // Ensure account liquidity is positive

    // Convert borrowed DAI to longing token
    __sellDAIForToken(loanAmountInDAI);

    // Repay leftover DAI to avoid complications
    if (dai.balanceOf(address(this)) > 0) {
      uint256 repayAmount = dai.balanceOf(address(this));
      require(dai.approve(address(CDAI), 0));
      require(dai.approve(address(CDAI), repayAmount));
      require(CDAI.repayBorrow(repayAmount) == 0);
    }
  }

  function sellOrder(uint256 _minPrice, uint256 _maxPrice)
    public
    onlyOwner
    returns (uint256 _inputAmount, uint256 _outputAmount)
  {
    require(buyTime > 0); // Ensure the order has been executed
    require(isSold == false);
    isSold = true;

    // Ensure price is within range provided by user
    uint256 tokenPrice = PRECISION; // The price of ETH in ETH is just 1
    tokenPrice = __tokenToDAI(address(0), tokenPrice); // Convert token price to be in DAI
    require(tokenPrice >= _minPrice && tokenPrice <= _maxPrice); // Ensure price is within range

    // Siphon remaining collateral by repaying x DAI and getting back 1.5x DAI collateral
    // Repeat to ensure debt is exhausted
    CEther market = CEther(compoundTokenAddr);
    for (uint256 i = 0; i < MAX_REPAY_STEPS; i = i.add(1)) {
      uint256 currentDebt = CDAI.borrowBalanceCurrent(address(this));
      if (currentDebt <= NEGLIGIBLE_DEBT) {
        // Current debt negligible, exit
        break;
      }

      // Determine amount to be repayed this step
      uint256 currentBalance = __tokenToDAI(address(0), address(this).balance);
      uint256 repayAmount = 0; // amount to be repaid in DAI
      if (currentDebt <= currentBalance) {
        // Has enough money, repay all debt
        repayAmount = currentDebt;
      } else {
        // Doesn't have enough money, repay whatever we can repay
        repayAmount = currentBalance;
      }

      // Repay debt
      repayLoan(repayAmount);

      // Withdraw all available liquidity
      (, uint256 liquidity) = getCurrentLiquidityInDAI();
      liquidity = __daiToToken(address(0), liquidity);
      require(market.redeemUnderlying(liquidity) == 0);
    }

    // Sell all longing token to DAI
    __sellTokenForDAI(address(this).balance);

    // Send DAI back to BetokenFund and return
    _inputAmount = collateralAmountInDAI;
    _outputAmount = dai.balanceOf(address(this));
    require(dai.transfer(owner(), dai.balanceOf(address(this))));
    toPayableAddr(owner()).transfer(address(this).balance); // Send back potential leftover tokens
  }

  // Allows manager to repay loan to avoid liquidation
  function repayLoan(uint256 _repayAmountInDAI) public onlyOwner {
    require(buyTime > 0); // Ensure the order has been executed

    // Convert longing token to DAI
    uint256 repayAmountInToken = __daiToToken(address(0), _repayAmountInDAI);
    (uint256 actualDAIAmount,) = __sellTokenForDAI(repayAmountInToken);
    
    // Repay loan to Compound
    require(dai.approve(address(CDAI), 0));
    require(dai.approve(address(CDAI), actualDAIAmount));
    require(CDAI.repayBorrow(actualDAIAmount) == 0);
  }

  function getCurrentProfitInDAI() public view returns (bool _isNegative, uint256 _amount) {
    uint256 borrowBalance = CDAI.borrowBalanceCurrent(address(this));
    if (loanAmountInDAI >= borrowBalance) {
      return (false, loanAmountInDAI.sub(borrowBalance));
    } else {
      return (true, borrowBalance.sub(loanAmountInDAI));
    }
  }

  function getCurrentCollateralRatioInDAI() public view returns (uint256 _amount) {
    CERC20 market = CERC20(compoundTokenAddr);
    uint256 supply = __tokenToDAI(compoundTokenAddr, market.balanceOf(address(this)).mul(market.exchangeRateCurrent()).div(PRECISION));
    uint256 borrow = CDAI.borrowBalanceCurrent(address(this));
    return supply.mul(PRECISION).div(borrow);
  }
}