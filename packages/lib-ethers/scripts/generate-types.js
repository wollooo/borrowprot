"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const abi_1 = require("@ethersproject/abi");
const ActivePool_json_1 = __importDefault(require("../../contracts/artifacts/contracts/ActivePool.sol/ActivePool.json"));
const BorrowerOperations_json_1 = __importDefault(require("../../contracts/artifacts/contracts/BorrowerOperations.sol/BorrowerOperations.json"));
const CollSurplusPool_json_1 = __importDefault(require("../../contracts/artifacts/contracts/CollSurplusPool.sol/CollSurplusPool.json"));
const CommunityIssuance_json_1 = __importDefault(require("../../contracts/artifacts/contracts/LQTY/CommunityIssuance.sol/CommunityIssuance.json"));
const DefaultPool_json_1 = __importDefault(require("../../contracts/artifacts/contracts/DefaultPool.sol/DefaultPool.json"));
const ERC20Mock_json_1 = __importDefault(require("../../contracts/artifacts/contracts/LPRewards/TestContracts/ERC20Mock.sol/ERC20Mock.json"));
const GasPool_json_1 = __importDefault(require("../../contracts/artifacts/contracts/GasPool.sol/GasPool.json"));
const HintHelpers_json_1 = __importDefault(require("../../contracts/artifacts/contracts/HintHelpers.sol/HintHelpers.json"));
const IERC20_json_1 = __importDefault(require("../../contracts/artifacts/@openzeppelin/contracts/token/ERC20/IERC20.sol/IERC20.json"));
const LockupContractFactory_json_1 = __importDefault(require("../../contracts/artifacts/contracts/LQTY/LockupContractFactory.sol/LockupContractFactory.json"));
const LUSDToken_json_1 = __importDefault(require("../../contracts/artifacts/contracts/LUSDToken.sol/LUSDToken.json"));
const LQTYStaking_json_1 = __importDefault(require("../../contracts/artifacts/contracts/LQTY/LQTYStaking.sol/LQTYStaking.json"));
const LQTYToken_json_1 = __importDefault(require("../../contracts/artifacts/contracts/LQTY/LQTYToken.sol/LQTYToken.json"));
const MultiTroveGetter_json_1 = __importDefault(require("../../contracts/artifacts/contracts/MultiTroveGetter.sol/MultiTroveGetter.json"));
const PriceFeed_json_1 = __importDefault(require("../../contracts/artifacts/contracts/PriceFeed.sol/PriceFeed.json"));
const PriceFeedTestnet_json_1 = __importDefault(require("../../contracts/artifacts/contracts/TestContracts/PriceFeedTestnet.sol/PriceFeedTestnet.json"));
const SortedTroves_json_1 = __importDefault(require("../../contracts/artifacts/contracts/SortedTroves.sol/SortedTroves.json"));
const StabilityPool_json_1 = __importDefault(require("../../contracts/artifacts/contracts/StabilityPool.sol/StabilityPool.json"));
const TroveManager_json_1 = __importDefault(require("../../contracts/artifacts/contracts/TroveManager.sol/TroveManager.json"));
const Unipool_json_1 = __importDefault(require("../../contracts/artifacts/contracts/LPRewards/Unipool.sol/Unipool.json"));
const KumoParameters_json_1 = __importDefault(require("../../contracts/artifacts/contracts/KumoParameters.sol/KumoParameters.json"));
const getTupleType = (components, flexible) => {
    if (components.every(component => component.name)) {
        return ("{ " +
            components.map(component => `${component.name}: ${getType(component, flexible)}`).join("; ") +
            " }");
    }
    else {
        return `[${components.map(component => getType(component, flexible)).join(", ")}]`;
    }
};
const getType = ({ baseType, components, arrayChildren }, flexible) => {
    switch (baseType) {
        case "address":
        case "string":
            return "string";
        case "bool":
            return "boolean";
        case "array":
            return `${getType(arrayChildren, flexible)}[]`;
        case "tuple":
            return getTupleType(components, flexible);
    }
    if (baseType.startsWith("bytes")) {
        return flexible ? "BytesLike" : "string";
    }
    const match = baseType.match(/^(u?int)([0-9]+)$/);
    if (match) {
        return flexible ? "BigNumberish" : parseInt(match[2]) >= 53 ? "BigNumber" : "number";
    }
    throw new Error(`unimplemented type ${baseType}`);
};
const declareInterface = ({ contractName, interface: { events, functions } }) => [
    `interface ${contractName}Calls {`,
    ...Object.values(functions)
        .filter(({ constant }) => constant)
        .map(({ name, inputs, outputs }) => {
        const params = [
            ...inputs.map((input, i) => `${input.name || "arg" + i}: ${getType(input, true)}`),
            `_overrides?: CallOverrides`
        ];
        let returnType;
        if (!outputs || outputs.length == 0) {
            returnType = "void";
        }
        else if (outputs.length === 1) {
            returnType = getType(outputs[0], false);
        }
        else {
            returnType = getTupleType(outputs, false);
        }
        return `  ${name}(${params.join(", ")}): Promise<${returnType}>;`;
    }),
    "}\n",
    `interface ${contractName}Transactions {`,
    ...Object.values(functions)
        .filter(({ constant }) => !constant)
        .map(({ name, payable, inputs, outputs }) => {
        const overridesType = payable ? "PayableOverrides" : "Overrides";
        const params = [
            ...inputs.map((input, i) => `${input.name || "arg" + i}: ${getType(input, true)}`),
            `_overrides?: ${overridesType}`
        ];
        let returnType;
        if (!outputs || outputs.length == 0) {
            returnType = "void";
        }
        else if (outputs.length === 1) {
            returnType = getType(outputs[0], false);
        }
        else {
            returnType = getTupleType(outputs, false);
        }
        return `  ${name}(${params.join(", ")}): Promise<${returnType}>;`;
    }),
    "}\n",
    `export interface ${contractName}`,
    `  extends _TypedLiquityContract<${contractName}Calls, ${contractName}Transactions> {`,
    "  readonly filters: {",
    ...Object.values(events).map(({ name, inputs }) => {
        const params = inputs.map(input => `${input.name}?: ${input.indexed ? `${getType(input, true)} | null` : "null"}`);
        return `    ${name}(${params.join(", ")}): EventFilter;`;
    }),
    "  };",
    ...Object.values(events).map(({ name, inputs }) => `  extractEvents(logs: Log[], name: "${name}"): _TypedLogDescription<${getTupleType(inputs, false)}>[];`),
    "}"
].join("\n");
const contractArtifacts = [
    ActivePool_json_1.default,
    BorrowerOperations_json_1.default,
    CollSurplusPool_json_1.default,
    CommunityIssuance_json_1.default,
    DefaultPool_json_1.default,
    ERC20Mock_json_1.default,
    GasPool_json_1.default,
    HintHelpers_json_1.default,
    IERC20_json_1.default,
    LockupContractFactory_json_1.default,
    LUSDToken_json_1.default,
    LQTYStaking_json_1.default,
    LQTYToken_json_1.default,
    MultiTroveGetter_json_1.default,
    PriceFeed_json_1.default,
    PriceFeedTestnet_json_1.default,
    SortedTroves_json_1.default,
    StabilityPool_json_1.default,
    TroveManager_json_1.default,
    Unipool_json_1.default,
    KumoParameters_json_1.default
];
const contracts = contractArtifacts.map(({ contractName, abi }) => ({
    contractName,
    interface: new abi_1.Interface(abi)
}));
const output = `
import { BigNumber, BigNumberish } from "@ethersproject/bignumber";
import { Log } from "@ethersproject/abstract-provider";
import { BytesLike } from "@ethersproject/bytes";
import {
  Overrides,
  CallOverrides,
  PayableOverrides,
  EventFilter
} from "@ethersproject/contracts";

import { _TypedLiquityContract, _TypedLogDescription } from "../src/contracts";

${contracts.map(declareInterface).join("\n\n")}
`;
fs_extra_1.default.mkdirSync("types", { recursive: true });
fs_extra_1.default.writeFileSync(path_1.default.join("types", "index.ts"), output);
fs_extra_1.default.removeSync("abi");
fs_extra_1.default.mkdirSync("abi", { recursive: true });
contractArtifacts.forEach(({ contractName, abi }) => fs_extra_1.default.writeFileSync(path_1.default.join("abi", `${contractName}.json`), JSON.stringify(abi, undefined, 2)));
//# sourceMappingURL=generate-types.js.map