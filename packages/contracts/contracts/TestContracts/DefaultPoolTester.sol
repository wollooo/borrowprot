// SPDX-License-Identifier: MIT

pragma solidity ^0.8.11;
import "../DefaultPool.sol";

contract DefaultPoolTester is DefaultPool {
	using SafeMathUpgradeable for uint256;

	function unprotectedIncreaseLUSDDebt(address _asset, uint256 _amount) external {
		LUSDDebts[_asset] = LUSDDebts[_asset].add(_amount);
	}

	function unprotectedPayable(address _asset, uint256 amount) external payable {
		amount = _asset == address(0) ? msg.value : amount;
		assetsBalance[_asset] = assetsBalance[_asset].add(msg.value);
	}
}
