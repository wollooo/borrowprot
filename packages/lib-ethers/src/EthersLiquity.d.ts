import { BlockTag } from "@ethersproject/abstract-provider";
import { CollateralGainTransferDetails, Decimal, Decimalish, FailedReceipt, Fees, FrontendStatus, LiquidationDetails, LiquityStore, LQTYStake, RedemptionDetails, StabilityDeposit, StabilityDepositChangeDetails, StabilityPoolGainsWithdrawalDetails, TransactableLiquity, TransactionFailedError, Trove, TroveAdjustmentDetails, TroveAdjustmentParams, TroveClosureDetails, TroveCreationDetails, TroveCreationParams, TroveListingParams, TroveWithPendingRedistribution, UserTrove } from "@liquity/lib-base";
import { EthersLiquityConnection, EthersLiquityConnectionOptionalParams } from "./EthersLiquityConnection";
import { EthersCallOverrides, EthersProvider, EthersSigner, EthersTransactionOverrides, EthersTransactionReceipt } from "./types";
import { BorrowingOperationOptionalParams, PopulatableEthersLiquity } from "./PopulatableEthersLiquity";
import { ReadableEthersLiquity } from "./ReadableEthersLiquity";
import { SendableEthersLiquity } from "./SendableEthersLiquity";
import { BlockPolledLiquityStore } from "./BlockPolledLiquityStore";
/**
 * Thrown by {@link EthersLiquity} in case of transaction failure.
 *
 * @public
 */
export declare class EthersTransactionFailedError extends TransactionFailedError<FailedReceipt<EthersTransactionReceipt>> {
    constructor(message: string, failedReceipt: FailedReceipt<EthersTransactionReceipt>);
}
/**
 * Convenience class that combines multiple interfaces of the library in one object.
 *
 * @public
 */
