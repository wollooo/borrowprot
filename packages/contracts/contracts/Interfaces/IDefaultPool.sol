// SPDX-License-Identifier: MIT

pragma solidity ^0.8.11;
import "./IPool.sol";

interface IDefaultPool is IPool {
	// --- Events ---
	event TroveManagerAddressChanged(address _newTroveManagerAddress);
	event DefaultPoolLUSDDebtUpdated(address _asset, uint256 _LUSDDebt);
	event DefaultPoolETHBalanceUpdated(address _asset, uint256 _ETH);

	// --- Functions ---
	function sendETHToActivePool(address _asset, uint256 _amount) external;
}
