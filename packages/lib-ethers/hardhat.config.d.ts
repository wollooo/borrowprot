import "colors";
import { Signer } from "@ethersproject/abstract-signer";
import { Overrides } from "@ethersproject/contracts";
import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import { _LiquityDeploymentJSON } from "./src/contracts";
declare const config: HardhatUserConfig;
declare module "hardhat/types/runtime" {
    interface HardhatRuntimeEnvironment {
        deployLiquity: (deployer: Signer, useRealPriceFeed?: boolean, wethAddress?: string, overrides?: Overrides) => Promise<_LiquityDeploymentJSON>;
    }
}
export default config;
//# sourceMappingURL=hardhat.config.d.ts.map