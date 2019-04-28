pragma solidity 0.5.0;

import "./CompoundOrderLogic.sol";

contract ShortCERC20OrderLogic is CompoundOrderLogic {
  function executeOrder(uint256 _minPrice, uint256 _maxPrice) public onlyOwner isValidToken(compoundTokenAddr) {
    super.executeOrder(_minPrice, _maxPrice);
    
    // Ensure token's price is between _minPrice and _maxPrice
    uint256 tokenPrice = ORACLE.getUnderlyingPrice(compoundTokenAddr); // Get the shorting token's price in ETH
    require(tokenPrice > 0); // Ensure asset exists on Compound
    tokenPrice = __tokenToDAI(compoundTokenAddr, tokenPrice); // Convert token price to be in DAI
    require(tokenPrice >= _minPrice && tokenPrice <= _maxPrice); // Ensure price is within range

    // Get funds in DAI from BetokenFund
    require(dai.transferFrom(owner(), address(this), collateralAmountInDAI)); // Transfer DAI from BetokenFund
    require(dai.approve(address(CDAI), 0)); // Clear DAI allowance of Compound DAI market
    require(dai.approve(address(CDAI), collateralAmountInDAI)); // Approve DAI transfer to Compound DAI market

    // Enter Compound markets
    CERC20 market = CERC20(compoundTokenAddr);
    address[] memory markets = new address[](2);
    markets[0] = compoundTokenAddr;
    markets[1] = address(CDAI);
    COMPTROLLER.enterMarkets(markets);
    
    // Get loan from Compound in tokenAddr
    uint256 loanAmountInToken = __daiToToken(compoundTokenAddr, loanAmountInDAI);
    require(CDAI.mint(collateralAmountInDAI) == 0); // Transfer DAI into Compound as supply
    require(market.borrow(loanAmountInToken) == 0);// Take out loan
    (bool negLiquidity, ) = getCurrentLiquidityInDAI();
    require(!negLiquidity); // Ensure account liquidity is positive

    // Convert loaned tokens to DAI
    (uint256 actualDAIAmount,) = __sellTokenForDAI(loanAmountInToken);
    loanAmountInDAI = actualDAIAmount; // Change loan amount to actual DAI received

    // Repay leftover tokens to avoid complications
    ERC20Detailed token = __underlyingToken(compoundTokenAddr);
    if (token.balanceOf(address(this)) > 0) {
      uint256 repayAmount = token.balanceOf(address(this));
      require(token.approve(compoundTokenAddr, 0));
      require(token.approve(compoundTokenAddr, repayAmount));
      require(market.repayBorrow(repayAmount) == 0);
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
    uint256 tokenPrice = ORACLE.getUnderlyingPrice(compoundTokenAddr); // Get the shorting token's price in ETH
    tokenPrice = __tokenToDAI(compoundTokenAddr, tokenPrice); // Convert token price to be in DAI
    require(tokenPrice >= _minPrice && tokenPrice <= _maxPrice); // Ensure price is within range

    // Siphon remaining collateral by repaying x DAI and getting back 1.5x DAI collateral
    // Repeat to ensure debt is exhausted
    CERC20 market = CERC20(compoundTokenAddr);
    for (uint256 i = 0; i < MAX_REPAY_STEPS; i = i.add(1)) {
      uint256 currentDebt = __tokenToDAI(compoundTokenAddr, market.borrowBalanceCurrent(address(this)));
      if (currentDebt <= NEGLIGIBLE_DEBT) {
        // Current debt negligible, exit
        break;
      }

      // Determine amount to be repayed this step
      uint256 currentBalance = dai.balanceOf(address(this));
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
      require(CDAI.redeemUnderlying(liquidity) == 0);
    }

    // Send DAI back to BetokenFund and return
    _inputAmount = collateralAmountInDAI;
    _outputAmount = dai.balanceOf(address(this));
    require(dai.transfer(owner(), dai.balanceOf(address(this))));
  }

  // Allows manager to repay loan to avoid liquidation
  function repayLoan(uint256 _repayAmountInDAI) public onlyOwner {
    require(buyTime > 0); // Ensure the order has been executed

    // Convert DAI to shorting token
    (,uint256 actualTokenAmount) = __sellDAIForToken(_repayAmountInDAI);

    // Repay loan to Compound
    ERC20Detailed token = __underlyingToken(compoundTokenAddr);
    CERC20 market = CERC20(compoundTokenAddr);
    require(token.approve(compoundTokenAddr, 0));
    require(token.approve(compoundTokenAddr, actualTokenAmount));
    require(market.repayBorrow(actualTokenAmount) == 0);
  }

  function getCurrentProfitInDAI() public view returns (bool _isNegative, uint256 _amount) {
    CERC20 market = CERC20(compoundTokenAddr);
    uint256 borrowBalance = __tokenToDAI(compoundTokenAddr, market.borrowBalanceCurrent(address(this)));
    if (loanAmountInDAI >= borrowBalance) {
      return (false, loanAmountInDAI.sub(borrowBalance));
    } else {
      return (true, borrowBalance.sub(loanAmountInDAI));
    }
  }

  function getCurrentCollateralRatioInDAI() public view returns (uint256 _amount) {
    CERC20 market = CERC20(compoundTokenAddr);
    uint256 supply = CDAI.balanceOf(address(this)).mul(CDAI.exchangeRateCurrent()).div(PRECISION);
    uint256 borrow = __tokenToDAI(compoundTokenAddr, market.borrowBalanceCurrent(address(this)));
    return supply.mul(PRECISION).div(borrow);
  }
}