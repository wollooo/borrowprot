// SPDX-License-Identifier: MIT

pragma solidity ^0.8.11;

import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "../Interfaces/IStabilityPoolManager.sol";
import "../Interfaces/ICommunityIssuance.sol";
import "../Dependencies/BaseMath.sol";
import "../Dependencies/LiquityMath.sol";
import "../Dependencies/CheckContract.sol";

contract CommunityIssuance is ICommunityIssuance, OwnableUpgradeable, CheckContract, BaseMath {
	using SafeMathUpgradeable for uint256;
	using SafeERC20Upgradeable for IERC20Upgradeable;

	string public constant NAME = "CommunityIssuance";
	uint256 public constant DISTRIBUTION_DURATION = 7 days / 60;
	uint256 public constant SECONDS_IN_ONE_MINUTE = 60;

	IERC20Upgradeable public lqtyToken;
	IStabilityPoolManager public stabilityPoolManager;

	mapping(address => uint256) public totalLQTYIssued;
	mapping(address => uint256) public lastUpdateTime;
	mapping(address => uint256) public LQTYSupplyCaps;
	mapping(address => uint256) public lqtyDistributionsByPool;

	address public adminContract;

	bool public isInitialized;

	modifier activeStabilityPoolOnly(address _pool) {
		require(lastUpdateTime[_pool] != 0, "CommunityIssuance: Pool needs to be added first.");
		_;
	}

	modifier isController() {
		require(msg.sender == owner() || msg.sender == adminContract, "Invalid Permission");
		_;
	}

	modifier isStabilityPool(address _pool) {
		require(
			stabilityPoolManager.isStabilityPool(_pool),
			"CommunityIssuance: caller is not SP"
		);
		_;
	}

	modifier onlyStabilityPool() {
		require(
			stabilityPoolManager.isStabilityPool(msg.sender),
			"CommunityIssuance: caller is not SP"
		);
		_;
	}

	// --- Functions ---
	function setAddresses(
		address _lqtyTokenAddress,
		address _stabilityPoolManagerAddress,
		address _adminContract
	) external override initializer {
		require(!isInitialized, "Already initialized");
		checkContract(_lqtyTokenAddress);
		checkContract(_stabilityPoolManagerAddress);
		checkContract(_adminContract);
		isInitialized = true;
		__Ownable_init();

		adminContract = _adminContract;

		lqtyToken = IERC20Upgradeable(_lqtyTokenAddress);
		stabilityPoolManager = IStabilityPoolManager(_stabilityPoolManagerAddress);

		emit LQTYTokenAddressSet(_lqtyTokenAddress);
		emit StabilityPoolAddressSet(_stabilityPoolManagerAddress);
	}

	function setAdminContract(address _admin) external onlyOwner {
		require(_admin != address(0));
		adminContract = _admin;
	}

	function addFundToStabilityPool(address _pool, uint256 _assignedSupply)
		external
		override
		isController
	{
		_addFundToStabilityPoolFrom(_pool, _assignedSupply, msg.sender);
	}

	function removeFundFromStabilityPool(address _pool, uint256 _fundToRemove)
		external
		onlyOwner
		activeStabilityPoolOnly(_pool)
	{
		uint256 newCap = LQTYSupplyCaps[_pool].sub(_fundToRemove);
		require(
			totalLQTYIssued[_pool] <= newCap,
			"CommunityIssuance: Stability Pool doesn't have enough supply."
		);

		LQTYSupplyCaps[_pool] -= _fundToRemove;

		if (totalLQTYIssued[_pool] == LQTYSupplyCaps[_pool]) {
			disableStabilityPool(_pool);
		}

		lqtyToken.safeTransfer(msg.sender, _fundToRemove);
	}

	function addFundToStabilityPoolFrom(
		address _pool,
		uint256 _assignedSupply,
		address _spender
	) external override isController {
		_addFundToStabilityPoolFrom(_pool, _assignedSupply, _spender);
	}

	function _addFundToStabilityPoolFrom(
		address _pool,
		uint256 _assignedSupply,
		address _spender
	) internal {
		require(
			stabilityPoolManager.isStabilityPool(_pool),
			"CommunityIssuance: Invalid Stability Pool"
		);

		if (lastUpdateTime[_pool] == 0) {
			lastUpdateTime[_pool] = block.timestamp;
		}

		LQTYSupplyCaps[_pool] += _assignedSupply;
		lqtyToken.safeTransferFrom(_spender, address(this), _assignedSupply);
	}

	function transferFundToAnotherStabilityPool(
		address _target,
		address _receiver,
		uint256 _quantity
	)
		external
		override
		onlyOwner
		activeStabilityPoolOnly(_target)
		activeStabilityPoolOnly(_receiver)
	{
		uint256 newCap = LQTYSupplyCaps[_target].sub(_quantity);
		require(
			totalLQTYIssued[_target] <= newCap,
			"CommunityIssuance: Stability Pool doesn't have enough supply."
		);

		LQTYSupplyCaps[_target] -= _quantity;
		LQTYSupplyCaps[_receiver] += _quantity;

		if (totalLQTYIssued[_target] == LQTYSupplyCaps[_target]) {
			disableStabilityPool(_target);
		}
	}

	function disableStabilityPool(address _pool) internal {
		lastUpdateTime[_pool] = 0;
		LQTYSupplyCaps[_pool] = 0;
		totalLQTYIssued[_pool] = 0;
	}

	function issueLQTY() external override onlyStabilityPool returns (uint256) {
		return _issueLQTY(msg.sender);
	}

	function _issueLQTY(address _pool) internal isStabilityPool(_pool) returns (uint256) {
		uint256 maxPoolSupply = LQTYSupplyCaps[_pool];

		if (totalLQTYIssued[_pool] >= maxPoolSupply) return 0;

		uint256 issuance = _getLastUpdateTokenDistribution(_pool);
		uint256 totalIssuance = issuance.add(totalLQTYIssued[_pool]);

		if (totalIssuance > maxPoolSupply) {
			issuance = maxPoolSupply.sub(totalLQTYIssued[_pool]);
			totalIssuance = maxPoolSupply;
		}

		lastUpdateTime[_pool] = block.timestamp;
		totalLQTYIssued[_pool] = totalIssuance;
		emit TotalLQTYIssuedUpdated(_pool, totalIssuance);

		return issuance;
	}

	function _getLastUpdateTokenDistribution(address stabilityPool)
		internal
		view
		returns (uint256)
	{
		require(lastUpdateTime[stabilityPool] != 0, "Stability pool hasn't been assigned");
		uint256 timePassed = block.timestamp.sub(lastUpdateTime[stabilityPool]).div(
			SECONDS_IN_ONE_MINUTE
		);
		uint256 totalDistribuedSinceBeginning = lqtyDistributionsByPool[stabilityPool].mul(
			timePassed
		);

		return totalDistribuedSinceBeginning;
	}

	function sendLQTY(address _account, uint256 _LQTYamount)
		external
		override
		onlyStabilityPool
	{
		uint256 balanceLQTY = lqtyToken.balanceOf(address(this));
		uint256 safeAmount = balanceLQTY >= _LQTYamount ? _LQTYamount : balanceLQTY;

		if (safeAmount == 0) {
			return;
		}

		lqtyToken.transfer(_account, safeAmount);
	}

	function setWeeklyLUSDaDistribution(address _stabilityPool, uint256 _weeklyReward)
		external
		isController
		isStabilityPool(_stabilityPool)
	{
		lqtyDistributionsByPool[_stabilityPool] = _weeklyReward.div(DISTRIBUTION_DURATION);
	}
}
