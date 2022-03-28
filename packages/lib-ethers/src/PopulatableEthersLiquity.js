"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PopulatableEthersLiquity = exports.PopulatedEthersRedemption = exports.PopulatedEthersLiquityTransaction = exports.SentEthersLiquityTransaction = exports.EthersTransactionCancelledError = exports._RawErrorReason = exports._redeemMaxIterations = void 0;
const assert_1 = __importDefault(require("assert"));
const constants_1 = require("@ethersproject/constants");
const logger_1 = require("@ethersproject/logger");
const lib_base_1 = require("@liquity/lib-base");
const EthersLiquityConnection_1 = require("./EthersLiquityConnection");
const _utils_1 = require("./_utils");
const contracts_1 = require("./contracts");
const parseLogs_1 = require("./parseLogs");
const bigNumberMax = (a, b) => ((b === null || b === void 0 ? void 0 : b.gt(a)) ? b : a);
// With 70 iterations redemption costs about ~10M gas, and each iteration accounts for ~138k more
/** @internal */
exports._redeemMaxIterations = 70;
const defaultBorrowingRateSlippageTolerance = lib_base_1.Decimal.from(0.005); // 0.5%
const defaultRedemptionRateSlippageTolerance = lib_base_1.Decimal.from(0.001); // 0.1%
const defaultBorrowingFeeDecayToleranceMinutes = 10;
const noDetails = () => undefined;
const compose = (f, g) => (_) => f(g(_));
const id = (t) => t;
// Takes ~6-7K (use 10K to be safe) to update lastFeeOperationTime, but the cost of calculating the
// decayed baseRate increases logarithmically with time elapsed since the last update.
const addGasForBaseRateUpdate = (maxMinutesSinceLastUpdate = 10) => (gas) => gas.add(10000 + 1414 * Math.ceil(Math.log2(maxMinutesSinceLastUpdate + 1)));
// First traversal in ascending direction takes ~50K, then ~13.5K per extra step.
// 80K should be enough for 3 steps, plus some extra to be safe.
const addGasForPotentialListTraversal = (gas) => gas.add(80000);
const addGasForLQTYIssuance = (gas) => gas.add(50000);
const addGasForUnipoolRewardUpdate = (gas) => gas.add(20000);
// To get the best entropy available, we'd do something like:
//
// const bigRandomNumber = () =>
//   BigNumber.from(
//     `0x${Array.from(crypto.getRandomValues(new Uint32Array(8)))
//       .map(u32 => u32.toString(16).padStart(8, "0"))
//       .join("")}`
//   );
//
// However, Window.crypto is browser-specific. Since we only use this for randomly picking Troves
// during the search for hints, Math.random() will do fine, too.
//
// This returns a random integer between 0 and Number.MAX_SAFE_INTEGER
const randomInteger = () => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
// Maximum number of trials to perform in a single getApproxHint() call. If the number of trials
// required to get a statistically "good" hint is larger than this, the search for the hint will
// be broken up into multiple getApproxHint() calls.
//
// This should be low enough to work with popular public Ethereum providers like Infura without
// triggering any fair use limits.
const maxNumberOfTrialsAtOnce = 2500;
function* generateTrials(totalNumberOfTrials) {
    assert_1.default(Number.isInteger(totalNumberOfTrials) && totalNumberOfTrials > 0);
    while (totalNumberOfTrials) {
        const numberOfTrials = Math.min(totalNumberOfTrials, maxNumberOfTrialsAtOnce);
        yield numberOfTrials;
        totalNumberOfTrials -= numberOfTrials;
    }
}
/** @internal */
var _RawErrorReason;
(function (_RawErrorReason) {
    _RawErrorReason["TRANSACTION_FAILED"] = "transaction failed";
    _RawErrorReason["TRANSACTION_CANCELLED"] = "cancelled";
    _RawErrorReason["TRANSACTION_REPLACED"] = "replaced";
    _RawErrorReason["TRANSACTION_REPRICED"] = "repriced";
})(_RawErrorReason = exports._RawErrorReason || (exports._RawErrorReason = {}));
const transactionReplacementReasons = [
    _RawErrorReason.TRANSACTION_CANCELLED,
    _RawErrorReason.TRANSACTION_REPLACED,
    _RawErrorReason.TRANSACTION_REPRICED
];
const hasProp = (o, p) => p in o;
const isTransactionFailedError = (error) => hasProp(error, "code") &&
    error.code === logger_1.ErrorCode.CALL_EXCEPTION &&
    hasProp(error, "reason") &&
    error.reason === _RawErrorReason.TRANSACTION_FAILED;
const isTransactionReplacedError = (error) => hasProp(error, "code") &&
    error.code === logger_1.ErrorCode.TRANSACTION_REPLACED &&
    hasProp(error, "reason") &&
    transactionReplacementReasons.includes(error.reason);
/**
 * Thrown when a transaction is cancelled or replaced by a different transaction.
 *
 * @public
 */
