import { Signer } from "@ethersproject/abstract-signer";
import { ContractFactory, Overrides } from "@ethersproject/contracts";
import { _LiquityDeploymentJSON } from "../src/contracts";
export declare const log: (...args: unknown[]) => void;
export declare const setSilent: (s: boolean) => void;
export declare const deployTellorCaller: (deployer: Signer, getContractFactory: (name: string, signer: Signer) => Promise<ContractFactory>, tellorAddress: string, overrides?: Overrides | undefined) => Promise<string>;
export declare const deployAndSetupContracts: (deployer: Signer, getContractFactory: (name: string, signer: Signer) => Promise<ContractFactory>, _priceFeedIsTestnet?: boolean, _isDev?: boolean, wethAddress?: string | undefined, overrides?: Overrides | undefined) => Promise<_LiquityDeploymentJSON>;
//# sourceMappingURL=deploy.d.ts.map