"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const artifactsDir = path_1.default.join("..", "contracts", "artifacts");
const contractsDir = path_1.default.join(artifactsDir, "contracts");
const liveDir = "live";
// *.json, except *.dbg.json
const jsonFileFilter = /(?<!\.dbg)\.json$/;
const recursivelyListFilesInDir = (dir) => fs_extra_1.default
    .readdirSync(dir, { withFileTypes: true })
    .flatMap(dirent => dirent.isDirectory()
    ? recursivelyListFilesInDir(path_1.default.join(dir, dirent.name))
    : [[dir, dirent.name]]);
const jsonFiles = recursivelyListFilesInDir(contractsDir).filter(([, file]) => jsonFileFilter.test(file));
fs_extra_1.default.removeSync(liveDir);
fs_extra_1.default.mkdirSync(liveDir);
fs_extra_1.default.copyFileSync(path_1.default.join(artifactsDir, "version"), path_1.default.join(liveDir, "version"));
jsonFiles.forEach(([dir, file]) => fs_extra_1.default.copyFileSync(path_1.default.join(dir, file), path_1.default.join(liveDir, file)));
//# sourceMappingURL=save-live-version.js.map