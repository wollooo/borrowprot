"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EthersLiquity = exports.EthersTransactionFailedError = void 0;
const lib_base_1 = require("@liquity/lib-base");
const EthersLiquityConnection_1 = require("./EthersLiquityConnection");
const PopulatableEthersLiquity_1 = require("./PopulatableEthersLiquity");
const ReadableEthersLiquity_1 = require("./ReadableEthersLiquity");
const SendableEthersLiquity_1 = require("./SendableEthersLiquity");
/**
 * Thrown by {@link EthersLiquity} in case of transaction failure.
 *
 * @public
 */
class EthersTransactionFailedError extends lib_base_1.TransactionFailedError {
    constructor(message, failedReceipt) {
        super("EthersTransactionFailedError", message, failedReceipt);
    }
}
exports.EthersTransactionFailedError = EthersTransactionFailedError;
const waitForSuccess = async (tx) => {
    const receipt = await tx.waitForReceipt();
    if (receipt.status !== "succeeded") {
        throw new EthersTransactionFailedError("Transaction failed", receipt);
    }
    return receipt.details;
};
/**
 * Convenience class that combines multiple interfaces of the library in one object.
 *
 * @public
 */
class EthersLiquity {
    /** @internal */
    constructor(readable) {
        this._readable = readable;
        this.connection = readable.connection;
        this.populate = new PopulatableEthersLiquity_1.PopulatableEthersLiquity(readable);
        this.send = new SendableEthersLiquity_1.SendableEthersLiquity(this.populate);
    }
    /** @internal */
    static _from(connection) {
        if (EthersLiquityConnection_1._usingStore(connection)) {
            return new _EthersLiquityWithStore(ReadableEthersLiquity_1.ReadableEthersLiquity._from(connection));
        }
        else {
            return new EthersLiquity(ReadableEthersLiquity_1.ReadableEthersLiquity._from(connection));
        }
    }
    static async connect(signerOrProvider, optionalParams) {
        return EthersLiquity._from(await EthersLiquityConnection_1._connect(signerOrProvider, optionalParams));
    }
    hasStore() {
        return false;
    }
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getTotalRedistributed} */
    getTotalRedistributed(overrides) {
        return this._readable.getTotalRedistributed(overrides);
    }
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getTroveBeforeRedistribution} */
    getTroveBeforeRedistribution(address, overrides) {
        return this._readable.getTroveBeforeRedistribution(address, overrides);
    }
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getTrove} */
    getTrove(address, overrides) {
        return this._readable.getTrove(address, overrides);
    }
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getNumberOfTroves} */
    getNumberOfTroves(overrides) {
        return this._readable.getNumberOfTroves(overrides);
    }
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getPrice} */
    getPrice(overrides) {
        return this._readable.getPrice(overrides);
    }
    /** @internal */
    _getActivePool(overrides) {
        return this._readable._getActivePool(overrides);
    }
    /** @internal */
    _getDefaultPool(overrides) {
        return this._readable._getDefaultPool(overrides);
    }
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getTotal} */
    getTotal(overrides) {
        return this._readable.getTotal(overrides);
    }
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getStabilityDeposit} */
    getStabilityDeposit(address, overrides) {
        return this._readable.getStabilityDeposit(address, overrides);
    }
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getRemainingStabilityPoolLQTYReward} */
    getRemainingStabilityPoolLQTYReward(overrides) {
        return this._readable.getRemainingStabilityPoolLQTYReward(overrides);
    }
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getLUSDInStabilityPool} */
    getLUSDInStabilityPool(overrides) {
        return this._readable.getLUSDInStabilityPool(overrides);
    }
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getLUSDBalance} */
    getLUSDBalance(address, overrides) {
        return this._readable.getLUSDBalance(address, overrides);
    }
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getLQTYBalance} */
    getLQTYBalance(address, overrides) {
        return this._readable.getLQTYBalance(address, overrides);
    }
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getUniTokenBalance} */
    getUniTokenBalance(address, overrides) {
        return this._readable.getUniTokenBalance(address, overrides);
    }
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getUniTokenAllowance} */
    getUniTokenAllowance(address, overrides) {
        return this._readable.getUniTokenAllowance(address, overrides);
    }
    /** @internal */
    _getRemainingLiquidityMiningLQTYRewardCalculator(overrides) {
        return this._readable._getRemainingLiquidityMiningLQTYRewardCalculator(overrides);
    }
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getRemainingLiquidityMiningLQTYReward} */
    getRemainingLiquidityMiningLQTYReward(overrides) {
        return this._readable.getRemainingLiquidityMiningLQTYReward(overrides);
    }
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getLiquidityMiningStake} */
    getLiquidityMiningStake(address, overrides) {
        return this._readable.getLiquidityMiningStake(address, overrides);
    }
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getTotalStakedUniTokens} */
    getTotalStakedUniTokens(overrides) {
        return this._readable.getTotalStakedUniTokens(overrides);
    }
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getLiquidityMiningLQTYReward} */
    getLiquidityMiningLQTYReward(address, overrides) {
        return this._readable.getLiquidityMiningLQTYReward(address, overrides);
    }
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getCollateralSurplusBalance} */
    getCollateralSurplusBalance(address, overrides) {
        return this._readable.getCollateralSurplusBalance(address, overrides);
    }
    getTroves(params, overrides) {
        return this._readable.getTroves(params, overrides);
    }
    /** @internal */
    _getBlockTimestamp(blockTag) {
        return this._readable._getBlockTimestamp(blockTag);
    }
    /** @internal */
    _getFeesFactory(overrides) {
        return this._readable._getFeesFactory(overrides);
    }
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getFees} */
    getFees(overrides) {
        return this._readable.getFees(overrides);
    }
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getLQTYStake} */
    getLQTYStake(address, overrides) {
        return this._readable.getLQTYStake(address, overrides);
    }
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getTotalStakedLQTY} */
    getTotalStakedLQTY(overrides) {
        return this._readable.getTotalStakedLQTY(overrides);
    }
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getFrontendStatus} */
    getFrontendStatus(address, overrides) {
        return this._readable.getFrontendStatus(address, overrides);
    }
    /**
     * {@inheritDoc @liquity/lib-base#TransactableLiquity.openTrove}
     *
     * @throws
     * Throws {@link EthersTransactionFailedError} in case of transaction failure.
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    openTrove(params, maxBorrowingRateOrOptionalParams, overrides) {
        return this.send
            .openTrove(params, maxBorrowingRateOrOptionalParams, overrides)
            .then(waitForSuccess);
    }
    /**
     * {@inheritDoc @liquity/lib-base#TransactableLiquity.closeTrove}
     *
     * @throws
     * Throws {@link EthersTransactionFailedError} in case of transaction failure.
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    closeTrove(overrides) {
        return this.send.closeTrove(overrides).then(waitForSuccess);
    }
    /**
     * {@inheritDoc @liquity/lib-base#TransactableLiquity.adjustTrove}
     *
     * @throws
     * Throws {@link EthersTransactionFailedError} in case of transaction failure.
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    adjustTrove(params, maxBorrowingRateOrOptionalParams, overrides) {
        return this.send
            .adjustTrove(params, maxBorrowingRateOrOptionalParams, overrides)
            .then(waitForSuccess);
    }
    /**
     * {@inheritDoc @liquity/lib-base#TransactableLiquity.depositCollateral}
     *
     * @throws
     * Throws {@link EthersTransactionFailedError} in case of transaction failure.
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    depositCollateral(amount, overrides) {
        return this.send.depositCollateral(amount, overrides).then(waitForSuccess);
    }
    /**
     * {@inheritDoc @liquity/lib-base#TransactableLiquity.withdrawCollateral}
     *
     * @throws
     * Throws {@link EthersTransactionFailedError} in case of transaction failure.
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    withdrawCollateral(amount, overrides) {
        return this.send.withdrawCollateral(amount, overrides).then(waitForSuccess);
    }
    /**
     * {@inheritDoc @liquity/lib-base#TransactableLiquity.borrowLUSD}
     *
     * @throws
     * Throws {@link EthersTransactionFailedError} in case of transaction failure.
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    borrowLUSD(amount, maxBorrowingRate, overrides) {
        return this.send.borrowLUSD(amount, maxBorrowingRate, overrides).then(waitForSuccess);
    }
    /**
     * {@inheritDoc @liquity/lib-base#TransactableLiquity.repayLUSD}
     *
     * @throws
     * Throws {@link EthersTransactionFailedError} in case of transaction failure.
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    repayLUSD(amount, overrides) {
        return this.send.repayLUSD(amount, overrides).then(waitForSuccess);
    }
    /** @internal */
    setPrice(price, overrides) {
        return this.send.setPrice(price, overrides).then(waitForSuccess);
    }
    /**
     * {@inheritDoc @liquity/lib-base#TransactableLiquity.liquidate}
     *
     * @throws
     * Throws {@link EthersTransactionFailedError} in case of transaction failure.
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    liquidate(address, overrides) {
        return this.send.liquidate(address, overrides).then(waitForSuccess);
    }
    /**
     * {@inheritDoc @liquity/lib-base#TransactableLiquity.liquidateUpTo}
     *
     * @throws
     * Throws {@link EthersTransactionFailedError} in case of transaction failure.
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    liquidateUpTo(maximumNumberOfTrovesToLiquidate, overrides) {
        return this.send.liquidateUpTo(maximumNumberOfTrovesToLiquidate, overrides).then(waitForSuccess);
    }
    /**
     * {@inheritDoc @liquity/lib-base#TransactableLiquity.depositLUSDInStabilityPool}
     *
     * @throws
     * Throws {@link EthersTransactionFailedError} in case of transaction failure.
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    depositLUSDInStabilityPool(amount, frontendTag, overrides) {
        return this.send.depositLUSDInStabilityPool(amount, frontendTag, overrides).then(waitForSuccess);
    }
    /**
     * {@inheritDoc @liquity/lib-base#TransactableLiquity.withdrawLUSDFromStabilityPool}
     *
     * @throws
     * Throws {@link EthersTransactionFailedError} in case of transaction failure.
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    withdrawLUSDFromStabilityPool(amount, overrides) {
        return this.send.withdrawLUSDFromStabilityPool(amount, overrides).then(waitForSuccess);
    }
    /**
     * {@inheritDoc @liquity/lib-base#TransactableLiquity.withdrawGainsFromStabilityPool}
     *
     * @throws
     * Throws {@link EthersTransactionFailedError} in case of transaction failure.
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    withdrawGainsFromStabilityPool(overrides) {
        return this.send.withdrawGainsFromStabilityPool(overrides).then(waitForSuccess);
    }
    /**
     * {@inheritDoc @liquity/lib-base#TransactableLiquity.transferCollateralGainToTrove}
     *
     * @throws
     * Throws {@link EthersTransactionFailedError} in case of transaction failure.
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    transferCollateralGainToTrove(overrides) {
        return this.send.transferCollateralGainToTrove(overrides).then(waitForSuccess);
    }
    /**
     * {@inheritDoc @liquity/lib-base#TransactableLiquity.sendLUSD}
     *
     * @throws
     * Throws {@link EthersTransactionFailedError} in case of transaction failure.
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    sendLUSD(toAddress, amount, overrides) {
        return this.send.sendLUSD(toAddress, amount, overrides).then(waitForSuccess);
    }
    /**
     * {@inheritDoc @liquity/lib-base#TransactableLiquity.sendLQTY}
     *
     * @throws
     * Throws {@link EthersTransactionFailedError} in case of transaction failure.
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    sendLQTY(toAddress, amount, overrides) {
        return this.send.sendLQTY(toAddress, amount, overrides).then(waitForSuccess);
    }
    /**
     * {@inheritDoc @liquity/lib-base#TransactableLiquity.redeemLUSD}
     *
     * @throws
     * Throws {@link EthersTransactionFailedError} in case of transaction failure.
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    redeemLUSD(amount, maxRedemptionRate, overrides) {
        return this.send.redeemLUSD(amount, maxRedemptionRate, overrides).then(waitForSuccess);
    }
    /**
     * {@inheritDoc @liquity/lib-base#TransactableLiquity.claimCollateralSurplus}
     *
     * @throws
     * Throws {@link EthersTransactionFailedError} in case of transaction failure.
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    claimCollateralSurplus(overrides) {
        return this.send.claimCollateralSurplus(overrides).then(waitForSuccess);
    }
    /**
     * {@inheritDoc @liquity/lib-base#TransactableLiquity.stakeLQTY}
     *
     * @throws
     * Throws {@link EthersTransactionFailedError} in case of transaction failure.
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    stakeLQTY(amount, overrides) {
        return this.send.stakeLQTY(amount, overrides).then(waitForSuccess);
    }
    /**
     * {@inheritDoc @liquity/lib-base#TransactableLiquity.unstakeLQTY}
     *
     * @throws
     * Throws {@link EthersTransactionFailedError} in case of transaction failure.
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    unstakeLQTY(amount, overrides) {
        return this.send.unstakeLQTY(amount, overrides).then(waitForSuccess);
    }
    /**
     * {@inheritDoc @liquity/lib-base#TransactableLiquity.withdrawGainsFromStaking}
     *
     * @throws
     * Throws {@link EthersTransactionFailedError} in case of transaction failure.
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    withdrawGainsFromStaking(overrides) {
        return this.send.withdrawGainsFromStaking(overrides).then(waitForSuccess);
    }
    /**
     * {@inheritDoc @liquity/lib-base#TransactableLiquity.registerFrontend}
     *
     * @throws
     * Throws {@link EthersTransactionFailedError} in case of transaction failure.
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    registerFrontend(kickbackRate, overrides) {
        return this.send.registerFrontend(kickbackRate, overrides).then(waitForSuccess);
    }
    /** @internal */
    _mintUniToken(amount, address, overrides) {
        return this.send._mintUniToken(amount, address, overrides).then(waitForSuccess);
    }
    /**
     * {@inheritDoc @liquity/lib-base#TransactableLiquity.approveUniTokens}
     *
     * @throws
     * Throws {@link EthersTransactionFailedError} in case of transaction failure.
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    approveUniTokens(allowance, overrides) {
        return this.send.approveUniTokens(allowance, overrides).then(waitForSuccess);
    }
    /**
     * {@inheritDoc @liquity/lib-base#TransactableLiquity.stakeUniTokens}
     *
     * @throws
     * Throws {@link EthersTransactionFailedError} in case of transaction failure.
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    stakeUniTokens(amount, overrides) {
        return this.send.stakeUniTokens(amount, overrides).then(waitForSuccess);
    }
    /**
     * {@inheritDoc @liquity/lib-base#TransactableLiquity.unstakeUniTokens}
     *
     * @throws
     * Throws {@link EthersTransactionFailedError} in case of transaction failure.
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    unstakeUniTokens(amount, overrides) {
        return this.send.unstakeUniTokens(amount, overrides).then(waitForSuccess);
    }
    /**
     * {@inheritDoc @liquity/lib-base#TransactableLiquity.withdrawLQTYRewardFromLiquidityMining}
     *
     * @throws
     * Throws {@link EthersTransactionFailedError} in case of transaction failure.
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    withdrawLQTYRewardFromLiquidityMining(overrides) {
        return this.send.withdrawLQTYRewardFromLiquidityMining(overrides).then(waitForSuccess);
    }
    /**
     * {@inheritDoc @liquity/lib-base#TransactableLiquity.exitLiquidityMining}
     *
     * @throws
     * Throws {@link EthersTransactionFailedError} in case of transaction failure.
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    exitLiquidityMining(overrides) {
        return this.send.exitLiquidityMining(overrides).then(waitForSuccess);
    }
}
exports.EthersLiquity = EthersLiquity;
class _EthersLiquityWithStore extends EthersLiquity {
    constructor(readable) {
        super(readable);
        this.store = readable.store;
    }
    hasStore(store) {
        return store === undefined || store === this.connection.useStore;
    }
}
//# sourceMappingURL=EthersLiquity.js.map