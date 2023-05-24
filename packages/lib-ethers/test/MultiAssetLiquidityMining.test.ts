import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import chaiSpies from "chai-spies";
import { Signer } from "@ethersproject/abstract-signer";
import { ethers, network, deployKumo } from "hardhat";

import {
    _redeemMaxIterations
} from "../src/PopulatableEthersKumo";

import { _KumoDeploymentJSON } from "../src/contracts";
import { _connectToDeployment } from "../src/EthersKumoConnection";
import { EthersKumo } from "../src/EthersKumo";
import { connectToDeployment, connectUsers, increaseTime, setUpInitialUserBalance } from "../testUtils";
import { mockAssetContracts } from "../testUtils/types";
import { BigNumber } from "ethers";
import { STARTING_BALANCE } from "../testUtils/constants";


chai.use(chaiAsPromised);
chai.use(chaiSpies);


describe("EthersKumoMining", async () => {
    let deployer: Signer;
    let funder: Signer;
    let user: Signer;
    let otherUsers: Signer[];

    let deployment: _KumoDeploymentJSON;

    let deployerKumo: EthersKumo;
    let kumo: EthersKumo;


    let mockAssetAddress: string;
    const gasLimit = BigNumber.from(2500000);


    mockAssetContracts.forEach(async mockAssetContract => {
        describe(`Liquidity mining Multi Asset Independent tests ${mockAssetContract.name}`, function () {
            before(async function () {
                [deployer, funder, user, ...otherUsers] = await ethers.getSigners();
                deployment = await deployKumo(deployer);
                mockAssetAddress = deployment.addresses[mockAssetContract.contract];

                kumo = await connectToDeployment(deployment, user);
                expect(kumo).to.be.an.instanceOf(EthersKumo);

                [deployerKumo, kumo] = await connectUsers(deployment, [deployer, user]);
            });

             // Always setup same initial balance for user
            beforeEach(async () => {
                const targetBalance = BigNumber.from(STARTING_BALANCE.hex);

                await setUpInitialUserBalance(user, funder, gasLimit);
                expect(`${await user.getBalance()}`).to.equal(`${targetBalance}`);
            });

            const someUniTokens = 1000;

            it(`should obtain some UNI LP tokens ${mockAssetContract.name}`, async () => {
                await kumo._mintUniToken(someUniTokens);

                const uniTokenBalance = await kumo.getUniTokenBalance();
                expect(`${uniTokenBalance}`).to.equal(`${someUniTokens}`);
            });

            it(`should fail to stake UNI LP before approving the spend ${mockAssetContract.name}`, async () => {
                await expect(kumo.stakeUniTokens(someUniTokens)).to.eventually.be.rejected;
            });

            it(`should stake UNI LP after approving the spend ${mockAssetContract.name}`, async () => {
                const initialAllowance = await kumo.getUniTokenAllowance();
                expect(`${initialAllowance}`).to.equal("0");

                await kumo.approveUniTokens();

                const newAllowance = await kumo.getUniTokenAllowance();
                expect(newAllowance.isZero).to.be.false;

                await kumo.stakeUniTokens(someUniTokens);

                const uniTokenBalance = await kumo.getUniTokenBalance();
                expect(`${uniTokenBalance}`).to.equal("0");

                const stake = await kumo.getLiquidityMiningStake();
                expect(`${stake}`).to.equal(`${someUniTokens}`);
            });

            it(`should have an KUMO reward after some time has passed ${mockAssetContract.name}`, async function () {
                this.timeout("20s");

                // Liquidity mining rewards are seconds-based, so we don't need to wait long.
                // By actually waiting in real time, we avoid using increaseTime(), which only works on
                // Hardhat EVM.
                await new Promise(resolve => setTimeout(resolve, 4000));

                // Trigger a new block with a dummy TX.
                await kumo._mintUniToken(0);

                const kumoReward = Number(await kumo.getLiquidityMiningKUMOReward());
                expect(kumoReward).to.be.at.least(1); // ~0.2572 per second [(4e6/3) / (60*24*60*60)]

                await kumo.withdrawKUMORewardFromLiquidityMining();
                const kumoBalance = Number(await kumo.getKUMOBalance());
                expect(kumoBalance).to.be.at.least(kumoReward); // may have increased since checking
            });

            it(`should partially unstake ${mockAssetContract.name}`, async () => {
                await kumo.unstakeUniTokens(someUniTokens / 2);

                const uniTokenStake = await kumo.getLiquidityMiningStake();
                expect(`${uniTokenStake}`).to.equal(`${someUniTokens / 2}`);

                const uniTokenBalance = await kumo.getUniTokenBalance();
                expect(`${uniTokenBalance}`).to.equal(`${someUniTokens / 2}`);
            });

            it(`should unstake remaining tokens and withdraw remaining KUMO reward ${mockAssetContract.name}`, async () => {
                await new Promise(resolve => setTimeout(resolve, 1000));
                await kumo._mintUniToken(0); // dummy block
                await kumo.exitLiquidityMining();

                const uniTokenStake = await kumo.getLiquidityMiningStake();
                expect(`${uniTokenStake}`).to.equal("0");

                const kumoReward = await kumo.getLiquidityMiningKUMOReward();
                expect(`${kumoReward}`).to.equal("0");

                const uniTokenBalance = await kumo.getUniTokenBalance();
                expect(`${uniTokenBalance}`).to.equal(`${someUniTokens}`);
            });

            it(`should have no more rewards after the mining period is over ${mockAssetContract.name}`, async function () {
                if (network.name !== "hardhat") {
                    // increaseTime() only works on Hardhat EVM
                    this.skip();
                }

                await kumo.stakeUniTokens(someUniTokens);
                await increaseTime(2 * 30 * 24 * 60 * 60);
                await kumo.exitLiquidityMining();

                const remainingKUMOReward = await kumo.getRemainingLiquidityMiningKUMOReward();
                expect(`${remainingKUMOReward}`).to.equal("0");

                const kumoBalance = Number(await kumo.getKUMOBalance());
                expect(kumoBalance).to.be.within(1333333, 1333334);
            });
        });
    })
});

