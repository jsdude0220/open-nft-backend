pragma solidity ^0.5.11;

import { ERC20 } from "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import { ERC20Detailed } from "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";

contract MockERC20 is ERC20, ERC20Detailed {
  function mint(address account, uint256 amount) external {
    _mint(account, amount);
  }
}

contract DAI is MockERC20 {
  constructor() public ERC20Detailed("Dai Stablecoin", "DAI", 18) {
    _mint(msg.sender, 1000000 ether);
  }
}

contract USDC is MockERC20 {
  constructor() public ERC20Detailed("USD//C", "USDC", 18) {
    _mint(msg.sender, 1000000 ether);
  }

  function decimals() public view returns (uint8) {
      return 18;
  }
}

contract USDT is MockERC20 {
  constructor() public ERC20Detailed("Tether USD", "USDT", 18) {
    _mint(msg.sender, 1000000 ether);
  }

  function decimals() public view returns (uint8) {
      return 18;
  }
}
