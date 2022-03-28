import { ErrorCode } from "@ethersproject/logger";
import { CollateralGainTransferDetails, Decimal, Decimalish, LiquidationDetails, LiquityReceipt, MinedReceipt, PopulatableLiquity, PopulatedLiquityTransaction, PopulatedRedemption, RedemptionDetails, SentLiquityTransaction, StabilityDepositChangeDetails, StabilityPoolGainsWithdrawalDetails, Trove, TroveAdjustmentDetails, TroveAdjustmentParams, TroveClosureDetails, TroveCreationDetails, TroveCreationParams } from "@liquity/lib-base";
import { EthersPopulatedTransaction, EthersTransactionOverrides, EthersTransactionReceipt, EthersTransactionResponse } from "./types";
import { EthersLiquityConnection } from "./EthersLiquityConnection";
import { ReadableEthersLiquity } from "./ReadableEthersLiquity";
/** @internal */
export declare const _redeemMaxIterations = 70;
/** @internal */
export declare enum _RawErrorReason {
    TRANSACTION_FAILED = "transaction failed",
    TRANSACTION_CANCELLED = "cancelled",
    TRANSACTION_REPLACED = "replaced",
    TRANSACTION_REPRICED = "repriced"
}
/** @internal */
export interface _RawTransactionReplacedError extends Error {
    code: ErrorCode.TRANSACTION_REPLACED;
    reason: _RawErrorReason.TRANSACTION_CANCELLED | _RawErrorReason.TRANSACTION_REPLACED | _RawErrorReason.TRANSACTION_REPRICED;
    cancelled: boolean;
    hash: string;
    replacement: EthersTransactionResponse;
    receipt: EthersTransactionReceipt;
}
/**
 * Thrown when a transaction is cancelled or replaced by a different transaction.
 *
 * @public
 */
export declare class EthersTransactionCancelledError extends Error {
    readonly rawReplacementReceipt: EthersTransactionReceipt;
    readonly rawError: Error;
    /** @internal */
    constructor(rawError: _RawTransactionReplacedError);
}
/**
 * A transaction that has already been sent.
 *
 * @remarks
 * Returned by {@link SendableEthersLiquity} functions.
 *
 * @public
 */
