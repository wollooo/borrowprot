"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const outputDir = "deployments";
const inputDir = (channel) => path_1.default.join("deployments", channel);
const backfillChannel = "backfill";
const defaultChannel = "default";
const exists = (dir) => {
    return fs_1.default.existsSync(dir) && fs_1.default.lstatSync(dir).isDirectory();
};
const copyDeploymentsFrom = (deploymentsDir) => {
    const deployments = fs_1.default.readdirSync(deploymentsDir);
    for (const deployment of deployments) {
        fs_1.default.copyFileSync(path_1.default.join(deploymentsDir, deployment), path_1.default.join(outputDir, deployment));
    }
};
console.log(`Deployment channel: ${(_a = process.env.CHANNEL) !== null && _a !== void 0 ? _a : "default"}`);
copyDeploymentsFrom(inputDir(backfillChannel));
copyDeploymentsFrom(inputDir(defaultChannel));
if (process.env.CHANNEL && process.env.CHANNEL !== defaultChannel) {
    const channelDir = inputDir(process.env.CHANNEL);
    if (exists(channelDir)) {
        copyDeploymentsFrom(channelDir);
    }
}
//# sourceMappingURL=copy-deployments.js.map