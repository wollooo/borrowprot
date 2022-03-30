// SPDX-License-Identifier: MIT

pragma solidity ^0.8.11;
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "../Dependencies/LiquityMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../Interfaces/IBorrowerOperations.sol";
import "../Interfaces/ITroveManager.sol";
import "../Interfaces/IStabilityPoolManager.sol";
import "../Interfaces/IPriceFeed.sol";
import "../Interfaces/ILQTYStaking.sol";
import "./BorrowerOperationsScript.sol";
import "./ETHTransferScript.sol";
import "./LQTYStakingScript.sol";

contract BorrowerWrappersScript is
	BorrowerOperationsScript,
	ETHTransferScript,
	LQTYStakingScript
{
	using SafeMathUpgradeable for uint256;

	struct Local_var {
		address _asset;
		uint256 _maxFee;
		address _upperHint;
		address _lowerHint;
		uint256 netLQTYmount;
	}

	string public constant NAME = "BorrowerWrappersScript";

	ITroveManager immutable troveManager;
	IStabilityPoolManager immutable stabilityPoolManager;
	IPriceFeed immutable priceFeed;
	IERC20 immutable LUSDToken;
	IERC20 immutable LQTYToken;

	constructor(
		address _borrowerOperationsAddress,
		address _troveManagerAddress,
		address _LQTYStakingAddress
	)
		BorrowerOperationsScript(IBorrowerOperations(_borrowerOperationsAddress))
		LQTYStakingScript(_LQTYStakingAddress)
	{
		checkContract(_troveManagerAddress);
		ITroveManager troveManagerCached = ITroveManager(_troveManagerAddress);
		troveManager = troveManagerCached;

		IStabilityPoolManager stabilityPoolCached = troveManagerCached.stabilityPoolManager();
		checkContract(address(stabilityPoolCached));
		stabilityPoolManager = stabilityPoolCached;

		IPriceFeed priceFeedCached = troveManagerCached.kumoParams().priceFeed();
		checkContract(address(priceFeedCached));
		priceFeed = priceFeedCached;

		address LUSDTokenCached = address(troveManagerCached.LUSDToken());
		checkContract(LUSDTokenCached);
		LUSDToken = IERC20(LUSDTokenCached);

		address LQTYTokenCached = address(ILQTYStaking(_LQTYStakingAddress).LQTYToken());
		checkContract(LQTYTokenCached);
		LQTYToken = IERC20(LQTYTokenCached);

		ILQTYStaking LQTYStakingCached = troveManagerCached.LQTYStaking();
		require(
			_LQTYStakingAddress == address(LQTYStakingCached),
			"BorrowerWrappersScript: Wrong LQTYStaking address"
		);
	}

	function claimCollateralAndOpenTrove(
		address _asset,
		uint256 _maxFee,
		uint256 _LQTYmount,
		address _upperHint,
		address _lowerHint
	) external payable {
		uint256 balanceBefore = address(this).balance;

		// Claim collateral
		borrowerOperations.claimCollateral(_asset);

		uint256 balanceAfter = address(this).balance;

		// already checked in CollSurplusPool
		assert(balanceAfter > balanceBefore);

		uint256 totalCollateral = balanceAfter.sub(balanceBefore).add(msg.value);

		// Open trove with obtained collateral, plus collateral sent by user
		borrowerOperations.openTrove{ value: _asset == address(0) ? totalCollateral : 0 }(
			_asset,
			totalCollateral,
			_maxFee,
			_LQTYmount,
			_upperHint,
			_lowerHint
		);
	}

	function claimSPRewardsAndRecycle(
		address _asset,
		uint256 _maxFee,
		address _upperHint,
		address _lowerHint
	) external {
		Local_var memory vars = Local_var(_asset, _maxFee, _upperHint, _lowerHint, 0);
		uint256 collBalanceBefore = address(this).balance;
		uint256 LQTYBalanceBefore = LQTYToken.balanceOf(address(this));

		// Claim rewards
		stabilityPoolManager.getAssetStabilityPool(vars._asset).withdrawFromSP(0);

		uint256 collBalanceAfter = address(this).balance;
		uint256 LQTYBalanceAfter = LQTYToken.balanceOf(address(this));
		uint256 claimedCollateral = collBalanceAfter.sub(collBalanceBefore);

		// Add claimed ETH to trove, get more LUSD and stake it into the Stability Pool
		if (claimedCollateral > 0) {
			_requireUserHasTrove(vars._asset, address(this));
			vars.netLQTYmount = _getNetLQTYmount(vars._asset, claimedCollateral);
			borrowerOperations.adjustTrove{
				value: vars._asset == address(0) ? claimedCollateral : 0
			}(
				vars._asset,
				claimedCollateral,
				vars._maxFee,
				0,
				vars.netLQTYmount,
				true,
				vars._upperHint,
				vars._lowerHint
			);
			// Provide withdrawn LUSD to Stability Pool
			if (vars.netLQTYmount > 0) {
				stabilityPoolManager.getAssetStabilityPool(_asset).provideToSP(vars.netLQTYmount);
			}
		}

		// Stake claimed LQTY
		uint256 claimedLQTY = LQTYBalanceAfter.sub(LQTYBalanceBefore);
		if (claimedLQTY > 0) {
			LQTYStaking.stake(claimedLQTY);
		}
	}

	function claimStakingGainsAndRecycle(
		address _asset,
		uint256 _maxFee,
		address _upperHint,
		address _lowerHint
	) external {
		Local_var memory vars = Local_var(_asset, _maxFee, _upperHint, _lowerHint, 0);

		uint256 collBalanceBefore = address(this).balance;
		uint256 LUSDBalanceBefore = LUSDToken.balanceOf(address(this));
		uint256 LQTYBalanceBefore = LQTYToken.balanceOf(address(this));

		// Claim gains
		LQTYStaking.unstake(0);

		uint256 gainedCollateral = address(this).balance.sub(collBalanceBefore); // stack too deep issues :'(
		uint256 gainedLUSD = LUSDToken.balanceOf(address(this)).sub(LUSDBalanceBefore);

		// Top up trove and get more LUSD, keeping ICR constant
		if (gainedCollateral > 0) {
			_requireUserHasTrove(vars._asset, address(this));
			vars.netLQTYmount = _getNetLQTYmount(vars._asset, gainedCollateral);
			borrowerOperations.adjustTrove{
				value: vars._asset == address(0) ? gainedCollateral : 0
			}(
				vars._asset,
				gainedCollateral,
				vars._maxFee,
				0,
				vars.netLQTYmount,
				true,
				vars._upperHint,
				vars._lowerHint
			);
		}

		uint256 totalLUSD = gainedLUSD.add(vars.netLQTYmount);
		if (totalLUSD > 0) {
			stabilityPoolManager.getAssetStabilityPool(_asset).provideToSP(totalLUSD);

			// Providing to Stability Pool also triggers LQTY claim, so stake it if any
			uint256 LQTYBalanceAfter = LQTYToken.balanceOf(address(this));
			uint256 claimedLQTY = LQTYBalanceAfter.sub(LQTYBalanceBefore);
			if (claimedLQTY > 0) {
				LQTYStaking.stake(claimedLQTY);
			}
		}
	}

	function _getNetLQTYmount(address _asset, uint256 _collateral) internal returns (uint256) {
		uint256 price = priceFeed.fetchPrice(_asset);
		uint256 ICR = troveManager.getCurrentICR(_asset, address(this), price);

		uint256 LQTYmount = _collateral.mul(price).div(ICR);
		uint256 borrowingRate = troveManager.getBorrowingRateWithDecay(_asset);
		uint256 netDebt = LQTYmount.mul(LiquityMath.DECIMAL_PRECISION).div(
			LiquityMath.DECIMAL_PRECISION.add(borrowingRate)
		);

		return netDebt;
	}

	function _requireUserHasTrove(address _asset, address _depositor) internal view {
		require(
			troveManager.getTroLiquitytus(_asset, _depositor) == 1,
			"BorrowerWrappersScript: caller must have an active trove"
		);
	}
}
