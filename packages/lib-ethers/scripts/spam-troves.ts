import WebSocket from "ws";
import { TransactionResponse } from "@ethersproject/abstract-provider";
import { JsonRpcProvider } from "@ethersproject/providers";
import { Wallet } from "@ethersproject/wallet";

import { Decimal, KUSD_MINIMUM_DEBT, Trove } from "@kumo/lib-base";
import { EthersKumo, EthersKumoWithStore, BlockPolledKumoStore } from "@kumo/lib-ethers";

import {
  Batched,
  BatchedProvider,
  WebSocketAugmented,
  WebSocketAugmentedProvider
} from "@kumo/providers";

const BatchedWebSocketAugmentedJsonRpcProvider = Batched(WebSocketAugmented(JsonRpcProvider));

Object.assign(globalThis, { WebSocket });

const numberOfTrovesToCreate = 1000;
const collateralRatioStart = Decimal.from(2);
const collateralRatioStep = Decimal.from(1e-6);
const funderKey = "0x4d5db4107d237df6a3d58ee5f70ae63d73d7658d4026f2eefd2f204c81682cb7";

let provider: BatchedProvider & WebSocketAugmentedProvider & JsonRpcProvider;
let funder: Wallet;
let kumo: EthersKumoWithStore<BlockPolledKumoStore>;

const waitForSuccess = (tx: TransactionResponse) =>
  tx.wait().then(receipt => {
    if (!receipt.status) {
      throw new Error("Transaction failed");
    }
    return receipt;
  });

const createTrove = async (nominalCollateralRatio: Decimal) => {
  const randomWallet = Wallet.createRandom().connect(provider);

  const debt = KUSD_MINIMUM_DEBT.mul(2);
  const collateral = debt.mul(nominalCollateralRatio);

  await funder
    .sendTransaction({
      to: randomWallet.address,
      value: collateral.hex
    })
    .then(waitForSuccess);

  await kumo.populate
    .openTrove(
      Trove.recreate(new Trove(collateral, debt), kumo.store.state.borrowingRate),
      {},
      { from: randomWallet.address }
    )
    .then(tx => randomWallet.signTransaction(tx.rawPopulatedTransaction))
    .then(tx => provider.sendTransaction(tx))
    .then(waitForSuccess);
};

const runLoop = async () => {
  for (let i = 0; i < numberOfTrovesToCreate; ++i) {
    const collateralRatio = collateralRatioStep.mul(i).add(collateralRatioStart);
    const nominalCollateralRatio = collateralRatio.div(kumo.store.state.price);

    await createTrove(nominalCollateralRatio);

    if ((i + 1) % 10 == 0) {
      console.log(`Created ${i + 1} Troves.`);
    }
  }
};

const main = async () => {
  provider = new BatchedWebSocketAugmentedJsonRpcProvider();
  funder = new Wallet(funderKey, provider);

  const network = await provider.getNetwork();

  provider.chainId = network.chainId;
  provider.openWebSocket(
    provider.connection.url.replace(/^http/i, "ws").replace("8545", "8546"),
    network
  );

  kumo = await EthersKumo.connect(provider, { useStore: "blockPolled" });

  let stopStore: () => void;

  return new Promise<void>(resolve => {
    kumo.store.onLoaded = resolve;
    stopStore = kumo.store.start();
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
