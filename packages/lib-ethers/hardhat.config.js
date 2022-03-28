"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
require("colors");
const wallet_1 = require("@ethersproject/wallet");
const config_1 = require("hardhat/config");
require("@nomiclabs/hardhat-ethers");
const lib_base_1 = require("@liquity/lib-base");
const deploy_1 = require("./utils/deploy");
const contracts_1 = require("./src/contracts");
const accounts_json_1 = __importDefault(require("./accounts.json"));
dotenv_1.default.config();
const numAccounts = 100;
const useLiveVersionEnv = ((_a = process.env.USE_LIVE_VERSION) !== null && _a !== void 0 ? _a : "false").toLowerCase();
const useLiveVersion = !["false", "no", "0"].includes(useLiveVersionEnv);
const contractsDir = path_1.default.join("..", "contracts");
const artifacts = path_1.default.join(contractsDir, "artifacts");
const cache = path_1.default.join(contractsDir, "cache");
const contractsVersion = fs_1.default
    .readFileSync(path_1.default.join(useLiveVersion ? "live" : artifacts, "version"))
    .toString()
    .trim();
if (useLiveVersion) {
    console.log(`Using live version of contracts (${contractsVersion}).`.cyan);
}
const generateRandomAccounts = (numberOfAccounts) => {
    const accounts = new Array(numberOfAccounts);
    for (let i = 0; i < numberOfAccounts; ++i) {
        accounts[i] = wallet_1.Wallet.createRandom().privateKey;
    }
    return accounts;
};
const deployerAccount = process.env.DEPLOYER_PRIVATE_KEY || wallet_1.Wallet.createRandom().privateKey;
const devChainRichAccount = "0x4d5db4107d237df6a3d58ee5f70ae63d73d7658d4026f2eefd2f204c81682cb7";
const infuraApiKey = "ad9cef41c9c844a7b54d10be24d416e5";
const infuraNetwork = (name) => ({
    [name]: {
        url: `https://${name}.infura.io/v3/${infuraApiKey}`,
        accounts: [deployerAccount]
    }
});
// https://docs.chain.link/docs/ethereum-addresses
// https://docs.tellor.io/tellor/integration/reference-page
const oracleAddresses = {
    mainnet: {
        chainlink: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
        tellor: "0x88dF592F8eb5D7Bd38bFeF7dEb0fBc02cf3778a0"
    },
    rinkeby: {
        chainlink: "0x8A753747A1Fa494EC906cE90E9f37563A8AF630e",
        tellor: "0x88dF592F8eb5D7Bd38bFeF7dEb0fBc02cf3778a0" // Core
    },
    kovan: {
        chainlink: "0x9326BFA02ADD2366b30bacB125260Af641031331",
        tellor: "0x20374E579832859f180536A69093A126Db1c8aE9" // Playground
    }
};
const hasOracles = (network) => network in oracleAddresses;
const wethAddresses = {
    mainnet: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    ropsten: "0xc778417E063141139Fce010982780140Aa0cD5Ab",
    rinkeby: "0xc778417E063141139Fce010982780140Aa0cD5Ab",
    goerli: "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6",
    kovan: "0xd0A1E359811322d97991E03f863a0C30C2cF029C"
};
const hasWETH = (network) => network in wethAddresses;
const config = {
    networks: {
        hardhat: {
            accounts: accounts_json_1.default.slice(0, numAccounts),
            gas: 12e6,
            blockGasLimit: 12e6,
            // Let Ethers throw instead of Buidler EVM
            // This is closer to what will happen in production
            throwOnCallFailures: false,
            throwOnTransactionFailures: false
        },
        dev: {
            url: "http://localhost:8545",
            accounts: [deployerAccount, devChainRichAccount, ...generateRandomAccounts(numAccounts - 2)]
        },
        ...infuraNetwork("ropsten"),
        ...infuraNetwork("rinkeby"),
        ...infuraNetwork("goerli"),
        ...infuraNetwork("kovan"),
        ...infuraNetwork("mainnet")
    },
    paths: {
        artifacts,
        cache
    }
};
const getLiveArtifact = (name) => require(`./live/${name}.json`);
const getContractFactory = useLiveVersion
    ? env => (name, signer) => {
        const { abi, bytecode } = getLiveArtifact(name);
        return env.ethers.getContractFactory(abi, bytecode, signer);
    }
    : env => env.ethers.getContractFactory;
config_1.extendEnvironment(env => {
    env.deployLiquity = async (deployer, useRealPriceFeed = false, wethAddress = undefined, overrides) => {
        const deployment = await deploy_1.deployAndSetupContracts(deployer, getContractFactory(env), !useRealPriceFeed, env.network.name === "dev", wethAddress, overrides);
        return { ...deployment, version: contractsVersion };
    };
});
const defaultChannel = process.env.CHANNEL || "default";
config_1.task("deploy", "Deploys the contracts to the network")
    .addOptionalParam("channel", "Deployment channel to deploy into", defaultChannel, config_1.types.string)
    .addOptionalParam("gasPrice", "Price to pay for 1 gas [Gwei]", undefined, config_1.types.float)
    .addOptionalParam("useRealPriceFeed", "Deploy the production version of PriceFeed and connect it to Chainlink", undefined, config_1.types.boolean)
    .addOptionalParam("createUniswapPair", "Create a real Uniswap v2 WETH-LUSD pair instead of a mock ERC20 token", undefined, config_1.types.boolean)
    .setAction(async ({ channel, gasPrice, useRealPriceFeed, createUniswapPair }, env) => {
    const overrides = { gasPrice: gasPrice && lib_base_1.Decimal.from(gasPrice).div(1000000000).hex };
    const [deployer] = await env.ethers.getSigners();
    useRealPriceFeed !== null && useRealPriceFeed !== void 0 ? useRealPriceFeed : (useRealPriceFeed = env.network.name === "mainnet");
    if (useRealPriceFeed && !hasOracles(env.network.name)) {
        throw new Error(`PriceFeed not supported on ${env.network.name}`);
    }
    let wethAddress = undefined;
    if (createUniswapPair) {
        if (!hasWETH(env.network.name)) {
            throw new Error(`WETH not deployed on ${env.network.name}`);
        }
        wethAddress = wethAddresses[env.network.name];
    }
    deploy_1.setSilent(false);
    const deployment = await env.deployLiquity(deployer, useRealPriceFeed, wethAddress, overrides);
    if (useRealPriceFeed) {
        const contracts = contracts_1._connectToContracts(deployer, deployment);
        assert_1.default(!contracts_1._priceFeedIsTestnet(contracts.priceFeed));
        if (hasOracles(env.network.name)) {
            const tellorCallerAddress = await deploy_1.deployTellorCaller(deployer, getContractFactory(env), oracleAddresses[env.network.name].tellor, overrides);
            console.log(`Hooking up PriceFeed with oracles ...`);
            const tx = await contracts.priceFeed.setAddresses(oracleAddresses[env.network.name].chainlink, tellorCallerAddress, overrides);
            await tx.wait();
        }
    }
    fs_1.default.mkdirSync(path_1.default.join("deployments", channel), { recursive: true });
    fs_1.default.writeFileSync(path_1.default.join("deployments", channel, `${env.network.name}.json`), JSON.stringify(deployment, undefined, 2));
    console.log();
    console.log(deployment);
    console.log();
});
exports.default = config;
//# sourceMappingURL=hardhat.config.js.map