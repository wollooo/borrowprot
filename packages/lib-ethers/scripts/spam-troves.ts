import WebSocket from "ws";
import { TransactionResponse } from "@ethersproject/abstract-provider";
import { JsonRpcProvider } from "@ethersproject/providers";
import { Wallet } from "@ethersproject/wallet";

import { ethers } from 'ethers';


var contractAbiFragment = [
  {
    "name": "transfer",
    "type": "function",
    "inputs": [
      {
        "name": "_to",
        "type": "address"
      },
      {
        "type": "uint256",
        "name": "_tokens"
      }
    ],
    "constant": false,
    "outputs": [],
    "payable": false
  }
];



import { Decimal, KUSD_MINIMUM_DEBT, Trove, ASSET_TOKENS } from "@kumodao/lib-base";
import { EthersKumo, EthersKumoWithStore, BlockPolledKumoStore } from "@kumodao/lib-ethers";

import {
  Batched,
  BatchedProvider,
  WebSocketAugmented,
  WebSocketAugmentedProvider
} from "@kumodao/providers";

const BatchedWebSocketAugmentedJsonRpcProvider = Batched(WebSocketAugmented(JsonRpcProvider));

Object.assign(globalThis, { WebSocket });

const numberOfTrovesToCreate = 25;
const collateralRatioStart = Decimal.from(2);
const collateralRatioStep = Decimal.from(1e-6);
const funderKey = "0x60ddFE7f579aB6867cbE7A2Dc03853dC141d7A4aB6DBEFc0Dae2d2B1Bd4e487F";

const DEBT_MULITIPLIER = 5

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

const createTrove = async (nominalCollateralRatio: Decimal, assetAddress: string) => {
  const randomWallet = Wallet.createRandom().connect(provider);

  const debt = KUSD_MINIMUM_DEBT.mul(1);
  const collateral = debt.mul(nominalCollateralRatio);

  // debt for base prices 10 and 15 and collateral Ratio 200 and 300
  const debtForBasePrices = debt.mul(DEBT_MULITIPLIER).mul(nominalCollateralRatio)

  var mockERC20contract = new ethers.Contract(assetAddress, contractAbiFragment, funder);

  // Send tokens
  await mockERC20contract.transfer(randomWallet.address, collateral.hex).then(waitForSuccess);


  await kumo.populate
    .openTrove(
      Trove.recreate(new Trove(collateral, debtForBasePrices)),
      assetAddress,
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
    const nominalCollateralRatio = collateralRatio

    await createTrove(nominalCollateralRatio, ASSET_TOKENS.ctx.assetAddress);
 
    await createTrove(nominalCollateralRatio, ASSET_TOKENS.cty.assetAddress);

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