export declare class EthersLiquity implements ReadableEthersLiquity, TransactableLiquity {
    /** Information about the connection to the Liquity protocol. */
    readonly connection: EthersLiquityConnection;
    /** Can be used to create populated (unsigned) transactions. */
    readonly populate: PopulatableEthersLiquity;
    /** Can be used to send transactions without waiting for them to be mined. */
    readonly send: SendableEthersLiquity;
    private _readable;
    /** @internal */
    constructor(readable: ReadableEthersLiquity);
    /** @internal */
    static _from(connection: EthersLiquityConnection & {
        useStore: "blockPolled";
    }): EthersLiquityWithStore<BlockPolledLiquityStore>;
    /** @internal */
    static _from(connection: EthersLiquityConnection): EthersLiquity;
    /** @internal */
    static connect(signerOrProvider: EthersSigner | EthersProvider, optionalParams: EthersLiquityConnectionOptionalParams & {
        useStore: "blockPolled";
    }): Promise<EthersLiquityWithStore<BlockPolledLiquityStore>>;
    /**
     * Connect to the Liquity protocol and create an `EthersLiquity` object.
     *
     * @param signerOrProvider - Ethers `Signer` or `Provider` to use for connecting to the Ethereum
     *                           network.
     * @param optionalParams - Optional parameters that can be used to customize the connection.
     */
    static connect(signerOrProvider: EthersSigner | EthersProvider, optionalParams?: EthersLiquityConnectionOptionalParams): Promise<EthersLiquity>;
    /**
     * Check whether this `EthersLiquity` is an {@link EthersLiquityWithStore}.
     */
    hasStore(): this is EthersLiquityWithStore;
    /**
     * Check whether this `EthersLiquity` is an
     * {@link EthersLiquityWithStore}\<{@link BlockPolledLiquityStore}\>.
     */
    hasStore(store: "blockPolled"): this is EthersLiquityWithStore<BlockPolledLiquityStore>;
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getTotalRedistributed} */
    getTotalRedistributed(overrides?: EthersCallOverrides): Promise<Trove>;
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getTroveBeforeRedistribution} */
    getTroveBeforeRedistribution(address?: string, overrides?: EthersCallOverrides): Promise<TroveWithPendingRedistribution>;
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getTrove} */
    getTrove(address?: string, overrides?: EthersCallOverrides): Promise<UserTrove>;
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getNumberOfTroves} */
    getNumberOfTroves(overrides?: EthersCallOverrides): Promise<number>;
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getPrice} */
    getPrice(overrides?: EthersCallOverrides): Promise<Decimal>;
    /** @internal */
    _getActivePool(overrides?: EthersCallOverrides): Promise<Trove>;
    /** @internal */
    _getDefaultPool(overrides?: EthersCallOverrides): Promise<Trove>;
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getTotal} */
    getTotal(overrides?: EthersCallOverrides): Promise<Trove>;
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getStabilityDeposit} */
    getStabilityDeposit(address?: string, overrides?: EthersCallOverrides): Promise<StabilityDeposit>;
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getRemainingStabilityPoolLQTYReward} */
    getRemainingStabilityPoolLQTYReward(overrides?: EthersCallOverrides): Promise<Decimal>;
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getLUSDInStabilityPool} */
    getLUSDInStabilityPool(overrides?: EthersCallOverrides): Promise<Decimal>;
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getLUSDBalance} */
    getLUSDBalance(address?: string, overrides?: EthersCallOverrides): Promise<Decimal>;
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getLQTYBalance} */
    getLQTYBalance(address?: string, overrides?: EthersCallOverrides): Promise<Decimal>;
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getUniTokenBalance} */
    getUniTokenBalance(address?: string, overrides?: EthersCallOverrides): Promise<Decimal>;
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getUniTokenAllowance} */
    getUniTokenAllowance(address?: string, overrides?: EthersCallOverrides): Promise<Decimal>;
    /** @internal */
    _getRemainingLiquidityMiningLQTYRewardCalculator(overrides?: EthersCallOverrides): Promise<(blockTimestamp: number) => Decimal>;
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getRemainingLiquidityMiningLQTYReward} */
    getRemainingLiquidityMiningLQTYReward(overrides?: EthersCallOverrides): Promise<Decimal>;
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getLiquidityMiningStake} */
    getLiquidityMiningStake(address?: string, overrides?: EthersCallOverrides): Promise<Decimal>;
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getTotalStakedUniTokens} */
    getTotalStakedUniTokens(overrides?: EthersCallOverrides): Promise<Decimal>;
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getLiquidityMiningLQTYReward} */
    getLiquidityMiningLQTYReward(address?: string, overrides?: EthersCallOverrides): Promise<Decimal>;
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getCollateralSurplusBalance} */
    getCollateralSurplusBalance(address?: string, overrides?: EthersCallOverrides): Promise<Decimal>;
    /** @internal */
    getTroves(params: TroveListingParams & {
        beforeRedistribution: true;
    }, overrides?: EthersCallOverrides): Promise<TroveWithPendingRedistribution[]>;
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.(getTroves:2)} */
    getTroves(params: TroveListingParams, overrides?: EthersCallOverrides): Promise<UserTrove[]>;
    /** @internal */
    _getBlockTimestamp(blockTag?: BlockTag): Promise<number>;
    /** @internal */
    _getFeesFactory(overrides?: EthersCallOverrides): Promise<(blockTimestamp: number, recoveryMode: boolean) => Fees>;
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getFees} */
    getFees(overrides?: EthersCallOverrides): Promise<Fees>;
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getLQTYStake} */
    getLQTYStake(address?: string, overrides?: EthersCallOverrides): Promise<LQTYStake>;
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getTotalStakedLQTY} */
    getTotalStakedLQTY(overrides?: EthersCallOverrides): Promise<Decimal>;
    /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getFrontendStatus} */
    getFrontendStatus(address?: string, overrides?: EthersCallOverrides): Promise<FrontendStatus>;
    /**
     * {@inheritDoc @liquity/lib-base#TransactableLiquity.openTrove}
     *
     * @throws
     * Throws {@link EthersTransactionFailedError} in case of transaction failure.
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    openTrove(params: TroveCreationParams<Decimalish>, maxBorrowingRateOrOptionalParams?: Decimalish | BorrowingOperationOptionalParams, overrides?: EthersTransactionOverrides): Promise<TroveCreationDetails>;
    /**
     * {@inheritDoc @liquity/lib-base#TransactableLiquity.closeTrove}
     *
     * @throws
     * Throws {@link EthersTransactionFailedError} in case of transaction failure.
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    closeTrove(overrides?: EthersTransactionOverrides): Promise<TroveClosureDetails>;
    /**
     * {@inheritDoc @liquity/lib-base#TransactableLiquity.adjustTrove}
     *
     * @throws
     * Throws {@link EthersTransactionFailedError} in case of transaction failure.
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    adjustTrove(params: TroveAdjustmentParams<Decimalish>, maxBorrowingRateOrOptionalParams?: Decimalish | BorrowingOperationOptionalParams, overrides?: EthersTransactionOverrides): Promise<TroveAdjustmentDetails>;
    /**
     * {@inheritDoc @liquity/lib-base#TransactableLiquity.depositCollateral}
     *
     * @throws
     * Throws {@link EthersTransactionFailedError} in case of transaction failure.
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    depositCollateral(amount: Decimalish, overrides?: EthersTransactionOverrides): Promise<TroveAdjustmentDetails>;
    /**
     * {@inheritDoc @liquity/lib-base#TransactableLiquity.withdrawCollateral}
     *
     * @throws
     * Throws {@link EthersTransactionFailedError} in case of transaction failure.
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    withdrawCollateral(amount: Decimalish, overrides?: EthersTransactionOverrides): Promise<TroveAdjustmentDetails>;
    /**
     * {@inheritDoc @liquity/lib-base#TransactableLiquity.borrowLUSD}
     *
     * @throws
     * Throws {@link EthersTransactionFailedError} in case of transaction failure.
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    borrowLUSD(amount: Decimalish, maxBorrowingRate?: Decimalish, overrides?: EthersTransactionOverrides): Promise<TroveAdjustmentDetails>;
    /**
     * {@inheritDoc @liquity/lib-base#TransactableLiquity.repayLUSD}
     *
     * @throws
     * Throws {@link EthersTransactionFailedError} in case of transaction failure.
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    repayLUSD(amount: Decimalish, overrides?: EthersTransactionOverrides): Promise<TroveAdjustmentDetails>;
    /** @internal */
    setPrice(price: Decimalish, overrides?: EthersTransactionOverrides): Promise<void>;
    /**
     * {@inheritDoc @liquity/lib-base#TransactableLiquity.liquidate}
     *
     * @throws
     * Throws {@link EthersTransactionFailedError} in case of transaction failure.
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    liquidate(address: string | string[], overrides?: EthersTransactionOverrides): Promise<LiquidationDetails>;
    /**
     * {@inheritDoc @liquity/lib-base#TransactableLiquity.liquidateUpTo}
     *
     * @throws
     * Throws {@link EthersTransactionFailedError} in case of transaction failure.
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    liquidateUpTo(maximumNumberOfTrovesToLiquidate: number, overrides?: EthersTransactionOverrides): Promise<LiquidationDetails>;
    /**
     * {@inheritDoc @liquity/lib-base#TransactableLiquity.depositLUSDInStabilityPool}
     *
     * @throws
     * Throws {@link EthersTransactionFailedError} in case of transaction failure.
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    depositLUSDInStabilityPool(amount: Decimalish, frontendTag?: string, overrides?: EthersTransactionOverrides): Promise<StabilityDepositChangeDetails>;
    /**
     * {@inheritDoc @liquity/lib-base#TransactableLiquity.withdrawLUSDFromStabilityPool}
     *
     * @throws
     * Throws {@link EthersTransactionFailedError} in case of transaction failure.
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    withdrawLUSDFromStabilityPool(amount: Decimalish, overrides?: EthersTransactionOverrides): Promise<StabilityDepositChangeDetails>;
    /**
     * {@inheritDoc @liquity/lib-base#TransactableLiquity.withdrawGainsFromStabilityPool}
     *
     * @throws
     * Throws {@link EthersTransactionFailedError} in case of transaction failure.
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    withdrawGainsFromStabilityPool(overrides?: EthersTransactionOverrides): Promise<StabilityPoolGainsWithdrawalDetails>;
    /**
     * {@inheritDoc @liquity/lib-base#TransactableLiquity.transferCollateralGainToTrove}
     *
     * @throws
     * Throws {@link EthersTransactionFailedError} in case of transaction failure.
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    transferCollateralGainToTrove(overrides?: EthersTransactionOverrides): Promise<CollateralGainTransferDetails>;
    /**
     * {@inheritDoc @liquity/lib-base#TransactableLiquity.sendLUSD}
     *
     * @throws
     * Throws {@link EthersTransactionFailedError} in case of transaction failure.
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    sendLUSD(toAddress: string, amount: Decimalish, overrides?: EthersTransactionOverrides): Promise<void>;
    /**
     * {@inheritDoc @liquity/lib-base#TransactableLiquity.sendLQTY}
     *
     * @throws
     * Throws {@link EthersTransactionFailedError} in case of transaction failure.
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    sendLQTY(toAddress: string, amount: Decimalish, overrides?: EthersTransactionOverrides): Promise<void>;
    /**
     * {@inheritDoc @liquity/lib-base#TransactableLiquity.redeemLUSD}
     *
     * @throws
     * Throws {@link EthersTransactionFailedError} in case of transaction failure.
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    redeemLUSD(amount: Decimalish, maxRedemptionRate?: Decimalish, overrides?: EthersTransactionOverrides): Promise<RedemptionDetails>;
    /**
     * {@inheritDoc @liquity/lib-base#TransactableLiquity.claimCollateralSurplus}
     *
     * @throws
     * Throws {@link EthersTransactionFailedError} in case of transaction failure.
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    claimCollateralSurplus(overrides?: EthersTransactionOverrides): Promise<void>;
    /**
     * {@inheritDoc @liquity/lib-base#TransactableLiquity.stakeLQTY}
     *
     * @throws
     * Throws {@link EthersTransactionFailedError} in case of transaction failure.
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    stakeLQTY(amount: Decimalish, overrides?: EthersTransactionOverrides): Promise<void>;
    /**
     * {@inheritDoc @liquity/lib-base#TransactableLiquity.unstakeLQTY}
     *
     * @throws
     * Throws {@link EthersTransactionFailedError} in case of transaction failure.
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    unstakeLQTY(amount: Decimalish, overrides?: EthersTransactionOverrides): Promise<void>;
    /**
     * {@inheritDoc @liquity/lib-base#TransactableLiquity.withdrawGainsFromStaking}
     *
     * @throws
     * Throws {@link EthersTransactionFailedError} in case of transaction failure.
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    withdrawGainsFromStaking(overrides?: EthersTransactionOverrides): Promise<void>;
    /**
     * {@inheritDoc @liquity/lib-base#TransactableLiquity.registerFrontend}
     *
     * @throws
     * Throws {@link EthersTransactionFailedError} in case of transaction failure.
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    registerFrontend(kickbackRate: Decimalish, overrides?: EthersTransactionOverrides): Promise<void>;
    /** @internal */
    _mintUniToken(amount: Decimalish, address?: string, overrides?: EthersTransactionOverrides): Promise<void>;
    /**
     * {@inheritDoc @liquity/lib-base#TransactableLiquity.approveUniTokens}
     *
     * @throws
     * Throws {@link EthersTransactionFailedError} in case of transaction failure.
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    approveUniTokens(allowance?: Decimalish, overrides?: EthersTransactionOverrides): Promise<void>;
    /**
     * {@inheritDoc @liquity/lib-base#TransactableLiquity.stakeUniTokens}
     *
     * @throws
     * Throws {@link EthersTransactionFailedError} in case of transaction failure.
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    stakeUniTokens(amount: Decimalish, overrides?: EthersTransactionOverrides): Promise<void>;
    /**
     * {@inheritDoc @liquity/lib-base#TransactableLiquity.unstakeUniTokens}
     *
     * @throws
     * Throws {@link EthersTransactionFailedError} in case of transaction failure.
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    unstakeUniTokens(amount: Decimalish, overrides?: EthersTransactionOverrides): Promise<void>;
    /**
     * {@inheritDoc @liquity/lib-base#TransactableLiquity.withdrawLQTYRewardFromLiquidityMining}
     *
     * @throws
     * Throws {@link EthersTransactionFailedError} in case of transaction failure.
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    withdrawLQTYRewardFromLiquidityMining(overrides?: EthersTransactionOverrides): Promise<void>;
    /**
     * {@inheritDoc @liquity/lib-base#TransactableLiquity.exitLiquidityMining}
     *
     * @throws
     * Throws {@link EthersTransactionFailedError} in case of transaction failure.
     * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
     */
    exitLiquidityMining(overrides?: EthersTransactionOverrides): Promise<void>;
}
/**
 * Variant of {@link EthersLiquity} that exposes a {@link @liquity/lib-base#LiquityStore}.
 *
 * @public
 */
export interface EthersLiquityWithStore<T extends LiquityStore = LiquityStore> extends EthersLiquity {
    /** An object that implements LiquityStore. */
    readonly store: T;
}
//# sourceMappingURL=EthersLiquity.d.ts.map