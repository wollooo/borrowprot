// SPDX-License-Identifier: MIT

pragma solidity ^0.8.11;
import "../LQTY/CommunityIssuance.sol";

contract CommunityIssuanceTester is CommunityIssuance {
	using SafeMathUpgradeable for uint256;

	function obtainLQTY(uint256 _amount) external {
		lqtyToken.transfer(msg.sender, _amount);
	}

	function getLastUpdateTokenDistribution(address stabilityPool)
		external
		view
		returns (uint256)
	{
		return _getLastUpdateTokenDistribution(stabilityPool);
	}

	function unprotectedIssueLQTY(address stabilityPool) external returns (uint256) {
		return _issueLQTY(stabilityPool);
	}
}
