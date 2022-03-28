"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deployAndSetupContracts = exports.deployTellorCaller = exports.setSilent = exports.log = void 0;
const wallet_1 = require("@ethersproject/wallet");
const lib_base_1 = require("@liquity/lib-base");
const contracts_1 = require("../src/contracts");
const UniswapV2Factory_1 = require("./UniswapV2Factory");
let silent = true;
const log = (...args) => {
    if (!silent) {
        console.log(...args);
    }
};
exports.log = log;
const setSilent = (s) => {
    silent = s;
};
exports.setSilent = setSilent;
const deployContractAndGetBlockNumber = async (deployer, getContractFactory, contractName, ...args) => {
    exports.log(`Deploying ${contractName} ...`);
    const contract = await (await getContractFactory(contractName, deployer)).deploy(...args);
    exports.log(`Waiting for transaction ${contract.deployTransaction.hash} ...`);
    const receipt = await contract.deployTransaction.wait();
    exports.log({
        contractAddress: contract.address,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toNumber()
    });
    exports.log();
    return [contract.address, receipt.blockNumber];
};
const deployContract = (...p) => deployContractAndGetBlockNumber(...p).then(([a]) => a);
const deployContracts = async (deployer, getContractFactory, priceFeedIsTestnet = true, overrides) => {
    const [activePoolAddress, startBlock] = await deployContractAndGetBlockNumber(deployer, getContractFactory, "ActivePool", { ...overrides });
    const addresses = {
        activePool: activePoolAddress,
        borrowerOperations: await deployContract(deployer, getContractFactory, "BorrowerOperations", {
            ...overrides
        }),
        troveManager: await deployContract(deployer, getContractFactory, "TroveManager", {
            ...overrides
        }),
        collSurplusPool: await deployContract(deployer, getContractFactory, "CollSurplusPool", {
            ...overrides
        }),
        communityIssuance: await deployContract(deployer, getContractFactory, "CommunityIssuance", {
            ...overrides
        }),
        defaultPool: await deployContract(deployer, getContractFactory, "DefaultPool", { ...overrides }),
        hintHelpers: await deployContract(deployer, getContractFactory, "HintHelpers", { ...overrides }),
        lockupContractFactory: await deployContract(deployer, getContractFactory, "LockupContractFactory", { ...overrides }),
        lqtyStaking: await deployContract(deployer, getContractFactory, "LQTYStaking", { ...overrides }),
        priceFeed: await deployContract(deployer, getContractFactory, priceFeedIsTestnet ? "PriceFeedTestnet" : "PriceFeed", { ...overrides }),
        sortedTroves: await deployContract(deployer, getContractFactory, "SortedTroves", {
            ...overrides
        }),
        stabilityPool: await deployContract(deployer, getContractFactory, "StabilityPool", {
            ...overrides
        }),
        gasPool: await deployContract(deployer, getContractFactory, "GasPool", {
            ...overrides
        }),
        unipool: await deployContract(deployer, getContractFactory, "Unipool", { ...overrides }),
        kumoParameters: await deployContract(deployer, getContractFactory, "KumoParameters", { ...overrides })
    };
    return [
        {
            ...addresses,
            lusdToken: await deployContract(deployer, getContractFactory, "LUSDToken", addresses.troveManager, addresses.stabilityPool, addresses.borrowerOperations, { ...overrides }),
            lqtyToken: await deployContract(deployer, getContractFactory, "LQTYToken", addresses.communityIssuance, addresses.lqtyStaking, addresses.lockupContractFactory, wallet_1.Wallet.createRandom().address, // _bountyAddress (TODO: parameterize this)
            addresses.unipool, // _lpRewardsAddress
            wallet_1.Wallet.createRandom().address, // _multisigAddress (TODO: parameterize this)
            { ...overrides }),
            multiTroveGetter: await deployContract(deployer, getContractFactory, "MultiTroveGetter", addresses.troveManager, addresses.sortedTroves, { ...overrides })
        },
        startBlock
    ];
};
const deployTellorCaller = (deployer, getContractFactory, tellorAddress, overrides) => deployContract(deployer, getContractFactory, "TellorCaller", tellorAddress, { ...overrides });
exports.deployTellorCaller = deployTellorCaller;
const connectContracts = async ({ activePool, borrowerOperations, troveManager, lusdToken, collSurplusPool, communityIssuance, defaultPool, lqtyToken, hintHelpers, lockupContractFactory, lqtyStaking, priceFeed, sortedTroves, stabilityPool, gasPool, unipool, uniToken, kumoParameters }, deployer, overrides) => {
    if (!deployer.provider) {
        throw new Error("Signer must have a provider.");
    }
    const txCount = await deployer.provider.getTransactionCount(deployer.getAddress());
    const connections = [
        nonce => sortedTroves.setParams(1e6, troveManager.address, borrowerOperations.address, {
            ...overrides,
            nonce
        }),
        nonce => troveManager.setAddresses(borrowerOperations.address, activePool.address, defaultPool.address, stabilityPool.address, gasPool.address, collSurplusPool.address, priceFeed.address, lusdToken.address, sortedTroves.address, lqtyToken.address, lqtyStaking.address, kumoParameters.address, { ...overrides, nonce }),
        nonce => borrowerOperations.setAddresses(troveManager.address, activePool.address, defaultPool.address, stabilityPool.address, gasPool.address, collSurplusPool.address, priceFeed.address, sortedTroves.address, lusdToken.address, lqtyStaking.address, kumoParameters.address, { ...overrides, nonce }),
        nonce => stabilityPool.setAddresses(borrowerOperations.address, troveManager.address, activePool.address, lusdToken.address, sortedTroves.address, priceFeed.address, communityIssuance.address, kumoParameters.address, { ...overrides, nonce }),
        nonce => activePool.setAddresses(borrowerOperations.address, troveManager.address, stabilityPool.address, defaultPool.address, { ...overrides, nonce }),
        nonce => defaultPool.setAddresses(troveManager.address, activePool.address, {
            ...overrides,
            nonce
        }),
        nonce => collSurplusPool.setAddresses(borrowerOperations.address, troveManager.address, activePool.address, { ...overrides, nonce }),
        nonce => hintHelpers.setAddresses(sortedTroves.address, troveManager.address, {
            ...overrides,
            nonce
        }),
        nonce => lqtyStaking.setAddresses(lqtyToken.address, lusdToken.address, troveManager.address, borrowerOperations.address, activePool.address, { ...overrides, nonce }),
        nonce => lockupContractFactory.setLQTYTokenAddress(lqtyToken.address, {
            ...overrides,
            nonce
        }),
        nonce => communityIssuance.setAddresses(lqtyToken.address, stabilityPool.address, {
            ...overrides,
            nonce
        }),
        nonce => unipool.setParams(lqtyToken.address, uniToken.address, 2 * 30 * 24 * 60 * 60, {
            ...overrides,
            nonce
        })
    ];
    const txs = await Promise.all(connections.map((connect, i) => connect(txCount + i)));
    let i = 0;
    await Promise.all(txs.map(tx => tx.wait().then(() => exports.log(`Connected ${++i}`))));
};
const deployMockUniToken = (deployer, getContractFactory, overrides) => deployContract(deployer, getContractFactory, "ERC20Mock", "Mock Uniswap V2", "UNI-V2", wallet_1.Wallet.createRandom().address, // initialAccount
0, // initialBalance
{ ...overrides });
const deployAndSetupContracts = async (deployer, getContractFactory, _priceFeedIsTestnet = true, _isDev = true, wethAddress, overrides) => {
    if (!deployer.provider) {
        throw new Error("Signer must have a provider.");
    }
    exports.log("Deploying contracts...");
    exports.log();
    const deployment = {
        chainId: await deployer.getChainId(),
        version: "unknown",
        deploymentDate: new Date().getTime(),
        bootstrapPeriod: 0,
        totalStabilityPoolLQTYReward: "0",
        liquidityMiningLQTYRewardRate: "0",
        _priceFeedIsTestnet,
        _uniTokenIsMock: !wethAddress,
        _isDev,
        ...(await deployContracts(deployer, getContractFactory, _priceFeedIsTestnet, overrides).then(async ([addresses, startBlock]) => ({
            startBlock,
            addresses: {
                ...addresses,
                uniToken: await (wethAddress
                    ? UniswapV2Factory_1.createUniswapV2Pair(deployer, wethAddress, addresses.lusdToken, overrides)
                    : deployMockUniToken(deployer, getContractFactory, overrides))
            }
        })))
    };
    const contracts = contracts_1._connectToContracts(deployer, deployment);
    exports.log("Connecting contracts...");
    await connectContracts(contracts, deployer, overrides);
    const lqtyTokenDeploymentTime = await contracts.lqtyToken.getDeploymentStartTime();
    const bootstrapPeriod = await contracts.troveManager.BOOTSTRAP_PERIOD();
    const totalStabilityPoolLQTYReward = await contracts.communityIssuance.LQTYSupplyCap();
    const liquidityMiningLQTYRewardRate = await contracts.unipool.rewardRate();
    return {
        ...deployment,
        deploymentDate: lqtyTokenDeploymentTime.toNumber() * 1000,
        bootstrapPeriod: bootstrapPeriod.toNumber(),
        totalStabilityPoolLQTYReward: `${lib_base_1.Decimal.fromBigNumberString(totalStabilityPoolLQTYReward.toHexString())}`,
        liquidityMiningLQTYRewardRate: `${lib_base_1.Decimal.fromBigNumberString(liquidityMiningLQTYRewardRate.toHexString())}`
    };
};
exports.deployAndSetupContracts = deployAndSetupContracts;
//# sourceMappingURL=deploy.js.map