class EthersTransactionCancelledError extends Error {
    /** @internal */
    constructor(rawError) {
        assert_1.default(rawError.reason !== _RawErrorReason.TRANSACTION_REPRICED);
        super(`Transaction ${rawError.reason}`);
        this.name = "TransactionCancelledError";
        this.rawReplacementReceipt = rawError.receipt;
        this.rawError = rawError;
    }
}
exports.EthersTransactionCancelledError = EthersTransactionCancelledError;
/**
 * A transaction that has already been sent.
 *
 * @remarks
 * Returned by {@link SendableEthersLiquity} functions.
 *
 * @public
 */
class SentEthersLiquityTransaction {
    /** @internal */
    constructor(rawSentTransaction, connection, parse) {
        this.rawSentTransaction = rawSentTransaction;
        this._connection = connection;
        this._parse = parse;
    }
    _receiptFrom(rawReceipt) {
        return rawReceipt
            ? rawReceipt.status
                ? lib_base_1._successfulReceipt(rawReceipt, this._parse(rawReceipt), () => parseLogs_1.logsToString(rawReceipt, EthersLiquityConnection_1._getContracts(this._connection)))
                : lib_base_1._failedReceipt(rawReceipt)
            : lib_base_1._pendingReceipt;
    }
    async _waitForRawReceipt(confirmations) {
        try {
            return await this.rawSentTransaction.wait(confirmations);
        }
        catch (error) {
            if (error instanceof Error) {
                if (isTransactionFailedError(error)) {
                    return error.receipt;
                }
                if (isTransactionReplacedError(error)) {
                    if (error.cancelled) {
                        throw new EthersTransactionCancelledError(error);
                    }
                    else {
                        return error.receipt;
                    }
                }
            }
            throw error;
        }
    }
    /** {@inheritDoc @liquity/lib-base#SentLiquityTransaction.getReceipt} */
    async getReceipt() {
        return this._receiptFrom(await this._waitForRawReceipt(0));
    }
    /**
     * {@inheritDoc @liquity/lib-base#SentLiquityTransaction.waitForReceipt}
     *
     * @throws
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    async waitForReceipt() {
        const receipt = this._receiptFrom(await this._waitForRawReceipt());
        assert_1.default(receipt.status !== "pending");
        return receipt;
    }
}
exports.SentEthersLiquityTransaction = SentEthersLiquityTransaction;
const normalizeBorrowingOperationOptionalParams = (maxBorrowingRateOrOptionalParams, currentBorrowingRate) => {
    var _a, _b;
    if (maxBorrowingRateOrOptionalParams === undefined) {
        return {
            maxBorrowingRate: (_a = currentBorrowingRate === null || currentBorrowingRate === void 0 ? void 0 : currentBorrowingRate.add(defaultBorrowingRateSlippageTolerance)) !== null && _a !== void 0 ? _a : lib_base_1.Decimal.ZERO,
            borrowingFeeDecayToleranceMinutes: defaultBorrowingFeeDecayToleranceMinutes
        };
    }
    else if (typeof maxBorrowingRateOrOptionalParams === "number" ||
        typeof maxBorrowingRateOrOptionalParams === "string" ||
        maxBorrowingRateOrOptionalParams instanceof lib_base_1.Decimal) {
        return {
            maxBorrowingRate: lib_base_1.Decimal.from(maxBorrowingRateOrOptionalParams),
            borrowingFeeDecayToleranceMinutes: defaultBorrowingFeeDecayToleranceMinutes
        };
    }
    else {
        const { maxBorrowingRate, borrowingFeeDecayToleranceMinutes } = maxBorrowingRateOrOptionalParams;
        return {
            maxBorrowingRate: maxBorrowingRate !== undefined
                ? lib_base_1.Decimal.from(maxBorrowingRate)
                : (_b = currentBorrowingRate === null || currentBorrowingRate === void 0 ? void 0 : currentBorrowingRate.add(defaultBorrowingRateSlippageTolerance)) !== null && _b !== void 0 ? _b : lib_base_1.Decimal.ZERO,
            borrowingFeeDecayToleranceMinutes: borrowingFeeDecayToleranceMinutes !== null && borrowingFeeDecayToleranceMinutes !== void 0 ? borrowingFeeDecayToleranceMinutes : defaultBorrowingFeeDecayToleranceMinutes
        };
    }
};
/**
 * A transaction that has been prepared for sending.
 *
 * @remarks
 * Returned by {@link PopulatableEthersLiquity} functions.
 *
 * @public
 */
class PopulatedEthersLiquityTransaction {
    /** @internal */
    constructor(rawPopulatedTransaction, connection, parse, gasHeadroom) {
        this.rawPopulatedTransaction = rawPopulatedTransaction;
        this._connection = connection;
        this._parse = parse;
        if (gasHeadroom !== undefined) {
            this.gasHeadroom = gasHeadroom;
        }
    }
    /** {@inheritDoc @liquity/lib-base#PopulatedLiquityTransaction.send} */
    async send() {
        return new SentEthersLiquityTransaction(await EthersLiquityConnection_1._requireSigner(this._connection).sendTransaction(this.rawPopulatedTransaction), this._connection, this._parse);
    }
}
exports.PopulatedEthersLiquityTransaction = PopulatedEthersLiquityTransaction;
/**
 * {@inheritDoc @liquity/lib-base#PopulatedRedemption}
 *
 * @public
 */
class PopulatedEthersRedemption extends PopulatedEthersLiquityTransaction {
    /** @internal */
    constructor(rawPopulatedTransaction, connection, attemptedLUSDAmount, redeemableLUSDAmount, increaseAmountByMinimumNetDebt) {
        const { troveManager } = EthersLiquityConnection_1._getContracts(connection);
        super(rawPopulatedTransaction, connection, ({ logs }) => troveManager
            .extractEvents(logs, "Redemption")
            .map(({ args: { _ETHSent, _ETHFee, _actualLUSDAmount, _attemptedLUSDAmount } }) => ({
            attemptedLUSDAmount: _utils_1.decimalify(_attemptedLUSDAmount),
            actualLUSDAmount: _utils_1.decimalify(_actualLUSDAmount),
            collateralTaken: _utils_1.decimalify(_ETHSent),
            fee: _utils_1.decimalify(_ETHFee)
        }))[0]);
        this.attemptedLUSDAmount = attemptedLUSDAmount;
        this.redeemableLUSDAmount = redeemableLUSDAmount;
        this.isTruncated = redeemableLUSDAmount.lt(attemptedLUSDAmount);
        this._increaseAmountByMinimumNetDebt = increaseAmountByMinimumNetDebt;
    }
    /** {@inheritDoc @liquity/lib-base#PopulatedRedemption.increaseAmountByMinimumNetDebt} */
    increaseAmountByMinimumNetDebt(maxRedemptionRate) {
        if (!this._increaseAmountByMinimumNetDebt) {
            throw new Error("PopulatedEthersRedemption: increaseAmountByMinimumNetDebt() can " +
                "only be called when amount is truncated");
        }
        return this._increaseAmountByMinimumNetDebt(maxRedemptionRate);
    }
}
exports.PopulatedEthersRedemption = PopulatedEthersRedemption;
/**
 * Ethers-based implementation of {@link @liquity/lib-base#PopulatableLiquity}.
 *
 * @public
 */
class PopulatableEthersLiquity {
    constructor(readable) {
        this._readable = readable;
    }
    _wrapSimpleTransaction(rawPopulatedTransaction) {
        return new PopulatedEthersLiquityTransaction(rawPopulatedTransaction, this._readable.connection, noDetails);
    }
    _wrapTroveChangeWithFees(params, rawPopulatedTransaction, gasHeadroom) {
        const { borrowerOperations } = EthersLiquityConnection_1._getContracts(this._readable.connection);
        return new PopulatedEthersLiquityTransaction(rawPopulatedTransaction, this._readable.connection, ({ logs }) => {
            const [newTrove] = borrowerOperations
                .extractEvents(logs, "TroveUpdated")
                .map(({ args: { _coll, _debt } }) => new lib_base_1.Trove(_utils_1.decimalify(_coll), _utils_1.decimalify(_debt)));
            const [fee] = borrowerOperations
                .extractEvents(logs, "LUSDBorrowingFeePaid")
                .map(({ args: { _LUSDFee } }) => _utils_1.decimalify(_LUSDFee));
            return {
                params,
                newTrove,
                fee
            };
        }, gasHeadroom);
    }
    async _wrapTroveClosure(rawPopulatedTransaction) {
        const { activePool, lusdToken } = EthersLiquityConnection_1._getContracts(this._readable.connection);
        return new PopulatedEthersLiquityTransaction(rawPopulatedTransaction, this._readable.connection, ({ logs, from: userAddress }) => {
            const [repayLUSD] = lusdToken
                .extractEvents(logs, "Transfer")
                .filter(({ args: { from, to } }) => from === userAddress && to === constants_1.AddressZero)
                .map(({ args: { value } }) => _utils_1.decimalify(value));
            const [withdrawCollateral] = activePool
                .extractEvents(logs, "EtherSent")
                .filter(({ args: { _to } }) => _to === userAddress)
                .map(({ args: { _amount } }) => _utils_1.decimalify(_amount));
            return {
                params: repayLUSD.nonZero ? { withdrawCollateral, repayLUSD } : { withdrawCollateral }
            };
        });
    }
    _wrapLiquidation(rawPopulatedTransaction) {
        const { troveManager } = EthersLiquityConnection_1._getContracts(this._readable.connection);
        return new PopulatedEthersLiquityTransaction(rawPopulatedTransaction, this._readable.connection, ({ logs }) => {
            const liquidatedAddresses = troveManager
                .extractEvents(logs, "TroveLiquidated")
                .map(({ args: { _borrower } }) => _borrower);
            const [totals] = troveManager
                .extractEvents(logs, "Liquidation")
                .map(({ args: { _LUSDGasCompensation, _collGasCompensation, _liquidatedColl, _liquidatedDebt } }) => ({
                collateralGasCompensation: _utils_1.decimalify(_collGasCompensation),
                lusdGasCompensation: _utils_1.decimalify(_LUSDGasCompensation),
                totalLiquidated: new lib_base_1.Trove(_utils_1.decimalify(_liquidatedColl), _utils_1.decimalify(_liquidatedDebt))
            }));
            return {
                liquidatedAddresses,
                ...totals
            };
        });
    }
    _extractStabilityPoolGainsWithdrawalDetails(logs) {
        const { stabilityPool } = EthersLiquityConnection_1._getContracts(this._readable.connection);
        const [newLUSDDeposit] = stabilityPool
            .extractEvents(logs, "UserDepositChanged")
            .map(({ args: { _newDeposit } }) => _utils_1.decimalify(_newDeposit));
        const [[collateralGain, lusdLoss]] = stabilityPool
            .extractEvents(logs, "ETHGainWithdrawn")
            .map(({ args: { _ETH, _LUSDLoss } }) => [_utils_1.decimalify(_ETH), _utils_1.decimalify(_LUSDLoss)]);
        const [lqtyReward] = stabilityPool
            .extractEvents(logs, "LQTYPaidToDepositor")
            .map(({ args: { _LQTY } }) => _utils_1.decimalify(_LQTY));
        return {
            lusdLoss,
            newLUSDDeposit,
            collateralGain,
            lqtyReward
        };
    }
    _wrapStabilityPoolGainsWithdrawal(rawPopulatedTransaction) {
        return new PopulatedEthersLiquityTransaction(rawPopulatedTransaction, this._readable.connection, ({ logs }) => this._extractStabilityPoolGainsWithdrawalDetails(logs));
    }
    _wrapStabilityDepositTopup(change, rawPopulatedTransaction) {
        return new PopulatedEthersLiquityTransaction(rawPopulatedTransaction, this._readable.connection, ({ logs }) => ({
            ...this._extractStabilityPoolGainsWithdrawalDetails(logs),
            change
        }));
    }
    async _wrapStabilityDepositWithdrawal(rawPopulatedTransaction) {
        const { stabilityPool, lusdToken } = EthersLiquityConnection_1._getContracts(this._readable.connection);
        return new PopulatedEthersLiquityTransaction(rawPopulatedTransaction, this._readable.connection, ({ logs, from: userAddress }) => {
            const gainsWithdrawalDetails = this._extractStabilityPoolGainsWithdrawalDetails(logs);
            const [withdrawLUSD] = lusdToken
                .extractEvents(logs, "Transfer")
                .filter(({ args: { from, to } }) => from === stabilityPool.address && to === userAddress)
                .map(({ args: { value } }) => _utils_1.decimalify(value));
            return {
                ...gainsWithdrawalDetails,
                change: { withdrawLUSD, withdrawAllLUSD: gainsWithdrawalDetails.newLUSDDeposit.isZero }
            };
        });
    }
    _wrapCollateralGainTransfer(rawPopulatedTransaction) {
        const { borrowerOperations } = EthersLiquityConnection_1._getContracts(this._readable.connection);
        return new PopulatedEthersLiquityTransaction(rawPopulatedTransaction, this._readable.connection, ({ logs }) => {
            const [newTrove] = borrowerOperations
                .extractEvents(logs, "TroveUpdated")
                .map(({ args: { _coll, _debt } }) => new lib_base_1.Trove(_utils_1.decimalify(_coll), _utils_1.decimalify(_debt)));
            return {
                ...this._extractStabilityPoolGainsWithdrawalDetails(logs),
                newTrove
            };
        });
    }
    async _findHintsForNominalCollateralRatio(nominalCollateralRatio, ownAddress) {
        const { sortedTroves, hintHelpers } = EthersLiquityConnection_1._getContracts(this._readable.connection);
        const numberOfTroves = await this._readable.getNumberOfTroves();
        if (!numberOfTroves) {
            return [constants_1.AddressZero, constants_1.AddressZero];
        }
        if (nominalCollateralRatio.infinite) {
            return [constants_1.AddressZero, await sortedTroves.getFirst()];
        }
        const totalNumberOfTrials = Math.ceil(10 * Math.sqrt(numberOfTroves));
        const [firstTrials, ...restOfTrials] = generateTrials(totalNumberOfTrials);
        const collectApproxHint = ({ latestRandomSeed, results }, numberOfTrials) => hintHelpers
            .getApproxHint(nominalCollateralRatio.hex, numberOfTrials, latestRandomSeed)
            .then(({ latestRandomSeed, ...result }) => ({
            latestRandomSeed,
            results: [...results, result]
        }));
        const { results } = await restOfTrials.reduce((p, numberOfTrials) => p.then(state => collectApproxHint(state, numberOfTrials)), collectApproxHint({ latestRandomSeed: randomInteger(), results: [] }, firstTrials));
        const { hintAddress } = results.reduce((a, b) => (a.diff.lt(b.diff) ? a : b));
        let [prev, next] = await sortedTroves.findInsertPosition(nominalCollateralRatio.hex, hintAddress, hintAddress);
        if (ownAddress) {
            // In the case of reinsertion, the address of the Trove being reinserted is not a usable hint,
            // because it is deleted from the list before the reinsertion.
            // "Jump over" the Trove to get the proper hint.
            if (prev === ownAddress) {
                prev = await sortedTroves.getPrev(prev);
            }
            else if (next === ownAddress) {
                next = await sortedTroves.getNext(next);
            }
        }
        // Don't use `address(0)` as hint as it can result in huge gas cost.
        // (See https://github.com/liquity/dev/issues/600).
        if (prev === constants_1.AddressZero) {
            prev = next;
        }
        else if (next === constants_1.AddressZero) {
            next = prev;
        }
        return [prev, next];
    }
    async _findHints(trove, ownAddress) {
        if (trove instanceof lib_base_1.TroveWithPendingRedistribution) {
            throw new Error("Rewards must be applied to this Trove");
        }
        return this._findHintsForNominalCollateralRatio(trove._nominalCollateralRatio, ownAddress);
    }
    async _findRedemptionHints(amount) {
        const { hintHelpers } = EthersLiquityConnection_1._getContracts(this._readable.connection);
        const price = await this._readable.getPrice();
        const { firstRedemptionHint, partialRedemptionHintNICR, truncatedLUSDamount } = await hintHelpers.getRedemptionHints(amount.hex, price.hex, exports._redeemMaxIterations);
        const [partialRedemptionUpperHint, partialRedemptionLowerHint] = partialRedemptionHintNICR.isZero()
            ? [constants_1.AddressZero, constants_1.AddressZero]
            : await this._findHintsForNominalCollateralRatio(_utils_1.decimalify(partialRedemptionHintNICR)
            // XXX: if we knew the partially redeemed Trove's address, we'd pass it here
            );
        return [
            _utils_1.decimalify(truncatedLUSDamount),
            firstRedemptionHint,
            partialRedemptionUpperHint,
            partialRedemptionLowerHint,
            partialRedemptionHintNICR
        ];
    }
    /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.openTrove} */
    async openTrove(params, maxBorrowingRateOrOptionalParams, overrides) {
        const { borrowerOperations } = EthersLiquityConnection_1._getContracts(this._readable.connection);
        const normalizedParams = lib_base_1._normalizeTroveCreation(params);
        const { depositCollateral, borrowLUSD } = normalizedParams;
        const [fees, blockTimestamp, total, price] = await Promise.all([
            this._readable._getFeesFactory(),
            this._readable._getBlockTimestamp(),
            this._readable.getTotal(),
            this._readable.getPrice()
        ]);
        const recoveryMode = total.collateralRatioIsBelowCritical(price);
        const decayBorrowingRate = (seconds) => fees(blockTimestamp + seconds, recoveryMode).borrowingRate();
        const currentBorrowingRate = decayBorrowingRate(0);
        const newTrove = lib_base_1.Trove.create(normalizedParams, currentBorrowingRate);
        const hints = await this._findHints(newTrove);
        const { maxBorrowingRate, borrowingFeeDecayToleranceMinutes } = normalizeBorrowingOperationOptionalParams(maxBorrowingRateOrOptionalParams, currentBorrowingRate);
        const txParams = (borrowLUSD) => [
            maxBorrowingRate.hex,
            borrowLUSD.hex,
            ...hints,
            { value: depositCollateral.hex, ...overrides }
        ];
        let gasHeadroom;
        if ((overrides === null || overrides === void 0 ? void 0 : overrides.gasLimit) === undefined) {
            const decayedBorrowingRate = decayBorrowingRate(60 * borrowingFeeDecayToleranceMinutes);
            const decayedTrove = lib_base_1.Trove.create(normalizedParams, decayedBorrowingRate);
            const { borrowLUSD: borrowLUSDSimulatingDecay } = lib_base_1.Trove.recreate(decayedTrove, currentBorrowingRate);
            if (decayedTrove.debt.lt(lib_base_1.LUSD_MINIMUM_DEBT)) {
                throw new Error(`Trove's debt might fall below ${lib_base_1.LUSD_MINIMUM_DEBT} ` +
                    `within ${borrowingFeeDecayToleranceMinutes} minutes`);
            }
            const [gasNow, gasLater] = await Promise.all([
                borrowerOperations.estimateGas.openTrove(...txParams(borrowLUSD)),
                borrowerOperations.estimateGas.openTrove(...txParams(borrowLUSDSimulatingDecay))
            ]);
            const gasLimit = addGasForBaseRateUpdate(borrowingFeeDecayToleranceMinutes)(bigNumberMax(addGasForPotentialListTraversal(gasNow), gasLater));
            gasHeadroom = gasLimit.sub(gasNow).toNumber();
            overrides = { ...overrides, gasLimit };
        }
        return this._wrapTroveChangeWithFees(normalizedParams, await borrowerOperations.populateTransaction.openTrove(...txParams(borrowLUSD)), gasHeadroom);
    }
    /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.closeTrove} */
    async closeTrove(overrides) {
        const { borrowerOperations } = EthersLiquityConnection_1._getContracts(this._readable.connection);
        return this._wrapTroveClosure(await borrowerOperations.estimateAndPopulate.closeTrove({ ...overrides }, id));
    }
    /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.depositCollateral} */
    depositCollateral(amount, overrides) {
        return this.adjustTrove({ depositCollateral: amount }, undefined, overrides);
    }
    /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.withdrawCollateral} */
    withdrawCollateral(amount, overrides) {
        return this.adjustTrove({ withdrawCollateral: amount }, undefined, overrides);
    }
    /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.borrowLUSD} */
    borrowLUSD(amount, maxBorrowingRate, overrides) {
        return this.adjustTrove({ borrowLUSD: amount }, maxBorrowingRate, overrides);
    }
    /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.repayLUSD} */
    repayLUSD(amount, overrides) {
        return this.adjustTrove({ repayLUSD: amount }, undefined, overrides);
    }
    /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.adjustTrove} */
    async adjustTrove(params, maxBorrowingRateOrOptionalParams, overrides) {
        const address = EthersLiquityConnection_1._requireAddress(this._readable.connection, overrides);
        const { borrowerOperations } = EthersLiquityConnection_1._getContracts(this._readable.connection);
        const normalizedParams = lib_base_1._normalizeTroveAdjustment(params);
        const { depositCollateral, withdrawCollateral, borrowLUSD, repayLUSD } = normalizedParams;
        const [trove, feeVars] = await Promise.all([
            this._readable.getTrove(address),
            borrowLUSD &&
                _utils_1.promiseAllValues({
                    fees: this._readable._getFeesFactory(),
                    blockTimestamp: this._readable._getBlockTimestamp(),
                    total: this._readable.getTotal(),
                    price: this._readable.getPrice()
                })
        ]);
        const decayBorrowingRate = (seconds) => feeVars === null || feeVars === void 0 ? void 0 : feeVars.fees(feeVars.blockTimestamp + seconds, feeVars.total.collateralRatioIsBelowCritical(feeVars.price)).borrowingRate();
        const currentBorrowingRate = decayBorrowingRate(0);
        const adjustedTrove = trove.adjust(normalizedParams, currentBorrowingRate);
        const hints = await this._findHints(adjustedTrove, address);
        const { maxBorrowingRate, borrowingFeeDecayToleranceMinutes } = normalizeBorrowingOperationOptionalParams(maxBorrowingRateOrOptionalParams, currentBorrowingRate);
        const txParams = (borrowLUSD) => {
            var _a;
            return [
                maxBorrowingRate.hex,
                (withdrawCollateral !== null && withdrawCollateral !== void 0 ? withdrawCollateral : lib_base_1.Decimal.ZERO).hex,
                ((_a = borrowLUSD !== null && borrowLUSD !== void 0 ? borrowLUSD : repayLUSD) !== null && _a !== void 0 ? _a : lib_base_1.Decimal.ZERO).hex,
                !!borrowLUSD,
                ...hints,
                { value: depositCollateral === null || depositCollateral === void 0 ? void 0 : depositCollateral.hex, ...overrides }
            ];
        };
        let gasHeadroom;
        if ((overrides === null || overrides === void 0 ? void 0 : overrides.gasLimit) === undefined) {
            const decayedBorrowingRate = decayBorrowingRate(60 * borrowingFeeDecayToleranceMinutes);
            const decayedTrove = trove.adjust(normalizedParams, decayedBorrowingRate);
            const { borrowLUSD: borrowLUSDSimulatingDecay } = trove.adjustTo(decayedTrove, currentBorrowingRate);
            if (decayedTrove.debt.lt(lib_base_1.LUSD_MINIMUM_DEBT)) {
                throw new Error(`Trove's debt might fall below ${lib_base_1.LUSD_MINIMUM_DEBT} ` +
                    `within ${borrowingFeeDecayToleranceMinutes} minutes`);
            }
            const [gasNow, gasLater] = await Promise.all([
                borrowerOperations.estimateGas.adjustTrove(...txParams(borrowLUSD)),
                borrowLUSD &&
                    borrowerOperations.estimateGas.adjustTrove(...txParams(borrowLUSDSimulatingDecay))
            ]);
            let gasLimit = bigNumberMax(addGasForPotentialListTraversal(gasNow), gasLater);
            if (borrowLUSD) {
                gasLimit = addGasForBaseRateUpdate(borrowingFeeDecayToleranceMinutes)(gasLimit);
            }
            gasHeadroom = gasLimit.sub(gasNow).toNumber();
            overrides = { ...overrides, gasLimit };
        }
        return this._wrapTroveChangeWithFees(normalizedParams, await borrowerOperations.populateTransaction.adjustTrove(...txParams(borrowLUSD)), gasHeadroom);
    }
    /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.claimCollateralSurplus} */
    async claimCollateralSurplus(overrides) {
        const { borrowerOperations } = EthersLiquityConnection_1._getContracts(this._readable.connection);
        return this._wrapSimpleTransaction(await borrowerOperations.estimateAndPopulate.claimCollateral({ ...overrides }, id));
    }
    /** @internal */
    async setPrice(price, overrides) {
        const { priceFeed } = EthersLiquityConnection_1._getContracts(this._readable.connection);
        if (!contracts_1._priceFeedIsTestnet(priceFeed)) {
            throw new Error("setPrice() unavailable on this deployment of Liquity");
        }
        return this._wrapSimpleTransaction(await priceFeed.estimateAndPopulate.setPrice({ ...overrides }, id, lib_base_1.Decimal.from(price).hex));
    }
    /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.liquidate} */
    async liquidate(address, overrides) {
        const { troveManager } = EthersLiquityConnection_1._getContracts(this._readable.connection);
        if (Array.isArray(address)) {
            return this._wrapLiquidation(await troveManager.estimateAndPopulate.batchLiquidateTroves({ ...overrides }, addGasForLQTYIssuance, address));
        }
        else {
            return this._wrapLiquidation(await troveManager.estimateAndPopulate.liquidate({ ...overrides }, addGasForLQTYIssuance, address));
        }
    }
    /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.liquidateUpTo} */
    async liquidateUpTo(maximumNumberOfTrovesToLiquidate, overrides) {
        const { troveManager } = EthersLiquityConnection_1._getContracts(this._readable.connection);
        return this._wrapLiquidation(await troveManager.estimateAndPopulate.liquidateTroves({ ...overrides }, addGasForLQTYIssuance, maximumNumberOfTrovesToLiquidate));
    }
    /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.depositLUSDInStabilityPool} */
    async depositLUSDInStabilityPool(amount, frontendTag, overrides) {
        var _a;
        const { stabilityPool } = EthersLiquityConnection_1._getContracts(this._readable.connection);
        const depositLUSD = lib_base_1.Decimal.from(amount);
        return this._wrapStabilityDepositTopup({ depositLUSD }, await stabilityPool.estimateAndPopulate.provideToSP({ ...overrides }, addGasForLQTYIssuance, depositLUSD.hex, (_a = frontendTag !== null && frontendTag !== void 0 ? frontendTag : this._readable.connection.frontendTag) !== null && _a !== void 0 ? _a : constants_1.AddressZero));
    }
    /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.withdrawLUSDFromStabilityPool} */
    async withdrawLUSDFromStabilityPool(amount, overrides) {
        const { stabilityPool } = EthersLiquityConnection_1._getContracts(this._readable.connection);
        return this._wrapStabilityDepositWithdrawal(await stabilityPool.estimateAndPopulate.withdrawFromSP({ ...overrides }, addGasForLQTYIssuance, lib_base_1.Decimal.from(amount).hex));
    }
    /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.withdrawGainsFromStabilityPool} */
    async withdrawGainsFromStabilityPool(overrides) {
        const { stabilityPool } = EthersLiquityConnection_1._getContracts(this._readable.connection);
        return this._wrapStabilityPoolGainsWithdrawal(await stabilityPool.estimateAndPopulate.withdrawFromSP({ ...overrides }, addGasForLQTYIssuance, lib_base_1.Decimal.ZERO.hex));
    }
    /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.transferCollateralGainToTrove} */
    async transferCollateralGainToTrove(overrides) {
        const address = EthersLiquityConnection_1._requireAddress(this._readable.connection, overrides);
        const { stabilityPool } = EthersLiquityConnection_1._getContracts(this._readable.connection);
        const [initialTrove, stabilityDeposit] = await Promise.all([
            this._readable.getTrove(address),
            this._readable.getStabilityDeposit(address)
        ]);
        const finalTrove = initialTrove.addCollateral(stabilityDeposit.collateralGain);
        return this._wrapCollateralGainTransfer(await stabilityPool.estimateAndPopulate.withdrawETHGainToTrove({ ...overrides }, compose(addGasForPotentialListTraversal, addGasForLQTYIssuance), ...(await this._findHints(finalTrove, address))));
    }
    /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.sendLUSD} */
    async sendLUSD(toAddress, amount, overrides) {
        const { lusdToken } = EthersLiquityConnection_1._getContracts(this._readable.connection);
        return this._wrapSimpleTransaction(await lusdToken.estimateAndPopulate.transfer({ ...overrides }, id, toAddress, lib_base_1.Decimal.from(amount).hex));
    }
    /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.sendLQTY} */
    async sendLQTY(toAddress, amount, overrides) {
        const { lqtyToken } = EthersLiquityConnection_1._getContracts(this._readable.connection);
        return this._wrapSimpleTransaction(await lqtyToken.estimateAndPopulate.transfer({ ...overrides }, id, toAddress, lib_base_1.Decimal.from(amount).hex));
    }
    /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.redeemLUSD} */
    async redeemLUSD(amount, maxRedemptionRate, overrides) {
        const { troveManager } = EthersLiquityConnection_1._getContracts(this._readable.connection);
        const attemptedLUSDAmount = lib_base_1.Decimal.from(amount);
        const [fees, total, [truncatedAmount, firstRedemptionHint, ...partialHints]] = await Promise.all([
            this._readable.getFees(),
            this._readable.getTotal(),
            this._findRedemptionHints(attemptedLUSDAmount)
        ]);
        if (truncatedAmount.isZero) {
            throw new Error(`redeemLUSD: amount too low to redeem (try at least ${lib_base_1.LUSD_MINIMUM_NET_DEBT})`);
        }
        const defaultMaxRedemptionRate = (amount) => lib_base_1.Decimal.min(fees.redemptionRate(amount.div(total.debt)).add(defaultRedemptionRateSlippageTolerance), lib_base_1.Decimal.ONE);
        const populateRedemption = async (attemptedLUSDAmount, maxRedemptionRate, truncatedAmount = attemptedLUSDAmount, partialHints = [constants_1.AddressZero, constants_1.AddressZero, 0]) => {
            const maxRedemptionRateOrDefault = maxRedemptionRate !== undefined
                ? lib_base_1.Decimal.from(maxRedemptionRate)
                : defaultMaxRedemptionRate(truncatedAmount);
            return new PopulatedEthersRedemption(await troveManager.estimateAndPopulate.redeemCollateral({ ...overrides }, addGasForBaseRateUpdate(), truncatedAmount.hex, firstRedemptionHint, ...partialHints, exports._redeemMaxIterations, maxRedemptionRateOrDefault.hex), this._readable.connection, attemptedLUSDAmount, truncatedAmount, truncatedAmount.lt(attemptedLUSDAmount)
                ? newMaxRedemptionRate => populateRedemption(truncatedAmount.add(lib_base_1.LUSD_MINIMUM_NET_DEBT), newMaxRedemptionRate !== null && newMaxRedemptionRate !== void 0 ? newMaxRedemptionRate : maxRedemptionRate)
                : undefined);
        };
        return populateRedemption(attemptedLUSDAmount, maxRedemptionRate, truncatedAmount, partialHints);
    }
    /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.stakeLQTY} */
    async stakeLQTY(amount, overrides) {
        const { lqtyStaking } = EthersLiquityConnection_1._getContracts(this._readable.connection);
        return this._wrapSimpleTransaction(await lqtyStaking.estimateAndPopulate.stake({ ...overrides }, id, lib_base_1.Decimal.from(amount).hex));
    }
    /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.unstakeLQTY} */
    async unstakeLQTY(amount, overrides) {
        const { lqtyStaking } = EthersLiquityConnection_1._getContracts(this._readable.connection);
        return this._wrapSimpleTransaction(await lqtyStaking.estimateAndPopulate.unstake({ ...overrides }, id, lib_base_1.Decimal.from(amount).hex));
    }
    /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.withdrawGainsFromStaking} */
    withdrawGainsFromStaking(overrides) {
        return this.unstakeLQTY(lib_base_1.Decimal.ZERO, overrides);
    }
    /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.registerFrontend} */
    async registerFrontend(kickbackRate, overrides) {
        const { stabilityPool } = EthersLiquityConnection_1._getContracts(this._readable.connection);
        return this._wrapSimpleTransaction(await stabilityPool.estimateAndPopulate.registerFrontEnd({ ...overrides }, id, lib_base_1.Decimal.from(kickbackRate).hex));
    }
    /** @internal */
    async _mintUniToken(amount, address, overrides) {
        address !== null && address !== void 0 ? address : (address = EthersLiquityConnection_1._requireAddress(this._readable.connection, overrides));
        const { uniToken } = EthersLiquityConnection_1._getContracts(this._readable.connection);
        if (!contracts_1._uniTokenIsMock(uniToken)) {
            throw new Error("_mintUniToken() unavailable on this deployment of Liquity");
        }
        return this._wrapSimpleTransaction(await uniToken.estimateAndPopulate.mint({ ...overrides }, id, address, lib_base_1.Decimal.from(amount).hex));
    }
    /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.approveUniTokens} */
    async approveUniTokens(allowance, overrides) {
        const { uniToken, unipool } = EthersLiquityConnection_1._getContracts(this._readable.connection);
        return this._wrapSimpleTransaction(await uniToken.estimateAndPopulate.approve({ ...overrides }, id, unipool.address, lib_base_1.Decimal.from(allowance !== null && allowance !== void 0 ? allowance : lib_base_1.Decimal.INFINITY).hex));
    }
    /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.stakeUniTokens} */
    async stakeUniTokens(amount, overrides) {
        const { unipool } = EthersLiquityConnection_1._getContracts(this._readable.connection);
        return this._wrapSimpleTransaction(await unipool.estimateAndPopulate.stake({ ...overrides }, addGasForUnipoolRewardUpdate, lib_base_1.Decimal.from(amount).hex));
    }
    /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.unstakeUniTokens} */
    async unstakeUniTokens(amount, overrides) {
        const { unipool } = EthersLiquityConnection_1._getContracts(this._readable.connection);
        return this._wrapSimpleTransaction(await unipool.estimateAndPopulate.withdraw({ ...overrides }, addGasForUnipoolRewardUpdate, lib_base_1.Decimal.from(amount).hex));
    }
    /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.withdrawLQTYRewardFromLiquidityMining} */
    async withdrawLQTYRewardFromLiquidityMining(overrides) {
        const { unipool } = EthersLiquityConnection_1._getContracts(this._readable.connection);
        return this._wrapSimpleTransaction(await unipool.estimateAndPopulate.claimReward({ ...overrides }, addGasForUnipoolRewardUpdate));
    }
    /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.exitLiquidityMining} */
    async exitLiquidityMining(overrides) {
        const { unipool } = EthersLiquityConnection_1._getContracts(this._readable.connection);
        return this._wrapSimpleTransaction(await unipool.estimateAndPopulate.withdrawAndClaim({ ...overrides }, addGasForUnipoolRewardUpdate));
    }
}
exports.PopulatableEthersLiquity = PopulatableEthersLiquity;
//# sourceMappingURL=PopulatableEthersLiquity.js.map