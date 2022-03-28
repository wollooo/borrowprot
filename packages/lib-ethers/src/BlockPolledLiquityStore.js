"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockPolledLiquityStore = void 0;
const constants_1 = require("@ethersproject/constants");
const lib_base_1 = require("@liquity/lib-base");
const _utils_1 = require("./_utils");
const EthersLiquityConnection_1 = require("./EthersLiquityConnection");
/**
 * Ethers-based {@link @liquity/lib-base#LiquityStore} that updates state whenever there's a new
 * block.
 *
 * @public
 */
class BlockPolledLiquityStore extends lib_base_1.LiquityStore {
    constructor(readable) {
        super();
        this.connection = readable.connection;
        this._readable = readable;
        this._provider = EthersLiquityConnection_1._getProvider(readable.connection);
    }
    async _getRiskiestTroveBeforeRedistribution(overrides) {
        const riskiestTroves = await this._readable.getTroves({ first: 1, sortedBy: "ascendingCollateralRatio", beforeRedistribution: true }, overrides);
        if (riskiestTroves.length === 0) {
            return new lib_base_1.TroveWithPendingRedistribution(constants_1.AddressZero, "nonExistent");
        }
        return riskiestTroves[0];
    }
    async _get(blockTag) {
        const { userAddress, frontendTag } = this.connection;
        const { blockTimestamp, _feesFactory, calculateRemainingLQTY, ...baseState } = await _utils_1.promiseAllValues({
            blockTimestamp: this._readable._getBlockTimestamp(blockTag),
            _feesFactory: this._readable._getFeesFactory({ blockTag }),
            calculateRemainingLQTY: this._readable._getRemainingLiquidityMiningLQTYRewardCalculator({
                blockTag
            }),
            price: this._readable.getPrice({ blockTag }),
            numberOfTroves: this._readable.getNumberOfTroves({ blockTag }),
            totalRedistributed: this._readable.getTotalRedistributed({ blockTag }),
            total: this._readable.getTotal({ blockTag }),
            lusdInStabilityPool: this._readable.getLUSDInStabilityPool({ blockTag }),
            totalStakedLQTY: this._readable.getTotalStakedLQTY({ blockTag }),
            _riskiestTroveBeforeRedistribution: this._getRiskiestTroveBeforeRedistribution({ blockTag }),
            totalStakedUniTokens: this._readable.getTotalStakedUniTokens({ blockTag }),
            remainingStabilityPoolLQTYReward: this._readable.getRemainingStabilityPoolLQTYReward({
                blockTag
            }),
            frontend: frontendTag
                ? this._readable.getFrontendStatus(frontendTag, { blockTag })
                : { status: "unregistered" },
            ...(userAddress
                ? {
                    accountBalance: this._provider.getBalance(userAddress, blockTag).then(_utils_1.decimalify),
                    lusdBalance: this._readable.getLUSDBalance(userAddress, { blockTag }),
                    lqtyBalance: this._readable.getLQTYBalance(userAddress, { blockTag }),
                    uniTokenBalance: this._readable.getUniTokenBalance(userAddress, { blockTag }),
                    uniTokenAllowance: this._readable.getUniTokenAllowance(userAddress, { blockTag }),
                    liquidityMiningStake: this._readable.getLiquidityMiningStake(userAddress, { blockTag }),
                    liquidityMiningLQTYReward: this._readable.getLiquidityMiningLQTYReward(userAddress, {
                        blockTag
                    }),
                    collateralSurplusBalance: this._readable.getCollateralSurplusBalance(userAddress, {
                        blockTag
                    }),
                    troveBeforeRedistribution: this._readable.getTroveBeforeRedistribution(userAddress, {
                        blockTag
                    }),
                    stabilityDeposit: this._readable.getStabilityDeposit(userAddress, { blockTag }),
                    lqtyStake: this._readable.getLQTYStake(userAddress, { blockTag }),
                    ownFrontend: this._readable.getFrontendStatus(userAddress, { blockTag })
                }
                : {
                    accountBalance: lib_base_1.Decimal.ZERO,
                    lusdBalance: lib_base_1.Decimal.ZERO,
                    lqtyBalance: lib_base_1.Decimal.ZERO,
                    uniTokenBalance: lib_base_1.Decimal.ZERO,
                    uniTokenAllowance: lib_base_1.Decimal.ZERO,
                    liquidityMiningStake: lib_base_1.Decimal.ZERO,
                    liquidityMiningLQTYReward: lib_base_1.Decimal.ZERO,
                    collateralSurplusBalance: lib_base_1.Decimal.ZERO,
                    troveBeforeRedistribution: new lib_base_1.TroveWithPendingRedistribution(constants_1.AddressZero, "nonExistent"),
                    stabilityDeposit: new lib_base_1.StabilityDeposit(lib_base_1.Decimal.ZERO, lib_base_1.Decimal.ZERO, lib_base_1.Decimal.ZERO, lib_base_1.Decimal.ZERO, constants_1.AddressZero),
                    lqtyStake: new lib_base_1.LQTYStake(),
                    ownFrontend: { status: "unregistered" }
                })
        });
        return [
            {
                ...baseState,
                _feesInNormalMode: _feesFactory(blockTimestamp, false),
                remainingLiquidityMiningLQTYReward: calculateRemainingLQTY(blockTimestamp)
            },
            {
                blockTag,
                blockTimestamp,
                _feesFactory
            }
        ];
    }
    /** @internal @override */
    _doStart() {
        this._get().then(state => {
            if (!this._loaded) {
                this._load(...state);
            }
        });
        const blockListener = async (blockTag) => {
            const state = await this._get(blockTag);
            if (this._loaded) {
                this._update(...state);
            }
            else {
                this._load(...state);
            }
        };
        this._provider.on("block", blockListener);
        return () => {
            this._provider.off("block", blockListener);
        };
    }
    /** @internal @override */
    _reduceExtra(oldState, stateUpdate) {
        var _a, _b, _c;
        return {
            blockTag: (_a = stateUpdate.blockTag) !== null && _a !== void 0 ? _a : oldState.blockTag,
            blockTimestamp: (_b = stateUpdate.blockTimestamp) !== null && _b !== void 0 ? _b : oldState.blockTimestamp,
            _feesFactory: (_c = stateUpdate._feesFactory) !== null && _c !== void 0 ? _c : oldState._feesFactory
        };
    }
}
exports.BlockPolledLiquityStore = BlockPolledLiquityStore;
//# sourceMappingURL=BlockPolledLiquityStore.js.map