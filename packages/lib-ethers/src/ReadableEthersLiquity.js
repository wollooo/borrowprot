"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReadableEthersLiquity = void 0;
const lib_base_1 = require("@liquity/lib-base");
const _utils_1 = require("./_utils");
const EthersLiquityConnection_1 = require("./EthersLiquityConnection");
const BlockPolledLiquityStore_1 = require("./BlockPolledLiquityStore");
// TODO: these are constant in the contracts, so it doesn't make sense to make a call for them,
// but to avoid having to update them here when we change them in the contracts, we could read
// them once after deployment and save them to LiquityDeployment.
const MINUTE_DECAY_FACTOR = lib_base_1.Decimal.from("0.999037758833783000");
const BETA = lib_base_1.Decimal.from(2);
var BackendTroveStatus;
(function (BackendTroveStatus) {
    BackendTroveStatus[BackendTroveStatus["nonExistent"] = 0] = "nonExistent";
    BackendTroveStatus[BackendTroveStatus["active"] = 1] = "active";
    BackendTroveStatus[BackendTroveStatus["closedByOwner"] = 2] = "closedByOwner";
    BackendTroveStatus[BackendTroveStatus["closedByLiquidation"] = 3] = "closedByLiquidation";
    BackendTroveStatus[BackendTroveStatus["closedByRedemption"] = 4] = "closedByRedemption";
})(BackendTroveStatus || (BackendTroveStatus = {}));
const userTroveStatusFrom = (backendStatus) => backendStatus === BackendTroveStatus.nonExistent
    ? "nonExistent"
    : backendStatus === BackendTroveStatus.active
        ? "open"
        : backendStatus === BackendTroveStatus.closedByOwner
            ? "closedByOwner"
            : backendStatus === BackendTroveStatus.closedByLiquidation
                ? "closedByLiquidation"
                : backendStatus === BackendTroveStatus.closedByRedemption
                    ? "closedByRedemption"
                    : _utils_1.panic(new Error(`invalid backendStatus ${backendStatus}`));
const convertToDate = (timestamp) => new Date(timestamp * 1000);
const validSortingOptions = ["ascendingCollateralRatio", "descendingCollateralRatio"];
const expectPositiveInt = (obj, key) => {
    if (obj[key] !== undefined) {
        if (!Number.isInteger(obj[key])) {
            throw new Error(`${key} must be an integer`);
        }
        if (obj[key] < 0) {
            throw new Error(`${key} must not be negative`);
        }
    }
};
/**
 * Ethers-based implementation of {@link @liquity/lib-base#ReadableLiquity}.
 *
 * @public
 */
