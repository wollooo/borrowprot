// SPDX-License-Identifier: MIT

pragma solidity ^0.8.11;

import "./IDeposit.sol";

// Common interface for the Pools.
interface IPool is IDeposit {
	// --- Events ---

	event ETHBalanceUpdated(uint256 _newBalance);
	event LUSDBalanceUpdated(uint256 _newBalance);
	event ActivePoolAddressChanged(address _newActivePoolAddress);
	event DefaultPoolAddressChanged(address _newDefaultPoolAddress);
	event ETHAddressChanged(address _assetAddress);
	event StabilityPoolAddressChanged(address _newStabilityPoolAddress);
	event ETHSent(address _to, address indexed _asset, uint256 _amount);

	// --- Functions ---

	function getETHBalance(address _asset) external view returns (uint256);

	function getLUSDDebt(address _asset) external view returns (uint256);

	function increaseLUSDDebt(address _asset, uint256 _amount) external;

	function decreaseLUSDDebt(address _asset, uint256 _amount) external;
}