export declare class SentEthersLiquityTransaction<T = unknown> implements SentLiquityTransaction<EthersTransactionResponse, LiquityReceipt<EthersTransactionReceipt, T>> {
    /** Ethers' representation of a sent transaction. */
    readonly rawSentTransaction: EthersTransactionResponse;
    private readonly _connection;
    private readonly _parse;
    /** @internal */
    constructor(rawSentTransaction: EthersTransactionResponse, connection: EthersLiquityConnection, parse: (rawReceipt: EthersTransactionReceipt) => T);
    private _receiptFrom;
    private _waitForRawReceipt;
    /** {@inheritDoc @liquity/lib-base#SentLiquityTransaction.getReceipt} */
    getReceipt(): Promise<LiquityReceipt<EthersTransactionReceipt, T>>;
    /**
     * {@inheritDoc @liquity/lib-base#SentLiquityTransaction.waitForReceipt}
     *
     * @throws
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    waitForReceipt(): Promise<MinedReceipt<EthersTransactionReceipt, T>>;
}
/**
 * Optional parameters of a transaction that borrows LUSD.
 *
 * @public
 */
export interface BorrowingOperationOptionalParams {
    /**
     * Maximum acceptable {@link @liquity/lib-base#Fees.borrowingRate | borrowing rate}
     * (default: current borrowing rate plus 0.5%).
     */
    maxBorrowingRate?: Decimalish;
    /**
     * Control the amount of extra gas included attached to the transaction.
     *
     * @remarks
     * Transactions that borrow LUSD must pay a variable borrowing fee, which is added to the Trove's
     * debt. This fee increases whenever a redemption occurs, and otherwise decays exponentially.
     * Due to this decay, a Trove's collateral ratio can end up being higher than initially calculated
     * if the transaction is pending for a long time. When this happens, the backend has to iterate
     * over the sorted list of Troves to find a new position for the Trove, which costs extra gas.
     *
     * The SDK can estimate how much the gas costs of the transaction may increase due to this decay,
     * and can include additional gas to ensure that it will still succeed, even if it ends up pending
     * for a relatively long time. This parameter specifies the length of time that should be covered
     * by the extra gas.
     *
     * Default: 10 minutes.
     */
    borrowingFeeDecayToleranceMinutes?: number;
}
/**
 * A transaction that has been prepared for sending.
 *
 * @remarks
 * Returned by {@link PopulatableEthersLiquity} functions.
 *
 * @public
 */
export declare class PopulatedEthersLiquityTransaction<T = unknown> implements PopulatedLiquityTransaction<EthersPopulatedTransaction, SentEthersLiquityTransaction<T>> {
    /** Unsigned transaction object populated by Ethers. */
    readonly rawPopulatedTransaction: EthersPopulatedTransaction;
    /**
     * Extra gas added to the transaction's `gasLimit` on top of the estimated minimum requirement.
     *
     * @remarks
     * Gas estimation is based on blockchain state at the latest block. However, most transactions
     * stay in pending state for several blocks before being included in a block. This may increase
     * the actual gas requirements of certain Liquity transactions by the time they are eventually
     * mined, therefore the Liquity SDK increases these transactions' `gasLimit` by default (unless
     * `gasLimit` is {@link EthersTransactionOverrides | overridden}).
     *
     * Note: even though the SDK includes gas headroom for many transaction types, currently this
     * property is only implemented for {@link PopulatableEthersLiquity.openTrove | openTrove()},
     * {@link PopulatableEthersLiquity.adjustTrove | adjustTrove()} and its aliases.
     */
    readonly gasHeadroom?: number;
    private readonly _connection;
    private readonly _parse;
    /** @internal */
    constructor(rawPopulatedTransaction: EthersPopulatedTransaction, connection: EthersLiquityConnection, parse: (rawReceipt: EthersTransactionReceipt) => T, gasHeadroom?: number);
    /** {@inheritDoc @liquity/lib-base#PopulatedLiquityTransaction.send} */
    send(): Promise<SentEthersLiquityTransaction<T>>;
}
/**
 * {@inheritDoc @liquity/lib-base#PopulatedRedemption}
 *
 * @public
 */
export declare class PopulatedEthersRedemption extends PopulatedEthersLiquityTransaction<RedemptionDetails> implements PopulatedRedemption<EthersPopulatedTransaction, EthersTransactionResponse, EthersTransactionReceipt> {
    /** {@inheritDoc @liquity/lib-base#PopulatedRedemption.attemptedLUSDAmount} */
    readonly attemptedLUSDAmount: Decimal;
    /** {@inheritDoc @liquity/lib-base#PopulatedRedemption.redeemableLUSDAmount} */
    readonly redeemableLUSDAmount: Decimal;
    /** {@inheritDoc @liquity/lib-base#PopulatedRedemption.isTruncated} */
    readonly isTruncated: boolean;
    private readonly _increaseAmountByMinimumNetDebt?;
    /** @internal */
    constructor(rawPopulatedTransaction: EthersPopulatedTransaction, connection: EthersLiquityConnection, attemptedLUSDAmount: Decimal, redeemableLUSDAmount: Decimal, increaseAmountByMinimumNetDebt?: (maxRedemptionRate?: Decimalish) => Promise<PopulatedEthersRedemption>);
    /** {@inheritDoc @liquity/lib-base#PopulatedRedemption.increaseAmountByMinimumNetDebt} */
    increaseAmountByMinimumNetDebt(maxRedemptionRate?: Decimalish): Promise<PopulatedEthersRedemption>;
}
/** @internal */
export interface _TroveChangeWithFees<T> {
    params: T;
    newTrove: Trove;
    fee: Decimal;
}
/**
 * Ethers-based implementation of {@link @liquity/lib-base#PopulatableLiquity}.
 *
 * @public
 */
export declare class PopulatableEthersLiquity implements PopulatableLiquity<EthersTransactionReceipt, EthersTransactionResponse, EthersPopulatedTransaction> {
    private readonly _readable;
    constructor(readable: ReadableEthersLiquity);
    private _wrapSimpleTransaction;
    private _wrapTroveChangeWithFees;
    private _wrapTroveClosure;
    private _wrapLiquidation;
    private _extractStabilityPoolGainsWithdrawalDetails;
    private _wrapStabilityPoolGainsWithdrawal;
    private _wrapStabilityDepositTopup;
    private _wrapStabilityDepositWithdrawal;
    private _wrapCollateralGainTransfer;
    private _findHintsForNominalCollateralRatio;
    private _findHints;
    private _findRedemptionHints;
    /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.openTrove} */
    openTrove(params: TroveCreationParams<Decimalish>, maxBorrowingRateOrOptionalParams?: Decimalish | BorrowingOperationOptionalParams, overrides?: EthersTransactionOverrides): Promise<PopulatedEthersLiquityTransaction<TroveCreationDetails>>;
    /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.closeTrove} */
    closeTrove(overrides?: EthersTransactionOverrides): Promise<PopulatedEthersLiquityTransaction<TroveClosureDetails>>;
    /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.depositCollateral} */
    depositCollateral(amount: Decimalish, overrides?: EthersTransactionOverrides): Promise<PopulatedEthersLiquityTransaction<TroveAdjustmentDetails>>;
    /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.withdrawCollateral} */
    withdrawCollateral(amount: Decimalish, overrides?: EthersTransactionOverrides): Promise<PopulatedEthersLiquityTransaction<TroveAdjustmentDetails>>;
    /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.borrowLUSD} */
    borrowLUSD(amount: Decimalish, maxBorrowingRate?: Decimalish, overrides?: EthersTransactionOverrides): Promise<PopulatedEthersLiquityTransaction<TroveAdjustmentDetails>>;
    /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.repayLUSD} */
    repayLUSD(amount: Decimalish, overrides?: EthersTransactionOverrides): Promise<PopulatedEthersLiquityTransaction<TroveAdjustmentDetails>>;
    /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.adjustTrove} */
    adjustTrove(params: TroveAdjustmentParams<Decimalish>, maxBorrowingRateOrOptionalParams?: Decimalish | BorrowingOperationOptionalParams, overrides?: EthersTransactionOverrides): Promise<PopulatedEthersLiquityTransaction<TroveAdjustmentDetails>>;
    /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.claimCollateralSurplus} */
    claimCollateralSurplus(overrides?: EthersTransactionOverrides): Promise<PopulatedEthersLiquityTransaction<void>>;
    /** @internal */
    setPrice(price: Decimalish, overrides?: EthersTransactionOverrides): Promise<PopulatedEthersLiquityTransaction<void>>;
    /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.liquidate} */
    liquidate(address: string | string[], overrides?: EthersTransactionOverrides): Promise<PopulatedEthersLiquityTransaction<LiquidationDetails>>;
    /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.liquidateUpTo} */
    liquidateUpTo(maximumNumberOfTrovesToLiquidate: number, overrides?: EthersTransactionOverrides): Promise<PopulatedEthersLiquityTransaction<LiquidationDetails>>;
    /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.depositLUSDInStabilityPool} */
    depositLUSDInStabilityPool(amount: Decimalish, frontendTag?: string, overrides?: EthersTransactionOverrides): Promise<PopulatedEthersLiquityTransaction<StabilityDepositChangeDetails>>;
    /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.withdrawLUSDFromStabilityPool} */
    withdrawLUSDFromStabilityPool(amount: Decimalish, overrides?: EthersTransactionOverrides): Promise<PopulatedEthersLiquityTransaction<StabilityDepositChangeDetails>>;
    /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.withdrawGainsFromStabilityPool} */
    withdrawGainsFromStabilityPool(overrides?: EthersTransactionOverrides): Promise<PopulatedEthersLiquityTransaction<StabilityPoolGainsWithdrawalDetails>>;
    /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.transferCollateralGainToTrove} */
    transferCollateralGainToTrove(overrides?: EthersTransactionOverrides): Promise<PopulatedEthersLiquityTransaction<CollateralGainTransferDetails>>;
    /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.sendLUSD} */
    sendLUSD(toAddress: string, amount: Decimalish, overrides?: EthersTransactionOverrides): Promise<PopulatedEthersLiquityTransaction<void>>;
    /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.sendLQTY} */
    sendLQTY(toAddress: string, amount: Decimalish, overrides?: EthersTransactionOverrides): Promise<PopulatedEthersLiquityTransaction<void>>;
    /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.redeemLUSD} */
    redeemLUSD(amount: Decimalish, maxRedemptionRate?: Decimalish, overrides?: EthersTransactionOverrides): Promise<PopulatedEthersRedemption>;
    /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.stakeLQTY} */
    stakeLQTY(amount: Decimalish, overrides?: EthersTransactionOverrides): Promise<PopulatedEthersLiquityTransaction<void>>;
    /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.unstakeLQTY} */
    unstakeLQTY(amount: Decimalish, overrides?: EthersTransactionOverrides): Promise<PopulatedEthersLiquityTransaction<void>>;
    /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.withdrawGainsFromStaking} */
    withdrawGainsFromStaking(overrides?: EthersTransactionOverrides): Promise<PopulatedEthersLiquityTransaction<void>>;
    /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.registerFrontend} */
    registerFrontend(kickbackRate: Decimalish, overrides?: EthersTransactionOverrides): Promise<PopulatedEthersLiquityTransaction<void>>;
    /** @internal */
    _mintUniToken(amount: Decimalish, address?: string, overrides?: EthersTransactionOverrides): Promise<PopulatedEthersLiquityTransaction<void>>;
    /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.approveUniTokens} */
    approveUniTokens(allowance?: Decimalish, overrides?: EthersTransactionOverrides): Promise<PopulatedEthersLiquityTransaction<void>>;
    /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.stakeUniTokens} */
    stakeUniTokens(amount: Decimalish, overrides?: EthersTransactionOverrides): Promise<PopulatedEthersLiquityTransaction<void>>;
    /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.unstakeUniTokens} */
    unstakeUniTokens(amount: Decimalish, overrides?: EthersTransactionOverrides): Promise<PopulatedEthersLiquityTransaction<void>>;
    /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.withdrawLQTYRewardFromLiquidityMining} */
    withdrawLQTYRewardFromLiquidityMining(overrides?: EthersTransactionOverrides): Promise<PopulatedEthersLiquityTransaction<void>>;
    /** {@inheritDoc @liquity/lib-base#PopulatableLiquity.exitLiquidityMining} */
    exitLiquidityMining(overrides?: EthersTransactionOverrides): Promise<PopulatedEthersLiquityTransaction<void>>;
}
//# sourceMappingURL=PopulatableEthersLiquity.d.ts.map