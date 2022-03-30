// SPDX-License-Identifier: MIT

pragma solidity ^0.8.11;

interface ICommunityIssuance {
	// --- Events ---

	event LQTYTokenAddressSet(address _LQTYTokenAddress);
	event StabilityPoolAddressSet(address _stabilityPoolAddress);
	event TotalLQTYIssuedUpdated(address indexed stabilityPool, uint256 _totalLQTYIssued);

	// --- Functions ---

	function setAddresses(
		address _LQTYTokenAddress,
		address _stabilityPoolAddress,
		address _adminContract
	) external;

	function issueLQTY() external returns (uint256);

	function sendLQTY(address _account, uint256 _LQTYAamount) external;

	function addFundToStabilityPool(address _pool, uint256 _assignedSupply) external;

	function addFundToStabilityPoolFrom(
		address _pool,
		uint256 _assignedSupply,
		address _spender
	) external;

	function transferFundToAnotherStabilityPool(
		address _target,
		address _receiver,
		uint256 _quantity
	) external;

	function setWeeklyLQTYDistribution(address _stabilityPool, uint256 _weeklyReward) external;
}
