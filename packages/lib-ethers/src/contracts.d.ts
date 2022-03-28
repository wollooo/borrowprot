import { LogDescription } from "@ethersproject/abi";
import { BigNumber } from "@ethersproject/bignumber";
import { Log } from "@ethersproject/abstract-provider";
import { Contract, ContractInterface, Overrides, CallOverrides, PopulatedTransaction, ContractTransaction } from "@ethersproject/contracts";
import { ActivePool, BorrowerOperations, TroveManager, LUSDToken, CollSurplusPool, CommunityIssuance, DefaultPool, LQTYToken, HintHelpers, LockupContractFactory, LQTYStaking, MultiTroveGetter, PriceFeed, PriceFeedTestnet, SortedTroves, StabilityPool, GasPool, Unipool, ERC20Mock, IERC20, KumoParameters } from "../types";
import { EthersProvider, EthersSigner } from "./types";
export interface _TypedLogDescription<T> extends Omit<LogDescription, "args"> {
    args: T;
}
declare type BucketOfFunctions = Record<string, (...args: unknown[]) => never>;
export declare type _TypeSafeContract<T> = Pick<T, {
    [P in keyof T]: BucketOfFunctions extends T[P] ? never : P;
} extends {
    [_ in keyof T]: infer U;
} ? U : never>;
declare type EstimatedContractFunction<R = unknown, A extends unknown[] = unknown[], O = Overrides> = (overrides: O, adjustGas: (gas: BigNumber) => BigNumber, ...args: A) => Promise<R>;
declare type CallOverridesArg = [overrides?: CallOverrides];
declare type TypedContract<T extends Contract, U, V> = _TypeSafeContract<T> & U & {
    [P in keyof V]: V[P] extends (...args: infer A) => unknown ? (...args: A) => Promise<ContractTransaction> : never;
} & {
    readonly callStatic: {
        [P in keyof V]: V[P] extends (...args: [...infer A, never]) => infer R ? (...args: [...A, ...CallOverridesArg]) => R : never;
    };
    readonly estimateGas: {
        [P in keyof V]: V[P] extends (...args: infer A) => unknown ? (...args: A) => Promise<BigNumber> : never;
    };
    readonly populateTransaction: {
        [P in keyof V]: V[P] extends (...args: infer A) => unknown ? (...args: A) => Promise<PopulatedTransaction> : never;
    };
    readonly estimateAndPopulate: {
        [P in keyof V]: V[P] extends (...args: [...infer A, infer O | undefined]) => unknown ? EstimatedContractFunction<PopulatedTransaction, A, O> : never;
    };
};
export declare class _LiquityContract extends Contract {
    readonly estimateAndPopulate: Record<string, EstimatedContractFunction<PopulatedTransaction>>;
    constructor(addressOrName: string, contractInterface: ContractInterface, signerOrProvider?: EthersSigner | EthersProvider);
    extractEvents(logs: Log[], name: string): _TypedLogDescription<unknown>[];
}
/** @internal */
export declare type _TypedLiquityContract<T = unknown, U = unknown> = TypedContract<_LiquityContract, T, U>;
/** @internal */
export interface _LiquityContracts {
    activePool: ActivePool;
    borrowerOperations: BorrowerOperations;
    troveManager: TroveManager;
    lusdToken: LUSDToken;
    collSurplusPool: CollSurplusPool;
    communityIssuance: CommunityIssuance;
    defaultPool: DefaultPool;
    lqtyToken: LQTYToken;
    hintHelpers: HintHelpers;
    lockupContractFactory: LockupContractFactory;
    lqtyStaking: LQTYStaking;
    multiTroveGetter: MultiTroveGetter;
    priceFeed: PriceFeed | PriceFeedTestnet;
    sortedTroves: SortedTroves;
    stabilityPool: StabilityPool;
    gasPool: GasPool;
    unipool: Unipool;
    uniToken: IERC20 | ERC20Mock;
    kumoParameters: KumoParameters;
}
/** @internal */
export declare const _priceFeedIsTestnet: (priceFeed: PriceFeed | PriceFeedTestnet) => priceFeed is PriceFeedTestnet;
/** @internal */
export declare const _uniTokenIsMock: (uniToken: IERC20 | ERC20Mock) => uniToken is ERC20Mock;
declare type LiquityContractsKey = keyof _LiquityContracts;
/** @internal */
export declare type _LiquityContractAddresses = Record<LiquityContractsKey, string>;
/** @internal */
export interface _LiquityDeploymentJSON {
    readonly chainId: number;
    readonly addresses: _LiquityContractAddresses;
    readonly version: string;
    readonly deploymentDate: number;
    readonly startBlock: number;
    readonly bootstrapPeriod: number;
    readonly totalStabilityPoolLQTYReward: string;
    readonly liquidityMiningLQTYRewardRate: string;
    readonly _priceFeedIsTestnet: boolean;
    readonly _uniTokenIsMock: boolean;
    readonly _isDev: boolean;
}
/** @internal */
export declare const _connectToContracts: (signerOrProvider: EthersSigner | EthersProvider, { addresses, _priceFeedIsTestnet, _uniTokenIsMock }: _LiquityDeploymentJSON) => _LiquityContracts;
export {};
//# sourceMappingURL=contracts.d.ts.map