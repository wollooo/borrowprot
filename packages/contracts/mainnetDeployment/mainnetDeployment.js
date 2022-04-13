const { UniswapV2Factory } = require("./ABIs/UniswapV2Factory.js")
const { UniswapV2Pair } = require("./ABIs/UniswapV2Pair.js")
const { UniswapV2Router02 } = require("./ABIs/UniswapV2Router02.js")
const { ChainlinkAggregatorV3Interface } = require("./ABIs/ChainlinkAggregatorV3Interface.js")
const { TestHelper: th, TimeValues: timeVals } = require("../utils/testHelpers.js")
const { dec } = th
const MainnetDeploymentHelper = require("../utils/mainnetDeploymentHelpers.js")
const toBigNum = ethers.BigNumber.from

async function mainnetDeploy(configParams) {
  const date = new Date()
  console.log(date.toUTCString())
  const deployerWallet = (await ethers.getSigners())[0]
  // const account2Wallet = (await ethers.getSigners())[1]
  const mdh = new MainnetDeploymentHelper(configParams, deployerWallet)
  const gasPrice = configParams.GAS_PRICE

  const deploymentState = mdh.loadPreviousDeployment()

  console.log(`deployer address: ${deployerWallet.address}`)
  assert.equal(deployerWallet.address, configParams.kumoAddrs.DEPLOYER)
  // assert.equal(account2Wallet.address, configParams.beneficiaries.ACCOUNT_2)
  let deployerETHBalance = await ethers.provider.getBalance(deployerWallet.address)
  console.log(`deployerETHBalance before: ${deployerETHBalance}`)

  // Get UniswapV2Factory instance at its deployed address
  const uniswapV2Factory = new ethers.Contract(
    configParams.externalAddrs.UNISWAP_V2_FACTORY,
    UniswapV2Factory.abi,
    deployerWallet
  )

  console.log(`Uniswp addr: ${uniswapV2Factory.address}`)
  const uniAllPairsLength = await uniswapV2Factory.allPairsLength()
  console.log(`Uniswap Factory number of pairs: ${uniAllPairsLength}`)

  deployerETHBalance = await ethers.provider.getBalance(deployerWallet.address)
  console.log(`deployer's ETH balance before deployments: ${deployerETHBalance}`)

  // Deploy core logic contracts
  const kumoCore = await mdh.deployKumoCoreMainnet(configParams.externalAddrs.TELLOR_MASTER, deploymentState)
  await mdh.logContractObjects(kumoCore)

  // Check Uniswap Pair KUSD-ETH pair before pair creation
  let KUSDWETHPairAddr = await uniswapV2Factory.getPair(kumoCore.kusdToken.address, configParams.externalAddrs.WETH_ERC20)
  let WETHKUSDPairAddr = await uniswapV2Factory.getPair(configParams.externalAddrs.WETH_ERC20, kumoCore.kusdToken.address)
  assert.equal(KUSDWETHPairAddr, WETHKUSDPairAddr)


  if (KUSDWETHPairAddr == th.ZERO_ADDRESS) {
    // Deploy Unipool for KUSD-WETH
    await mdh.sendAndWaitForTransaction(uniswapV2Factory.createPair(
      configParams.externalAddrs.WETH_ERC20,
      kumoCore.kusdToken.address,
      { gasPrice }
    ))

    // Check Uniswap Pair KUSD-WETH pair after pair creation (forwards and backwards should have same address)
    KUSDWETHPairAddr = await uniswapV2Factory.getPair(kumoCore.kusdToken.address, configParams.externalAddrs.WETH_ERC20)
    assert.notEqual(KUSDWETHPairAddr, th.ZERO_ADDRESS)
    WETHKUSDPairAddr = await uniswapV2Factory.getPair(configParams.externalAddrs.WETH_ERC20, kumoCore.kusdToken.address)
    console.log(`KUSD-WETH pair contract address after Uniswap pair creation: ${KUSDWETHPairAddr}`)
    assert.equal(WETHKUSDPairAddr, KUSDWETHPairAddr)
  }

  // Deploy Unipool
  const unipool = await mdh.deployUnipoolMainnet(deploymentState)

  // Deploy KUMO Contracts
  const KUMOContracts = await mdh.deployKUMOContractsMainnet(
    configParams.kumoAddrs.GENERAL_SAFE, // bounty address
    unipool.address,  // lp rewards address
    configParams.kumoAddrs.KUMO_SAFE, // multisig KUMO endowment address
    deploymentState,
  )

  // Connect all core contracts up
  await mdh.connectCoreContractsMainnet(kumoCore, KUMOContracts, configParams.externalAddrs.CHAINLINK_ETHUSD_PROXY)
  await mdh.connectKUMOContractsMainnet(KUMOContracts)
  await mdh.connectKUMOContractsToCoreMainnet(KUMOContracts, kumoCore)

  // Deploy a read-only multi-trove getter
  const multiTroveGetter = await mdh.deployMultiTroveGetterMainnet(kumoCore, deploymentState)

  // Connect Unipool to KUMOToken and the KUSD-WETH pair address, with a 6 week duration
  const LPRewardsDuration = timeVals.SECONDS_IN_SIX_WEEKS
  await mdh.connectUnipoolMainnet(unipool, KUMOContracts, KUSDWETHPairAddr, LPRewardsDuration)

  // Log KUMO and Unipool addresses
  await mdh.logContractObjects(KUMOContracts)
  console.log(`Unipool address: ${unipool.address}`)
  
  // let latestBlock = await ethers.provider.getBlockNumber()
  let deploymentStartTime = await KUMOContracts.kumoToken.getDeploymentStartTime()

  console.log(`deployment start time: ${deploymentStartTime}`)
  const oneYearFromDeployment = (Number(deploymentStartTime) + timeVals.SECONDS_IN_ONE_YEAR).toString()
  console.log(`time oneYearFromDeployment: ${oneYearFromDeployment}`)

  // Deploy LockupContracts - one for each beneficiary
  const lockupContracts = {}

  for (const [investor, investorAddr] of Object.entries(configParams.beneficiaries)) {
    const lockupContractEthersFactory = await ethers.getContractFactory("LockupContract", deployerWallet)
    if (deploymentState[investor] && deploymentState[investor].address) {
      console.log(`Using previously deployed ${investor} lockup contract at address ${deploymentState[investor].address}`)
      lockupContracts[investor] = new ethers.Contract(
        deploymentState[investor].address,
        lockupContractEthersFactory.interface,
        deployerWallet
      )
    } else {
      const txReceipt = await mdh.sendAndWaitForTransaction(KUMOContracts.lockupContractFactory.deployLockupContract(investorAddr, oneYearFromDeployment, { gasPrice }))

      const address = await txReceipt.logs[0].address // The deployment event emitted from the LC itself is is the first of two events, so this is its address 
      lockupContracts[investor] = new ethers.Contract(
        address,
        lockupContractEthersFactory.interface,
        deployerWallet
      )

      deploymentState[investor] = {
        address: address,
        txHash: txReceipt.transactionHash
      }

      mdh.saveDeployment(deploymentState)
    }

    const kumoTokenAddr = KUMOContracts.kumoToken.address
    // verify
    if (configParams.ETHERSCAN_BASE_URL) {
      await mdh.verifyContract(investor, deploymentState, [kumoTokenAddr, investorAddr, oneYearFromDeployment])
    }
  }

  // // --- TESTS AND CHECKS  ---

  // Deployer repay KUSD
  // console.log(`deployer trove debt before repaying: ${await kumoCore.troveManager.getTroveDebt(deployerWallet.address)}`)
 // await mdh.sendAndWaitForTransaction(kumoCore.borrowerOperations.repayKUSD(dec(800, 18), th.ZERO_ADDRESS, th.ZERO_ADDRESS, {gasPrice, gasLimit: 1000000}))
  // console.log(`deployer trove debt after repaying: ${await kumoCore.troveManager.getTroveDebt(deployerWallet.address)}`)
  
  // Deployer add coll
  // console.log(`deployer trove coll before adding coll: ${await kumoCore.troveManager.getTroveColl(deployerWallet.address)}`)
  // await mdh.sendAndWaitForTransaction(kumoCore.borrowerOperations.addColl(th.ZERO_ADDRESS, th.ZERO_ADDRESS, {value: dec(2, 'ether'), gasPrice, gasLimit: 1000000}))
  // console.log(`deployer trove coll after addingColl: ${await kumoCore.troveManager.getTroveColl(deployerWallet.address)}`)
  
  // Check chainlink proxy price ---

  const chainlinkProxy = new ethers.Contract(
    configParams.externalAddrs.CHAINLINK_ETHUSD_PROXY,
    ChainlinkAggregatorV3Interface,
    deployerWallet
  )

  // Get latest price
  let chainlinkPrice = await chainlinkProxy.latestAnswer()
  console.log(`current Chainlink price: ${chainlinkPrice}`)

  // Check Tellor price directly (through our TellorCaller)
  let tellorPriceResponse = await kumoCore.tellorCaller.getTellorCurrentValue(1) // id == 1: the ETH-USD request ID
  console.log(`current Tellor price: ${tellorPriceResponse[1]}`)
  console.log(`current Tellor timestamp: ${tellorPriceResponse[2]}`)

  // // --- Lockup Contracts ---
  console.log("LOCKUP CONTRACT CHECKS")
  // Check lockup contracts exist for each beneficiary with correct unlock time
  for (investor of Object.keys(lockupContracts)) {
    const lockupContract = lockupContracts[investor]
    // check LC references correct KUMOToken 
    const storedKUMOTokenAddr = await lockupContract.kumoToken()
    assert.equal(KUMOContracts.kumoToken.address, storedKUMOTokenAddr)
    // Check contract has stored correct beneficary
    const onChainBeneficiary = await lockupContract.beneficiary()
    assert.equal(configParams.beneficiaries[investor].toLowerCase(), onChainBeneficiary.toLowerCase())
    // Check correct unlock time (1 yr from deployment)
    const unlockTime = await lockupContract.unlockTime()
    assert.equal(oneYearFromDeployment, unlockTime)

    console.log(
      `lockupContract addr: ${lockupContract.address},
            stored KUMOToken addr: ${storedKUMOTokenAddr}
            beneficiary: ${investor},
            beneficiary addr: ${configParams.beneficiaries[investor]},
            on-chain beneficiary addr: ${onChainBeneficiary},
            unlockTime: ${unlockTime}
            `
    )
  }

  // // --- Check correct addresses set in KUMOToken
  // console.log("STORED ADDRESSES IN KUMO TOKEN")
  // const storedMultisigAddress = await KUMOContracts.kumoToken.multisigAddress()
  // assert.equal(configParams.kumoAddrs.KUMO_SAFE.toLowerCase(), storedMultisigAddress.toLowerCase())
  // console.log(`multi-sig address stored in KUMOToken : ${th.squeezeAddr(storedMultisigAddress)}`)
  // console.log(`KUMO Safe address: ${th.squeezeAddr(configParams.kumoAddrs.KUMO_SAFE)}`)

  // // --- KUMO allowances of different addresses ---
  // console.log("INITIAL KUMO BALANCES")
  // // Unipool
  // const unipoolKUMOBal = await KUMOContracts.kumoToken.balanceOf(unipool.address)
  // // assert.equal(unipoolKUMOBal.toString(), '1333333333333333333333333')
  // th.logBN('Unipool KUMO balance       ', unipoolKUMOBal)

  // // KUMO Safe
  // const kumoSafeBal = await KUMOContracts.kumoToken.balanceOf(configParams.kumoAddrs.KUMO_SAFE)
  // assert.equal(kumoSafeBal.toString(), '64666666666666666666666667')
  // th.logBN('KUMO Safe balance     ', kumoSafeBal)

  // // Bounties/hackathons (General Safe)
  // const generalSafeBal = await KUMOContracts.kumoToken.balanceOf(configParams.kumoAddrs.GENERAL_SAFE)
  // assert.equal(generalSafeBal.toString(), '2000000000000000000000000')
  // th.logBN('General Safe balance       ', generalSafeBal)

  // // CommunityIssuance contract
  // const communityIssuanceBal = await KUMOContracts.kumoToken.balanceOf(KUMOContracts.communityIssuance.address)
  // // assert.equal(communityIssuanceBal.toString(), '32000000000000000000000000')
  // th.logBN('Community Issuance balance', communityIssuanceBal)

  // // --- PriceFeed ---
  // console.log("PRICEFEED CHECKS")
  // // Check Pricefeed's status and last good price
  // const lastGoodPrice = await kumoCore.priceFeed.lastGoodPrice()
  // const priceFeedInitialStatus = await kumoCore.priceFeed.status()
  // th.logBN('PriceFeed first stored price', lastGoodPrice)
  // console.log(`PriceFeed initial status: ${priceFeedInitialStatus}`)

  // // Check PriceFeed's & TellorCaller's stored addresses
  // const priceFeedCLAddress = await kumoCore.priceFeed.priceAggregator()
  // const priceFeedTellorCallerAddress = await kumoCore.priceFeed.tellorCaller()
  // assert.equal(priceFeedCLAddress, configParams.externalAddrs.CHAINLINK_ETHUSD_PROXY)
  // assert.equal(priceFeedTellorCallerAddress, kumoCore.tellorCaller.address)

  // // Check Tellor address
  // const tellorCallerTellorMasterAddress = await kumoCore.tellorCaller.tellor()
  // assert.equal(tellorCallerTellorMasterAddress, configParams.externalAddrs.TELLOR_MASTER)

  // // --- Unipool ---

  // // Check Unipool's KUSD-ETH Uniswap Pair address
  // const unipoolUniswapPairAddr = await unipool.uniToken()
  // console.log(`Unipool's stored KUSD-ETH Uniswap Pair address: ${unipoolUniswapPairAddr}`)

  // console.log("SYSTEM GLOBAL VARS CHECKS")
  // // --- Sorted Troves ---

  // // Check max size
  // const sortedTrovesMaxSize = (await kumoCore.sortedTroves.data())[2]
  // assert.equal(sortedTrovesMaxSize, '115792089237316195423570985008687907853269984665640564039457584007913129639935')

  // // --- TroveManager ---

  // const liqReserve = await kumoCore.troveManager.KUSD_GAS_COMPENSATION()
  // const minNetDebt = await kumoCore.troveManager.MIN_NET_DEBT()

  // th.logBN('system liquidation reserve', liqReserve)
  // th.logBN('system min net debt      ', minNetDebt)

  // // --- Make first KUSD-ETH liquidity provision ---

  // // Open trove if not yet opened
  // const troveStatus = await kumoCore.troveManager.getTroveStatus(deployerWallet.address)
  // if (troveStatus.toString() != '1') {
  //   let _3kKUSDWithdrawal = th.dec(3000, 18) // 3000 KUSD
  //   let _3ETHcoll = th.dec(3, 'ether') // 3 ETH
  //   console.log('Opening trove...')
  //   await mdh.sendAndWaitForTransaction(
  //     kumoCore.borrowerOperations.openTrove(
  //       th._100pct,
  //       _3kKUSDWithdrawal,
  //       th.ZERO_ADDRESS,
  //       th.ZERO_ADDRESS,
  //       { value: _3ETHcoll, gasPrice }
  //     )
  //   )
  // } else {
  //   console.log('Deployer already has an active trove')
  // }

  // // Check deployer now has an open trove
  // console.log(`deployer is in sorted list after making trove: ${await kumoCore.sortedTroves.contains(deployerWallet.address)}`)

  // const deployerTrove = await kumoCore.troveManager.Troves(deployerWallet.address)
  // th.logBN('deployer debt', deployerTrove[0])
  // th.logBN('deployer coll', deployerTrove[1])
  // th.logBN('deployer stake', deployerTrove[2])
  // console.log(`deployer's trove status: ${deployerTrove[3]}`)

  // // Check deployer has KUSD
  // let deployerKUSDBal = await kumoCore.kusdToken.balanceOf(deployerWallet.address)
  // th.logBN("deployer's KUSD balance", deployerKUSDBal)

  // // Check Uniswap pool has KUSD and WETH tokens
  const KUSDETHPair = await new ethers.Contract(
    KUSDWETHPairAddr,
    UniswapV2Pair.abi,
    deployerWallet
  )

  // const token0Addr = await KUSDETHPair.token0()
  // const token1Addr = await KUSDETHPair.token1()
  // console.log(`KUSD-ETH Pair token 0: ${th.squeezeAddr(token0Addr)},
  //       KUSDToken contract addr: ${th.squeezeAddr(kumoCore.kusdToken.address)}`)
  // console.log(`KUSD-ETH Pair token 1: ${th.squeezeAddr(token1Addr)},
  //       WETH ERC20 contract addr: ${th.squeezeAddr(configParams.externalAddrs.WETH_ERC20)}`)

  // // Check initial KUSD-ETH pair reserves before provision
  // let reserves = await KUSDETHPair.getReserves()
  // th.logBN("KUSD-ETH Pair's KUSD reserves before provision", reserves[0])
  // th.logBN("KUSD-ETH Pair's ETH reserves before provision", reserves[1])

  // // Get the UniswapV2Router contract
  // const uniswapV2Router02 = new ethers.Contract(
  //   configParams.externalAddrs.UNISWAP_V2_ROUTER02,
  //   UniswapV2Router02.abi,
  //   deployerWallet
  // )

  // // --- Provide liquidity to KUSD-ETH pair if not yet done so ---
  // let deployerLPTokenBal = await KUSDETHPair.balanceOf(deployerWallet.address)
  // if (deployerLPTokenBal.toString() == '0') {
  //   console.log('Providing liquidity to Uniswap...')
  //   // Give router an allowance for KUSD
  //   await kumoCore.kusdToken.increaseAllowance(uniswapV2Router02.address, dec(10000, 18))

  //   // Check Router's spending allowance
  //   const routerKUSDAllowanceFromDeployer = await kumoCore.kusdToken.allowance(deployerWallet.address, uniswapV2Router02.address)
  //   th.logBN("router's spending allowance for deployer's KUSD", routerKUSDAllowanceFromDeployer)

  //   // Get amounts for liquidity provision
  //   const LP_ETH = dec(1, 'ether')

  //   // Convert 8-digit CL price to 18 and multiply by ETH amount
  //   const KUSDAmount = toBigNum(chainlinkPrice)
  //     .mul(toBigNum(dec(1, 10)))
  //     .mul(toBigNum(LP_ETH))
  //     .div(toBigNum(dec(1, 18)))

  //   const minKUSDAmount = KUSDAmount.sub(toBigNum(dec(100, 18)))

  //   latestBlock = await ethers.provider.getBlockNumber()
  //   now = (await ethers.provider.getBlock(latestBlock)).timestamp
  //   let tenMinsFromNow = now + (60 * 60 * 10)

  //   // Provide liquidity to KUSD-ETH pair
  //   await mdh.sendAndWaitForTransaction(
  //     uniswapV2Router02.addLiquidityETH(
  //       kumoCore.kusdToken.address, // address of KUSD token
  //       KUSDAmount, // KUSD provision
  //       minKUSDAmount, // minimum KUSD provision
  //       LP_ETH, // minimum ETH provision
  //       deployerWallet.address, // address to send LP tokens to
  //       tenMinsFromNow, // deadline for this tx
  //       {
  //         value: dec(1, 'ether'),
  //         gasPrice,
  //         gasLimit: 5000000 // For some reason, ethers can't estimate gas for this tx
  //       }
  //     )
  //   )
  // } else {
  //   console.log('Liquidity already provided to Uniswap')
  // }
  // // Check KUSD-ETH reserves after liquidity provision:
  // reserves = await KUSDETHPair.getReserves()
  // th.logBN("KUSD-ETH Pair's KUSD reserves after provision", reserves[0])
  // th.logBN("KUSD-ETH Pair's ETH reserves after provision", reserves[1])



  // // ---  Check LP staking  ---
  // console.log("CHECK LP STAKING EARNS KUMO")

  // // Check deployer's LP tokens
  // deployerLPTokenBal = await KUSDETHPair.balanceOf(deployerWallet.address)
  // th.logBN("deployer's LP token balance", deployerLPTokenBal)

  // // Stake LP tokens in Unipool
  // console.log(`KUSDETHPair addr: ${KUSDETHPair.address}`)
  // console.log(`Pair addr stored in Unipool: ${await unipool.uniToken()}`)

  // earnedKUMO = await unipool.earned(deployerWallet.address)
  // th.logBN("deployer's farmed KUMO before staking LP tokens", earnedKUMO)

  // const deployerUnipoolStake = await unipool.balanceOf(deployerWallet.address)
  // if (deployerUnipoolStake.toString() == '0') {
  //   console.log('Staking to Unipool...')
  //   // Deployer approves Unipool
  //   await mdh.sendAndWaitForTransaction(
  //     KUSDETHPair.approve(unipool.address, deployerLPTokenBal, { gasPrice })
  //   )

  //   await mdh.sendAndWaitForTransaction(unipool.stake(1, { gasPrice }))
  // } else {
  //   console.log('Already staked in Unipool')
  // }

  // console.log("wait 90 seconds before checking earnings... ")
  // await configParams.waitFunction()

  // earnedKUMO = await unipool.earned(deployerWallet.address)
  // th.logBN("deployer's farmed KUMO from Unipool after waiting ~1.5mins", earnedKUMO)

  // let deployerKUMOBal = await KUMOContracts.kumoToken.balanceOf(deployerWallet.address)
  // th.logBN("deployer KUMO Balance Before SP deposit", deployerKUMOBal)



  // // --- Make SP deposit and earn KUMO ---
  // console.log("CHECK DEPLOYER MAKING DEPOSIT AND EARNING KUMO")

  // let SPDeposit = await kumoCore.stabilityPool.getCompoundedKUSDDeposit(deployerWallet.address)
  // th.logBN("deployer SP deposit before making deposit", SPDeposit)

  // // Provide to SP
  // await mdh.sendAndWaitForTransaction(kumoCore.stabilityPool.provideToSP(dec(15, 18), th.ZERO_ADDRESS, { gasPrice, gasLimit: 400000 }))

  // // Get SP deposit 
  // SPDeposit = await kumoCore.stabilityPool.getCompoundedKUSDDeposit(deployerWallet.address)
  // th.logBN("deployer SP deposit after depositing 15 KUSD", SPDeposit)

  // console.log("wait 90 seconds before withdrawing...")
  // // wait 90 seconds
  // await configParams.waitFunction()

  // // Withdraw from SP
  // // await mdh.sendAndWaitForTransaction(kumoCore.stabilityPool.withdrawFromSP(dec(1000, 18), { gasPrice, gasLimit: 400000 }))

  // // SPDeposit = await kumoCore.stabilityPool.getCompoundedKUSDDeposit(deployerWallet.address)
  // // th.logBN("deployer SP deposit after full withdrawal", SPDeposit)

  // // deployerKUMOBal = await KUMOContracts.kumoToken.balanceOf(deployerWallet.address)
  // // th.logBN("deployer KUMO Balance after SP deposit withdrawal", deployerKUMOBal)



  // // ---  Attempt withdrawal from LC  ---
  // console.log("CHECK BENEFICIARY ATTEMPTING WITHDRAWAL FROM LC")

  // // connect Acct2 wallet to the LC they are beneficiary of
  // let account2LockupContract = await lockupContracts["ACCOUNT_2"].connect(account2Wallet)

  // // Deployer funds LC with 10 KUMO
  // // await mdh.sendAndWaitForTransaction(KUMOContracts.kumoToken.transfer(account2LockupContract.address, dec(10, 18), { gasPrice }))

  // // account2 KUMO bal
  // let account2bal = await KUMOContracts.kumoToken.balanceOf(account2Wallet.address)
  // th.logBN("account2 KUMO bal before withdrawal attempt", account2bal)

  // // Check LC KUMO bal 
  // let account2LockupContractBal = await KUMOContracts.kumoToken.balanceOf(account2LockupContract.address)
  // th.logBN("account2's LC KUMO bal before withdrawal attempt", account2LockupContractBal)

  // // Acct2 attempts withdrawal from  LC
  // await mdh.sendAndWaitForTransaction(account2LockupContract.withdrawKUMO({ gasPrice, gasLimit: 1000000 }))

  // // Acct KUMO bal
  // account2bal = await KUMOContracts.kumoToken.balanceOf(account2Wallet.address)
  // th.logBN("account2's KUMO bal after LC withdrawal attempt", account2bal)

  // // Check LC bal 
  // account2LockupContractBal = await KUMOContracts.kumoToken.balanceOf(account2LockupContract.address)
  // th.logBN("account2's LC KUMO bal LC withdrawal attempt", account2LockupContractBal)

  // // --- Stake KUMO ---
  // console.log("CHECK DEPLOYER STAKING KUMO")

  // // Log deployer KUMO bal and stake before staking
  // deployerKUMOBal = await KUMOContracts.kumoToken.balanceOf(deployerWallet.address)
  // th.logBN("deployer KUMO bal before staking", deployerKUMOBal)
  // let deployerKUMOStake = await KUMOContracts.kumoStaking.stakes(deployerWallet.address)
  // th.logBN("deployer stake before staking", deployerKUMOStake)

  // // stake 13 KUMO
  // await mdh.sendAndWaitForTransaction(KUMOContracts.kumoStaking.stake(dec(13, 18), { gasPrice, gasLimit: 1000000 }))

  // // Log deployer KUMO bal and stake after staking
  // deployerKUMOBal = await KUMOContracts.kumoToken.balanceOf(deployerWallet.address)
  // th.logBN("deployer KUMO bal after staking", deployerKUMOBal)
  // deployerKUMOStake = await KUMOContracts.kumoStaking.stakes(deployerWallet.address)
  // th.logBN("deployer stake after staking", deployerKUMOStake)

  // // Log deployer rev share immediately after staking
  // let deployerKUSDRevShare = await KUMOContracts.kumoStaking.getPendingKUSDGain(deployerWallet.address)
  // th.logBN("deployer pending KUSD revenue share", deployerKUSDRevShare)



  // // --- 2nd Account opens trove ---
  // const trove2Status = await kumoCore.troveManager.getTroveStatus(account2Wallet.address)
  // if (trove2Status.toString() != '1') {
  //   console.log("Acct 2 opens a trove ...")
  //   let _2kKUSDWithdrawal = th.dec(2000, 18) // 2000 KUSD
  //   let _1pt5_ETHcoll = th.dec(15, 17) // 1.5 ETH
  //   const borrowerOpsEthersFactory = await ethers.getContractFactory("BorrowerOperations", account2Wallet)
  //   const borrowerOpsAcct2 = await new ethers.Contract(kumoCore.borrowerOperations.address, borrowerOpsEthersFactory.interface, account2Wallet)

  //   await mdh.sendAndWaitForTransaction(borrowerOpsAcct2.openTrove(th._100pct, _2kKUSDWithdrawal, th.ZERO_ADDRESS, th.ZERO_ADDRESS, { value: _1pt5_ETHcoll, gasPrice, gasLimit: 1000000 }))
  // } else {
  //   console.log('Acct 2 already has an active trove')
  // }

  // const acct2Trove = await kumoCore.troveManager.Troves(account2Wallet.address)
  // th.logBN('acct2 debt', acct2Trove[0])
  // th.logBN('acct2 coll', acct2Trove[1])
  // th.logBN('acct2 stake', acct2Trove[2])
  // console.log(`acct2 trove status: ${acct2Trove[3]}`)

  // // Log deployer's pending KUSD gain - check fees went to staker (deloyer)
  // deployerKUSDRevShare = await KUMOContracts.kumoStaking.getPendingKUSDGain(deployerWallet.address)
  // th.logBN("deployer pending KUSD revenue share from staking, after acct 2 opened trove", deployerKUSDRevShare)

  // //  --- deployer withdraws staking gains ---
  // console.log("CHECK DEPLOYER WITHDRAWING STAKING GAINS")

  // // check deployer's KUSD balance before withdrawing staking gains
  // deployerKUSDBal = await kumoCore.kusdToken.balanceOf(deployerWallet.address)
  // th.logBN('deployer KUSD bal before withdrawing staking gains', deployerKUSDBal)

  // // Deployer withdraws staking gains
  // await mdh.sendAndWaitForTransaction(KUMOContracts.kumoStaking.unstake(0, { gasPrice, gasLimit: 1000000 }))

  // // check deployer's KUSD balance after withdrawing staking gains
  // deployerKUSDBal = await kumoCore.kusdToken.balanceOf(deployerWallet.address)
  // th.logBN('deployer KUSD bal after withdrawing staking gains', deployerKUSDBal)


  // // --- System stats  ---

  // Uniswap KUSD-ETH pool size
  reserves = await KUSDETHPair.getReserves()
  th.logBN("KUSD-ETH Pair's current KUSD reserves", reserves[0])
  th.logBN("KUSD-ETH Pair's current ETH reserves", reserves[1])

  // Number of troves
  const numTroves = await kumoCore.troveManager.getTroveOwnersCount()
  console.log(`number of troves: ${numTroves} `)

  // Sorted list size
  const listSize = await kumoCore.sortedTroves.getSize()
  console.log(`Trove list size: ${listSize} `)

  // Total system debt and coll
  const entireSystemDebt = await kumoCore.troveManager.getEntireSystemDebt()
  const entireSystemColl = await kumoCore.troveManager.getEntireSystemColl()
  th.logBN("Entire system debt", entireSystemDebt)
  th.logBN("Entire system coll", entireSystemColl)
  
  // TCR
  const TCR = await kumoCore.troveManager.getTCR(chainlinkPrice)
  console.log(`TCR: ${TCR}`)

  // current borrowing rate
  const baseRate = await kumoCore.troveManager.baseRate()
  const currentBorrowingRate = await kumoCore.troveManager.getBorrowingRateWithDecay()
  th.logBN("Base rate", baseRate)
  th.logBN("Current borrowing rate", currentBorrowingRate)

  // total SP deposits
  const totalSPDeposits = await kumoCore.stabilityPool.getTotalKUSDDeposits()
  th.logBN("Total KUSD SP deposits", totalSPDeposits)

  // total KUMO Staked in KUMOStaking
  const totalKUMOStaked = await KUMOContracts.kumoStaking.totalKUMOStaked()
  th.logBN("Total KUMO staked", totalKUMOStaked)

  // total LP tokens staked in Unipool
  const totalLPTokensStaked = await unipool.totalSupply()
  th.logBN("Total LP (KUSD-ETH) tokens staked in unipool", totalLPTokensStaked)

  // --- State variables ---

  // TroveManager 
  console.log("TroveManager state variables:")
  const totalStakes = await kumoCore.troveManager.totalStakes()
  const totalStakesSnapshot = await kumoCore.troveManager.totalStakesSnapshot()
  const totalCollateralSnapshot = await kumoCore.troveManager.totalCollateralSnapshot()
  th.logBN("Total trove stakes", totalStakes)
  th.logBN("Snapshot of total trove stakes before last liq. ", totalStakesSnapshot)
  th.logBN("Snapshot of total trove collateral before last liq. ", totalCollateralSnapshot)

  const L_ETH = await kumoCore.troveManager.L_ETH()
  const L_KUSDDebt = await kumoCore.troveManager.L_KUSDDebt()
  th.logBN("L_ETH", L_ETH)
  th.logBN("L_KUSDDebt", L_KUSDDebt)

  // StabilityPool
  console.log("StabilityPool state variables:")
  const P = await kumoCore.stabilityPool.P()
  const currentScale = await kumoCore.stabilityPool.currentScale()
  const currentEpoch = await kumoCore.stabilityPool.currentEpoch()
  const S = await kumoCore.stabilityPool.epochToScaleToSum(currentEpoch, currentScale)
  const G = await kumoCore.stabilityPool.epochToScaleToG(currentEpoch, currentScale)
  th.logBN("Product P", P)
  th.logBN("Current epoch", currentEpoch)
  th.logBN("Current scale", currentScale)
  th.logBN("Sum S, at current epoch and scale", S)
  th.logBN("Sum G, at current epoch and scale", G)

  // KUMOStaking
  console.log("KUMOStaking state variables:")
  const F_KUSD = await KUMOContracts.kumoStaking.F_KUSD()
  const F_ETH = await KUMOContracts.kumoStaking.F_ETH()
  th.logBN("F_KUSD", F_KUSD)
  th.logBN("F_ETH", F_ETH)


  // CommunityIssuance
  console.log("CommunityIssuance state variables:")
  const totalKUMOIssued = await KUMOContracts.communityIssuance.totalKUMOIssued()
  th.logBN("Total KUMO issued to depositors / front ends", totalKUMOIssued)


  // TODO: Uniswap *KUMO-ETH* pool size (check it's deployed?)















  // ************************
  // --- NOT FOR APRIL 5: Deploy a KUMOToken2 with General Safe as beneficiary to test minting KUMO showing up in Gnosis App  ---

  // // General Safe KUMO bal before:
  // const realGeneralSafeAddr = "0xF06016D822943C42e3Cb7FC3a6A3B1889C1045f8"

  //   const KUMOToken2EthersFactory = await ethers.getContractFactory("KUMOToken2", deployerWallet)
  //   const kumoToken2 = await KUMOToken2EthersFactory.deploy( 
  //     "0xF41E0DD45d411102ed74c047BdA544396cB71E27",  // CI param: LC1 
  //     "0x9694a04263593AC6b895Fc01Df5929E1FC7495fA", // KUMO Staking param: LC2
  //     "0x98f95E112da23c7b753D8AE39515A585be6Fb5Ef", // LCF param: LC3
  //     realGeneralSafeAddr,  // bounty/hackathon param: REAL general safe addr
  //     "0x98f95E112da23c7b753D8AE39515A585be6Fb5Ef", // LP rewards param: LC3
  //     deployerWallet.address, // multisig param: deployer wallet
  //     {gasPrice, gasLimit: 10000000}
  //   )

  //   console.log(`kumo2 address: ${kumoToken2.address}`)

  //   let generalSafeKUMOBal = await kumoToken2.balanceOf(realGeneralSafeAddr)
  //   console.log(`generalSafeKUMOBal: ${generalSafeKUMOBal}`)



  // ************************
  // --- NOT FOR APRIL 5: Test short-term lockup contract KUMO withdrawal on mainnet ---

  // now = (await ethers.provider.getBlock(latestBlock)).timestamp

  // const LCShortTermEthersFactory = await ethers.getContractFactory("LockupContractShortTerm", deployerWallet)

  // new deployment
  // const LCshortTerm = await LCShortTermEthersFactory.deploy(
  //   KUMOContracts.kumoToken.address,
  //   deployerWallet.address,
  //   now, 
  //   {gasPrice, gasLimit: 1000000}
  // )

  // LCshortTerm.deployTransaction.wait()

  // existing deployment
  // const deployedShortTermLC = await new ethers.Contract(
  //   "0xbA8c3C09e9f55dA98c5cF0C28d15Acb927792dC7", 
  //   LCShortTermEthersFactory.interface,
  //   deployerWallet
  // )

  // new deployment
  // console.log(`Short term LC Address:  ${LCshortTerm.address}`)
  // console.log(`recorded beneficiary in short term LC:  ${await LCshortTerm.beneficiary()}`)
  // console.log(`recorded short term LC name:  ${await LCshortTerm.NAME()}`)

  // existing deployment
  //   console.log(`Short term LC Address:  ${deployedShortTermLC.address}`)
  //   console.log(`recorded beneficiary in short term LC:  ${await deployedShortTermLC.beneficiary()}`)
  //   console.log(`recorded short term LC name:  ${await deployedShortTermLC.NAME()}`)
  //   console.log(`recorded short term LC name:  ${await deployedShortTermLC.unlockTime()}`)
  //   now = (await ethers.provider.getBlock(latestBlock)).timestamp
  //   console.log(`time now: ${now}`)

  //   // check deployer KUMO bal
  //   let deployerKUMOBal = await KUMOContracts.kumoToken.balanceOf(deployerWallet.address)
  //   console.log(`deployerKUMOBal before he withdraws: ${deployerKUMOBal}`)

  //   // check LC KUMO bal
  //   let LC_KUMOBal = await KUMOContracts.kumoToken.balanceOf(deployedShortTermLC.address)
  //   console.log(`LC KUMO bal before withdrawal: ${LC_KUMOBal}`)

  // // withdraw from LC
  // const withdrawFromShortTermTx = await deployedShortTermLC.withdrawKUMO( {gasPrice, gasLimit: 1000000})
  // withdrawFromShortTermTx.wait()

  // // check deployer bal after LC withdrawal
  // deployerKUMOBal = await KUMOContracts.kumoToken.balanceOf(deployerWallet.address)
  // console.log(`deployerKUMOBal after he withdraws: ${deployerKUMOBal}`)

  //   // check LC KUMO bal
  //   LC_KUMOBal = await KUMOContracts.kumoToken.balanceOf(deployedShortTermLC.address)
  //   console.log(`LC KUMO bal after withdrawal: ${LC_KUMOBal}`)
}

module.exports = {
  mainnetDeploy
}
