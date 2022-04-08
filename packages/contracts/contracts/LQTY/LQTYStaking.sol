// SPDX-License-Identifier: MIT

pragma solidity 0.8.11;

// import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "../Dependencies/BaseMath.sol";
import "../Dependencies/SafeMath.sol";
import "../Dependencies/Ownable.sol";
import "../Dependencies/CheckContract.sol";
import "../Dependencies/console.sol";
import "../Interfaces/ILQTYToken.sol";
import "../Interfaces/ILQTYStaking.sol";
import "../Dependencies/LiquityMath.sol";
import "../Interfaces/IKUSDToken.sol";

contract LQTYStaking is ILQTYStaking, Ownable, CheckContract, BaseMath {
    using SafeMath for uint;

    // bool public isInitialized;
    // --- Data ---
    string constant public NAME = "LQTYStaking";

    mapping( address => uint) public stakes;
    uint public totalLQTYStaked;

    uint public F_ETH;  // Running sum of ETH fees per-LQTY-staked
    uint public F_KUSD; // Running sum of LQTY fees per-LQTY-staked

    // User snapshots of F_ETH and F_KUSD, taken at the point at which their latest deposit was made
    mapping (address => Snapshot) public snapshots; 

    struct Snapshot {
        uint F_ETH_Snapshot;
        uint F_KUSD_Snapshot;
    }
    
    ILQTYToken public lqtyToken;
    IKUSDToken public kusdToken;

    address public troveManagerAddress;
    address public borrowerOperationsAddress;
    address public activePoolAddress;

    // --- Events ---

    // event LQTYTokenAddressSet(address _lqtyTokenAddress);
    // event KUSDTokenAddressSet(address _kusdTokenAddress);
    // event TroveManagerAddressSet(address _troveManager);
    // event BorrowerOperationsAddressSet(address _borrowerOperationsAddress);
    // event ActivePoolAddressSet(address _activePoolAddress);

    // event StakeChanged(address indexed staker, uint newStake);
    // event StakingGainsWithdrawn(address indexed staker, uint KUSDGain, uint ETHGain);
    // event F_ETHUpdated(uint _F_ETH);
    // event F_KUSDUpdated(uint _F_KUSD);
    // event TotalLQTYStakedUpdated(uint _totalLQTYStaked);
    // event EtherSent(address _account, uint _amount);
    // event StakerSnapshotsUpdated(address _staker, uint _F_ETH, uint _F_KUSD);

    // --- Functions ---

    function setAddresses
    (
        address _lqtyTokenAddress,
        address _kusdTokenAddress,
        address _troveManagerAddress, 
        address _borrowerOperationsAddress,
        address _activePoolAddress
    ) 
        external 
        onlyOwner
        override 
    {
        // require(!isInitialized, "Already Initialized");
        checkContract(_lqtyTokenAddress);
        checkContract(_kusdTokenAddress);
        checkContract(_troveManagerAddress);
        checkContract(_borrowerOperationsAddress);
        checkContract(_activePoolAddress);
        // isInitialized = true;

        // __Ownable_init();

        lqtyToken = ILQTYToken(_lqtyTokenAddress);
        kusdToken = IKUSDToken(_kusdTokenAddress);
        troveManagerAddress = _troveManagerAddress;
        borrowerOperationsAddress = _borrowerOperationsAddress;
        activePoolAddress = _activePoolAddress;

        emit LQTYTokenAddressSet(_lqtyTokenAddress);
        emit LQTYTokenAddressSet(_kusdTokenAddress);
        emit TroveManagerAddressSet(_troveManagerAddress);
        emit BorrowerOperationsAddressSet(_borrowerOperationsAddress);
        emit ActivePoolAddressSet(_activePoolAddress);

        _renounceOwnership();
    }

    // If caller has a pre-existing stake, send any accumulated ETH and KUSD gains to them. 
    function stake(uint _LQTYamount) external override {
        _requireNonZeroAmount(_LQTYamount);

        uint currentStake = stakes[msg.sender];

        uint ETHGain;
        uint KUSDGain;
        // Grab any accumulated ETH and KUSD gains from the current stake
        if (currentStake != 0) {
            ETHGain = _getPendingETHGain(msg.sender);
            KUSDGain = _getPendingKUSDGain(msg.sender);
        }
    
       _updateUserSnapshots(msg.sender);

        uint newStake = currentStake.add(_LQTYamount);

        // Increase user’s stake and total LQTY staked
        stakes[msg.sender] = newStake;
        totalLQTYStaked = totalLQTYStaked.add(_LQTYamount);
        emit TotalLQTYStakedUpdated(totalLQTYStaked);

        // Transfer LQTY from caller to this contract
        lqtyToken.sendToLQTYStaking(msg.sender, _LQTYamount);

        emit StakeChanged(msg.sender, newStake);
        emit StakingGainsWithdrawn(msg.sender, KUSDGain, ETHGain);

         // Send accumulated KUSD and ETH gains to the caller
        if (currentStake != 0) {
            kusdToken.transfer(msg.sender, KUSDGain);
            _sendETHGainToUser(ETHGain);
        }
    }

    // Unstake the LQTY and send the it back to the caller, along with their accumulated KUSD & ETH gains. 
    // If requested amount > stake, send their entire stake.
    function unstake(uint _LQTYamount) external override {
        uint currentStake = stakes[msg.sender];
        _requireUserHasStake(currentStake);

        // Grab any accumulated ETH and KUSD gains from the current stake
        uint ETHGain = _getPendingETHGain(msg.sender);
        uint KUSDGain = _getPendingKUSDGain(msg.sender);
        
        _updateUserSnapshots(msg.sender);

        if (_LQTYamount > 0) {
            uint LQTYToWithdraw = LiquityMath._min(_LQTYamount, currentStake);

            uint newStake = currentStake.sub(LQTYToWithdraw);

            // Decrease user's stake and total LQTY staked
            stakes[msg.sender] = newStake;
            totalLQTYStaked = totalLQTYStaked.sub(LQTYToWithdraw);
            emit TotalLQTYStakedUpdated(totalLQTYStaked);

            // Transfer unstaked LQTY to user
            lqtyToken.transfer(msg.sender, LQTYToWithdraw);

            emit StakeChanged(msg.sender, newStake);
        }

        emit StakingGainsWithdrawn(msg.sender, KUSDGain, ETHGain);

        // Send accumulated KUSD and ETH gains to the caller
        kusdToken.transfer(msg.sender, KUSDGain);
        _sendETHGainToUser(ETHGain);
    }

    // --- Reward-per-unit-staked increase functions. Called by Liquity core contracts ---

    function increaseF_ETH(uint _ETHFee) external override {
        _requireCallerIsTroveManager();
        uint ETHFeePerLQTYStaked;
     
        if (totalLQTYStaked > 0) {ETHFeePerLQTYStaked = _ETHFee.mul(DECIMAL_PRECISION).div(totalLQTYStaked);}

        F_ETH = F_ETH.add(ETHFeePerLQTYStaked); 
        emit F_ETHUpdated(F_ETH);
    }

    function increaseF_KUSD(uint _KUSDFee) external override {
        _requireCallerIsBorrowerOperations();
        uint KUSDFeePerLQTYStaked;
        
        if (totalLQTYStaked > 0) {KUSDFeePerLQTYStaked = _KUSDFee.mul(DECIMAL_PRECISION).div(totalLQTYStaked);}
        
        F_KUSD = F_KUSD.add(KUSDFeePerLQTYStaked);
        emit F_KUSDUpdated(F_KUSD);
    }

    // --- Pending reward functions ---

    function getPendingETHGain(address _user) external view override returns (uint) {
        return _getPendingETHGain(_user);
    }

    function _getPendingETHGain(address _user) internal view returns (uint) {
        uint F_ETH_Snapshot = snapshots[_user].F_ETH_Snapshot;
        uint ETHGain = stakes[_user].mul(F_ETH.sub(F_ETH_Snapshot)).div(DECIMAL_PRECISION);
        return ETHGain;
    }

    function getPendingKUSDGain(address _user) external view override returns (uint) {
        return _getPendingKUSDGain(_user);
    }

    function _getPendingKUSDGain(address _user) internal view returns (uint) {
        uint F_KUSD_Snapshot = snapshots[_user].F_KUSD_Snapshot;
        uint KUSDGain = stakes[_user].mul(F_KUSD.sub(F_KUSD_Snapshot)).div(DECIMAL_PRECISION);
        return KUSDGain;
    }

    // --- Internal helper functions ---

    function _updateUserSnapshots(address _user) internal {
        snapshots[_user].F_ETH_Snapshot = F_ETH;
        snapshots[_user].F_KUSD_Snapshot = F_KUSD;
        emit StakerSnapshotsUpdated(_user, F_ETH, F_KUSD);
    }

    function _sendETHGainToUser(uint ETHGain) internal {
        emit EtherSent(msg.sender, ETHGain);
        (bool success, ) = msg.sender.call{value: ETHGain}("");
        require(success, "LQTYStaking: Failed to send accumulated ETHGain");
    }

    // --- 'require' functions ---

    function _requireCallerIsTroveManager() internal view {
        require(msg.sender == troveManagerAddress, "LQTYStaking: caller is not TroveM");
    }

    function _requireCallerIsBorrowerOperations() internal view {
        require(msg.sender == borrowerOperationsAddress, "LQTYStaking: caller is not BorrowerOps");
    }

     function _requireCallerIsActivePool() internal view {
        require(msg.sender == activePoolAddress, "LQTYStaking: caller is not ActivePool");
    }

    function _requireUserHasStake(uint currentStake) internal pure {  
        require(currentStake > 0, 'LQTYStaking: User must have a non-zero stake');  
    }

    function _requireNonZeroAmount(uint _amount) internal pure {
        require(_amount > 0, 'LQTYStaking: Amount must be non-zero');
    }

    receive() external payable {
        _requireCallerIsActivePool();
    }
}
