"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = __importDefault(require("ws"));
const providers_1 = require("@ethersproject/providers");
const wallet_1 = require("@ethersproject/wallet");
const lib_base_1 = require("@liquity/lib-base");
const lib_ethers_1 = require("@liquity/lib-ethers");
const providers_2 = require("@liquity/providers");
const BatchedWebSocketAugmentedJsonRpcProvider = providers_2.Batched(providers_2.WebSocketAugmented(providers_1.JsonRpcProvider));
Object.assign(globalThis, { WebSocket: ws_1.default });
const numberOfTrovesToCreate = 1000;
const collateralRatioStart = lib_base_1.Decimal.from(2);
const collateralRatioStep = lib_base_1.Decimal.from(1e-6);
const funderKey = "0x4d5db4107d237df6a3d58ee5f70ae63d73d7658d4026f2eefd2f204c81682cb7";
let provider;
let funder;
let liquity;
const waitForSuccess = (tx) => tx.wait().then(receipt => {
    if (!receipt.status) {
        throw new Error("Transaction failed");
    }
    return receipt;
});
const createTrove = async (nominalCollateralRatio) => {
    const randomWallet = wallet_1.Wallet.createRandom().connect(provider);
    const debt = lib_base_1.LUSD_MINIMUM_DEBT.mul(2);
    const collateral = debt.mul(nominalCollateralRatio);
    await funder
        .sendTransaction({
        to: randomWallet.address,
        value: collateral.hex
    })
        .then(waitForSuccess);
    await liquity.populate
        .openTrove(lib_base_1.Trove.recreate(new lib_base_1.Trove(collateral, debt), liquity.store.state.borrowingRate), {}, { from: randomWallet.address })
        .then(tx => randomWallet.signTransaction(tx.rawPopulatedTransaction))
        .then(tx => provider.sendTransaction(tx))
        .then(waitForSuccess);
};
const runLoop = async () => {
    for (let i = 0; i < numberOfTrovesToCreate; ++i) {
        const collateralRatio = collateralRatioStep.mul(i).add(collateralRatioStart);
        const nominalCollateralRatio = collateralRatio.div(liquity.store.state.price);
        await createTrove(nominalCollateralRatio);
        if ((i + 1) % 10 == 0) {
            console.log(`Created ${i + 1} Troves.`);
        }
    }
};
const main = async () => {
    provider = new BatchedWebSocketAugmentedJsonRpcProvider();
    funder = new wallet_1.Wallet(funderKey, provider);
    const network = await provider.getNetwork();
    provider.chainId = network.chainId;
    provider.openWebSocket(provider.connection.url.replace(/^http/i, "ws").replace("8545", "8546"), network);
    liquity = await lib_ethers_1.EthersLiquity.connect(provider, { useStore: "blockPolled" });
    let stopStore;
    return new Promise(resolve => {
        liquity.store.onLoaded = resolve;
        stopStore = liquity.store.start();
    })
        .then(runLoop)
        .then(() => {
        stopStore();
        provider.closeWebSocket();
    });
};
main().catch(err => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=spam-troves.js.map