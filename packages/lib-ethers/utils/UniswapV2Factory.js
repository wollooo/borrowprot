"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUniswapV2Pair = void 0;
const assert_1 = __importDefault(require("assert"));
const contracts_1 = require("../src/contracts");
const deploy_1 = require("./deploy");
const factoryAbi = [
    "function createPair(address tokenA, address tokenB) returns (address pair)",
    "event PairCreated(address indexed token0, address indexed token1, address pair, uint)"
];
const factoryAddress = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
const hasFactory = (chainId) => [1, 3, 4, 5, 42].includes(chainId);
const createUniswapV2Pair = async (signer, tokenA, tokenB, overrides) => {
    const chainId = await signer.getChainId();
    if (!hasFactory(chainId)) {
        throw new Error(`UniswapV2Factory is not deployed on this network (chainId = ${chainId})`);
    }
    const factory = new contracts_1._LiquityContract(factoryAddress, factoryAbi, signer);
    deploy_1.log(`Creating Uniswap v2 WETH <=> LUSD pair...`);
    const tx = await factory.createPair(tokenA, tokenB, { ...overrides });
    const receipt = await tx.wait();
    const pairCreatedEvents = factory.extractEvents(receipt.logs, "PairCreated");
    assert_1.default(pairCreatedEvents.length === 1);
    return pairCreatedEvents[0].args.pair;
};
exports.createUniswapV2Pair = createUniswapV2Pair;
//# sourceMappingURL=UniswapV2Factory.js.map