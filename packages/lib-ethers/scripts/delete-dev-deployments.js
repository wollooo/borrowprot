"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const deploymentsDir = "deployments";
const devDeploymentName = "dev.json";
const exists = (file) => fs_1.default.existsSync(file) && fs_1.default.lstatSync(file).isFile();
const devDeployments = () => fs_1.default
    .readdirSync(deploymentsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && dirent.name !== "backfill")
    .map(deploymentDir => path_1.default.join(deploymentsDir, deploymentDir.name, devDeploymentName))
    .concat(path_1.default.join(deploymentsDir, devDeploymentName))
    .filter(exists);
devDeployments().forEach(devDeployment => fs_1.default.unlinkSync(devDeployment));
//# sourceMappingURL=delete-dev-deployments.js.map