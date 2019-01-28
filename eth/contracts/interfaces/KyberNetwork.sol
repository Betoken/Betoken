pragma solidity 0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";

/**
 * @title The interface for the Kyber Network smart contract
 * @author Zefram Lou (Zebang Liu)
 */
interface KyberNetwork {
  function getExpectedRate(ERC20Detailed src, ERC20Detailed dest, uint srcQty) external view
      returns (uint expectedRate, uint slippageRate);

  function tradeWithHint(
    ERC20Detailed src, uint srcAmount, ERC20Detailed dest, address destAddress, uint maxDestAmount,
    uint minConversionRate, address walletId, bytes calldata hint) external payable returns(uint);
}