class ReadableEthersLiquity {
    /** @internal */
    constructor(connection) {
        this.connection = connection;
    }
    /** @internal */
    static _from(connection) {
        const readable = new ReadableEthersLiquity(connection);
        return connection.useStore === "blockPolled"
            ? new _BlockPolledReadableEthersLiquity(readable)
            : readable;
    }
    /**
     * Connect to the Liquity protocol and create a `ReadableEthersLiquity` object.
     *
     * @param signerOrProvider - Ethers `Signer` or `Provider` to use for connecting to the Ethereum
     *                           network.
     * @param optionalParams - Optional parameters that can be used to customize the connection.
     */
    static async connect(signerOrProvider, optionalParams) {
        return ReadableEthersLiquity._from(await EthersLiquityConnection_1._connect(signerOrProvider, optionalParams));
    }
    hasStore() {
        return false;
    }
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getTotalRedistributed} */
    async getTotalRedistributed(overrides) {
        const { troveManager } = EthersLiquityConnection_1._getContracts(this.connection);
        const [collateral, debt] = await Promise.all([
            troveManager.L_ETH({ ...overrides }).then(_utils_1.decimalify),
            troveManager.L_LUSDDebt({ ...overrides }).then(_utils_1.decimalify)
        ]);
        return new lib_base_1.Trove(collateral, debt);
    }
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getTroveBeforeRedistribution} */
    async getTroveBeforeRedistribution(address, overrides) {
        address !== null && address !== void 0 ? address : (address = EthersLiquityConnection_1._requireAddress(this.connection));
        const { troveManager } = EthersLiquityConnection_1._getContracts(this.connection);
        const [trove, snapshot] = await Promise.all([
            troveManager.Troves(address, { ...overrides }),
            troveManager.rewardSnapshots(address, { ...overrides })
        ]);
        if (trove.status === BackendTroveStatus.active) {
            return new lib_base_1.TroveWithPendingRedistribution(address, userTroveStatusFrom(trove.status), _utils_1.decimalify(trove.coll), _utils_1.decimalify(trove.debt), _utils_1.decimalify(trove.stake), new lib_base_1.Trove(_utils_1.decimalify(snapshot.ETH), _utils_1.decimalify(snapshot.LUSDDebt)));
        }
        else {
            return new lib_base_1.TroveWithPendingRedistribution(address, userTroveStatusFrom(trove.status));
        }
    }
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getTrove} */
    async getTrove(address, overrides) {
        const [trove, totalRedistributed] = await Promise.all([
            this.getTroveBeforeRedistribution(address, overrides),
            this.getTotalRedistributed(overrides)
        ]);
        return trove.applyRedistribution(totalRedistributed);
    }
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getNumberOfTroves} */
    async getNumberOfTroves(overrides) {
        const { troveManager } = EthersLiquityConnection_1._getContracts(this.connection);
        return (await troveManager.getTroveOwnersCount({ ...overrides })).toNumber();
    }
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getPrice} */
    getPrice(overrides) {
        const { priceFeed } = EthersLiquityConnection_1._getContracts(this.connection);
        return priceFeed.callStatic.fetchPrice({ ...overrides }).then(_utils_1.decimalify);
    }
    /** @internal */
    async _getActivePool(overrides) {
        const { activePool } = EthersLiquityConnection_1._getContracts(this.connection);
        const [activeCollateral, activeDebt] = await Promise.all([
            activePool.getETH({ ...overrides }),
            activePool.getLUSDDebt({ ...overrides })
        ].map(getBigNumber => getBigNumber.then(_utils_1.decimalify)));
        return new lib_base_1.Trove(activeCollateral, activeDebt);
    }
    /** @internal */
    async _getDefaultPool(overrides) {
        const { defaultPool } = EthersLiquityConnection_1._getContracts(this.connection);
        const [liquidatedCollateral, closedDebt] = await Promise.all([
            defaultPool.getETH({ ...overrides }),
            defaultPool.getLUSDDebt({ ...overrides })
        ].map(getBigNumber => getBigNumber.then(_utils_1.decimalify)));
        return new lib_base_1.Trove(liquidatedCollateral, closedDebt);
    }
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getTotal} */
    async getTotal(overrides) {
        const [activePool, defaultPool] = await Promise.all([
            this._getActivePool(overrides),
            this._getDefaultPool(overrides)
        ]);
        return activePool.add(defaultPool);
    }
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getStabilityDeposit} */
    async getStabilityDeposit(address, overrides) {
        address !== null && address !== void 0 ? address : (address = EthersLiquityConnection_1._requireAddress(this.connection));
        const { stabilityPool } = EthersLiquityConnection_1._getContracts(this.connection);
        const [{ frontEndTag, initialValue }, currentLUSD, collateralGain, lqtyReward] = await Promise.all([
            stabilityPool.deposits(address, { ...overrides }),
            stabilityPool.getCompoundedLUSDDeposit(address, { ...overrides }),
            stabilityPool.getDepositorETHGain(address, { ...overrides }),
            stabilityPool.getDepositorLQTYGain(address, { ...overrides })
        ]);
        return new lib_base_1.StabilityDeposit(_utils_1.decimalify(initialValue), _utils_1.decimalify(currentLUSD), _utils_1.decimalify(collateralGain), _utils_1.decimalify(lqtyReward), frontEndTag);
    }
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getRemainingStabilityPoolLQTYReward} */
    async getRemainingStabilityPoolLQTYReward(overrides) {
        const { communityIssuance } = EthersLiquityConnection_1._getContracts(this.connection);
        const issuanceCap = this.connection.totalStabilityPoolLQTYReward;
        const totalLQTYIssued = _utils_1.decimalify(await communityIssuance.totalLQTYIssued({ ...overrides }));
        // totalLQTYIssued approaches but never reaches issuanceCap
        return issuanceCap.sub(totalLQTYIssued);
    }
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getLUSDInStabilityPool} */
    getLUSDInStabilityPool(overrides) {
        const { stabilityPool } = EthersLiquityConnection_1._getContracts(this.connection);
        return stabilityPool.getTotalLUSDDeposits({ ...overrides }).then(_utils_1.decimalify);
    }
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getLUSDBalance} */
    getLUSDBalance(address, overrides) {
        address !== null && address !== void 0 ? address : (address = EthersLiquityConnection_1._requireAddress(this.connection));
        const { lusdToken } = EthersLiquityConnection_1._getContracts(this.connection);
        return lusdToken.balanceOf(address, { ...overrides }).then(_utils_1.decimalify);
    }
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getLQTYBalance} */
    getLQTYBalance(address, overrides) {
        address !== null && address !== void 0 ? address : (address = EthersLiquityConnection_1._requireAddress(this.connection));
        const { lqtyToken } = EthersLiquityConnection_1._getContracts(this.connection);
        return lqtyToken.balanceOf(address, { ...overrides }).then(_utils_1.decimalify);
    }
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getUniTokenBalance} */
    getUniTokenBalance(address, overrides) {
        address !== null && address !== void 0 ? address : (address = EthersLiquityConnection_1._requireAddress(this.connection));
        const { uniToken } = EthersLiquityConnection_1._getContracts(this.connection);
        return uniToken.balanceOf(address, { ...overrides }).then(_utils_1.decimalify);
    }
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getUniTokenAllowance} */
    getUniTokenAllowance(address, overrides) {
        address !== null && address !== void 0 ? address : (address = EthersLiquityConnection_1._requireAddress(this.connection));
        const { uniToken, unipool } = EthersLiquityConnection_1._getContracts(this.connection);
        return uniToken.allowance(address, unipool.address, { ...overrides }).then(_utils_1.decimalify);
    }
    /** @internal */
    async _getRemainingLiquidityMiningLQTYRewardCalculator(overrides) {
        const { unipool } = EthersLiquityConnection_1._getContracts(this.connection);
        const [totalSupply, rewardRate, periodFinish, lastUpdateTime] = await Promise.all([
            unipool.totalSupply({ ...overrides }),
            unipool.rewardRate({ ...overrides }).then(_utils_1.decimalify),
            unipool.periodFinish({ ...overrides }).then(_utils_1.numberify),
            unipool.lastUpdateTime({ ...overrides }).then(_utils_1.numberify)
        ]);
        return (blockTimestamp) => rewardRate.mul(Math.max(0, periodFinish - (totalSupply.isZero() ? lastUpdateTime : blockTimestamp)));
    }
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getRemainingLiquidityMiningLQTYReward} */
    async getRemainingLiquidityMiningLQTYReward(overrides) {
        const [calculateRemainingLQTY, blockTimestamp] = await Promise.all([
            this._getRemainingLiquidityMiningLQTYRewardCalculator(overrides),
            this._getBlockTimestamp(overrides === null || overrides === void 0 ? void 0 : overrides.blockTag)
        ]);
        return calculateRemainingLQTY(blockTimestamp);
    }
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getLiquidityMiningStake} */
    getLiquidityMiningStake(address, overrides) {
        address !== null && address !== void 0 ? address : (address = EthersLiquityConnection_1._requireAddress(this.connection));
        const { unipool } = EthersLiquityConnection_1._getContracts(this.connection);
        return unipool.balanceOf(address, { ...overrides }).then(_utils_1.decimalify);
    }
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getTotalStakedUniTokens} */
    getTotalStakedUniTokens(overrides) {
        const { unipool } = EthersLiquityConnection_1._getContracts(this.connection);
        return unipool.totalSupply({ ...overrides }).then(_utils_1.decimalify);
    }
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getLiquidityMiningLQTYReward} */
    getLiquidityMiningLQTYReward(address, overrides) {
        address !== null && address !== void 0 ? address : (address = EthersLiquityConnection_1._requireAddress(this.connection));
        const { unipool } = EthersLiquityConnection_1._getContracts(this.connection);
        return unipool.earned(address, { ...overrides }).then(_utils_1.decimalify);
    }
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getCollateralSurplusBalance} */
    getCollateralSurplusBalance(address, overrides) {
        address !== null && address !== void 0 ? address : (address = EthersLiquityConnection_1._requireAddress(this.connection));
        const { collSurplusPool } = EthersLiquityConnection_1._getContracts(this.connection);
        return collSurplusPool.getCollateral(address, { ...overrides }).then(_utils_1.decimalify);
    }
    async getTroves(params, overrides) {
        var _a, _b;
        const { multiTroveGetter } = EthersLiquityConnection_1._getContracts(this.connection);
        expectPositiveInt(params, "first");
        expectPositiveInt(params, "startingAt");
        if (!validSortingOptions.includes(params.sortedBy)) {
            throw new Error(`sortedBy must be one of: ${validSortingOptions.map(x => `"${x}"`).join(", ")}`);
        }
        const [totalRedistributed, backendTroves] = await Promise.all([
            params.beforeRedistribution ? undefined : this.getTotalRedistributed({ ...overrides }),
            multiTroveGetter.getMultipleSortedTroves(params.sortedBy === "descendingCollateralRatio"
                ? (_a = params.startingAt) !== null && _a !== void 0 ? _a : 0 : -(((_b = params.startingAt) !== null && _b !== void 0 ? _b : 0) + 1), params.first, { ...overrides })
        ]);
        const troves = mapBackendTroves(backendTroves);
        if (totalRedistributed) {
            return troves.map(trove => trove.applyRedistribution(totalRedistributed));
        }
        else {
            return troves;
        }
    }
    /** @internal */
    _getBlockTimestamp(blockTag) {
        return EthersLiquityConnection_1._getBlockTimestamp(this.connection, blockTag);
    }
    /** @internal */
    async _getFeesFactory(overrides) {
        const { troveManager } = EthersLiquityConnection_1._getContracts(this.connection);
        const [lastFeeOperationTime, baseRateWithoutDecay] = await Promise.all([
            troveManager.lastFeeOperationTime({ ...overrides }),
            troveManager.baseRate({ ...overrides }).then(_utils_1.decimalify)
        ]);
        return (blockTimestamp, recoveryMode) => new lib_base_1.Fees(baseRateWithoutDecay, MINUTE_DECAY_FACTOR, BETA, convertToDate(lastFeeOperationTime.toNumber()), convertToDate(blockTimestamp), recoveryMode);
    }
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getFees} */
    async getFees(overrides) {
        const [createFees, total, price, blockTimestamp] = await Promise.all([
            this._getFeesFactory(overrides),
            this.getTotal(overrides),
            this.getPrice(overrides),
            this._getBlockTimestamp(overrides === null || overrides === void 0 ? void 0 : overrides.blockTag)
        ]);
        return createFees(blockTimestamp, total.collateralRatioIsBelowCritical(price));
    }
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getLQTYStake} */
    async getLQTYStake(address, overrides) {
        address !== null && address !== void 0 ? address : (address = EthersLiquityConnection_1._requireAddress(this.connection));
        const { lqtyStaking } = EthersLiquityConnection_1._getContracts(this.connection);
        const [stakedLQTY, collateralGain, lusdGain] = await Promise.all([
            lqtyStaking.stakes(address, { ...overrides }),
            lqtyStaking.getPendingETHGain(address, { ...overrides }),
            lqtyStaking.getPendingLUSDGain(address, { ...overrides })
        ].map(getBigNumber => getBigNumber.then(_utils_1.decimalify)));
        return new lib_base_1.LQTYStake(stakedLQTY, collateralGain, lusdGain);
    }
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getTotalStakedLQTY} */
    async getTotalStakedLQTY(overrides) {
        const { lqtyStaking } = EthersLiquityConnection_1._getContracts(this.connection);
        return lqtyStaking.totalLQTYStaked({ ...overrides }).then(_utils_1.decimalify);
    }
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getFrontendStatus} */
    async getFrontendStatus(address, overrides) {
        address !== null && address !== void 0 ? address : (address = EthersLiquityConnection_1._requireFrontendAddress(this.connection));
        const { stabilityPool } = EthersLiquityConnection_1._getContracts(this.connection);
        const { registered, kickbackRate } = await stabilityPool.frontEnds(address, { ...overrides });
        return registered
            ? { status: "registered", kickbackRate: _utils_1.decimalify(kickbackRate) }
            : { status: "unregistered" };
    }
}
exports.ReadableEthersLiquity = ReadableEthersLiquity;
const mapBackendTroves = (troves) => troves.map(trove => new lib_base_1.TroveWithPendingRedistribution(trove.owner, "open", // These Troves are coming from the SortedTroves list, so they must be open
_utils_1.decimalify(trove.coll), _utils_1.decimalify(trove.debt), _utils_1.decimalify(trove.stake), new lib_base_1.Trove(_utils_1.decimalify(trove.snapshotETH), _utils_1.decimalify(trove.snapshotLUSDDebt))));
class _BlockPolledReadableEthersLiquity {
    constructor(readable) {
        const store = new BlockPolledLiquityStore_1.BlockPolledLiquityStore(readable);
        this.store = store;
        this.connection = readable.connection;
        this._readable = readable;
    }
    _blockHit(overrides) {
        return (!overrides ||
            overrides.blockTag === undefined ||
            overrides.blockTag === this.store.state.blockTag);
    }
    _userHit(address, overrides) {
        return (this._blockHit(overrides) &&
            (address === undefined || address === this.store.connection.userAddress));
    }
    _frontendHit(address, overrides) {
        return (this._blockHit(overrides) &&
            (address === undefined || address === this.store.connection.frontendTag));
    }
    hasStore(store) {
        return store === undefined || store === "blockPolled";
    }
    async getTotalRedistributed(overrides) {
        return this._blockHit(overrides)
            ? this.store.state.totalRedistributed
            : this._readable.getTotalRedistributed(overrides);
    }
    async getTroveBeforeRedistribution(address, overrides) {
        return this._userHit(address, overrides)
            ? this.store.state.troveBeforeRedistribution
            : this._readable.getTroveBeforeRedistribution(address, overrides);
    }
    async getTrove(address, overrides) {
        return this._userHit(address, overrides)
            ? this.store.state.trove
            : this._readable.getTrove(address, overrides);
    }
    async getNumberOfTroves(overrides) {
        return this._blockHit(overrides)
            ? this.store.state.numberOfTroves
            : this._readable.getNumberOfTroves(overrides);
    }
    async getPrice(overrides) {
        return this._blockHit(overrides) ? this.store.state.price : this._readable.getPrice(overrides);
    }
    async getTotal(overrides) {
        return this._blockHit(overrides) ? this.store.state.total : this._readable.getTotal(overrides);
    }
    async getStabilityDeposit(address, overrides) {
        return this._userHit(address, overrides)
            ? this.store.state.stabilityDeposit
            : this._readable.getStabilityDeposit(address, overrides);
    }
    async getRemainingStabilityPoolLQTYReward(overrides) {
        return this._blockHit(overrides)
            ? this.store.state.remainingStabilityPoolLQTYReward
            : this._readable.getRemainingStabilityPoolLQTYReward(overrides);
    }
    async getLUSDInStabilityPool(overrides) {
        return this._blockHit(overrides)
            ? this.store.state.lusdInStabilityPool
            : this._readable.getLUSDInStabilityPool(overrides);
    }
    async getLUSDBalance(address, overrides) {
        return this._userHit(address, overrides)
            ? this.store.state.lusdBalance
            : this._readable.getLUSDBalance(address, overrides);
    }
    async getLQTYBalance(address, overrides) {
        return this._userHit(address, overrides)
            ? this.store.state.lqtyBalance
            : this._readable.getLQTYBalance(address, overrides);
    }
    async getUniTokenBalance(address, overrides) {
        return this._userHit(address, overrides)
            ? this.store.state.uniTokenBalance
            : this._readable.getUniTokenBalance(address, overrides);
    }
    async getUniTokenAllowance(address, overrides) {
        return this._userHit(address, overrides)
            ? this.store.state.uniTokenAllowance
            : this._readable.getUniTokenAllowance(address, overrides);
    }
    async getRemainingLiquidityMiningLQTYReward(overrides) {
        return this._blockHit(overrides)
            ? this.store.state.remainingLiquidityMiningLQTYReward
            : this._readable.getRemainingLiquidityMiningLQTYReward(overrides);
    }
    async getLiquidityMiningStake(address, overrides) {
        return this._userHit(address, overrides)
            ? this.store.state.liquidityMiningStake
            : this._readable.getLiquidityMiningStake(address, overrides);
    }
    async getTotalStakedUniTokens(overrides) {
        return this._blockHit(overrides)
            ? this.store.state.totalStakedUniTokens
            : this._readable.getTotalStakedUniTokens(overrides);
    }
    async getLiquidityMiningLQTYReward(address, overrides) {
        return this._userHit(address, overrides)
            ? this.store.state.liquidityMiningLQTYReward
            : this._readable.getLiquidityMiningLQTYReward(address, overrides);
    }
    async getCollateralSurplusBalance(address, overrides) {
        return this._userHit(address, overrides)
            ? this.store.state.collateralSurplusBalance
            : this._readable.getCollateralSurplusBalance(address, overrides);
    }
    async _getBlockTimestamp(blockTag) {
        return this._blockHit({ blockTag })
            ? this.store.state.blockTimestamp
            : this._readable._getBlockTimestamp(blockTag);
    }
    async _getFeesFactory(overrides) {
        return this._blockHit(overrides)
            ? this.store.state._feesFactory
            : this._readable._getFeesFactory(overrides);
    }
    async getFees(overrides) {
        return this._blockHit(overrides) ? this.store.state.fees : this._readable.getFees(overrides);
    }
    async getLQTYStake(address, overrides) {
        return this._userHit(address, overrides)
            ? this.store.state.lqtyStake
            : this._readable.getLQTYStake(address, overrides);
    }
    async getTotalStakedLQTY(overrides) {
        return this._blockHit(overrides)
            ? this.store.state.totalStakedLQTY
            : this._readable.getTotalStakedLQTY(overrides);
    }
    async getFrontendStatus(address, overrides) {
        return this._frontendHit(address, overrides)
            ? this.store.state.frontend
            : this._readable.getFrontendStatus(address, overrides);
    }
    getTroves(params, overrides) {
        return this._readable.getTroves(params, overrides);
    }
    _getActivePool() {
        throw new Error("Method not implemented.");
    }
    _getDefaultPool() {
        throw new Error("Method not implemented.");
    }
    _getRemainingLiquidityMiningLQTYRewardCalculator() {
        throw new Error("Method not implemented.");
    }
}
//# sourceMappingURL=ReadableEthersLiquity.js.map