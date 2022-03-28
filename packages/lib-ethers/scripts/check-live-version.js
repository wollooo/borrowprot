"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
require("colors");
const compareDeployedVersionsTo = (version) => {
    let match = true;
    const deployments = fs_1.default
        .readdirSync("deployments", { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(deploymentDir => fs_1.default
        .readdirSync(path_1.default.join("deployments", deploymentDir.name), { withFileTypes: true })
        .filter(dirent => dirent.isFile() && dirent.name.match(/\.json$/) && dirent.name !== "dev.json")
        .map(deployment => path_1.default.join("deployments", deploymentDir.name, deployment.name)))
        .reduce((flattenedArray, array) => flattenedArray.concat(array), []);
    for (const deploymentJson of deployments) {
        const deployment = JSON.parse(fs_1.default.readFileSync(deploymentJson).toString());
        if (deployment.version !== version) {
            console.error(`${deploymentJson} has version ${deployment.version}`.red);
            match = false;
        }
    }
    return match;
};
const savedLiveVersion = fs_1.default.readFileSync(path_1.default.join("live", "version")).toString().trim();
console.log(`Saved live version: ${savedLiveVersion}`.cyan);
if (compareDeployedVersionsTo(savedLiveVersion)) {
    console.log("All deployments match saved version.");
}
else {
    console.error(("All deployments must have the same version, " +
        "and it must match the saved version in 'packages/lib/live/artifacts'.").red);
    process.exitCode = 1;
}
//# sourceMappingURL=check-live-version.js.map