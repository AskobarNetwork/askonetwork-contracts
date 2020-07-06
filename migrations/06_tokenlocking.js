const { scripts, ConfigManager } = require('@openzeppelin/cli');
const { add, push, create } = scripts;
const {publicKey} = require("../privatekey")

const config = require("../config")

const AskoToken = artifacts.require("AskoToken")
const AskoStaking = artifacts.require("AskoStaking")

const AskoDevfund = artifacts.require("AskoDevfund")
const AskoPromoFund = artifacts.require("AskoPromoFund")
const AskoStakingRewardPool = artifacts.require("AskoStakingRewardPool")
const AskoTeamLock = artifacts.require("AskoTeamLock")

async function deploy(options) {
  add({ contractsData: [
    { name: 'AskoDevfund', alias: 'AskoDevfund' },
    { name: 'AskoPromoFund', alias: 'AskoPromoFund' },
    { name: 'AskoStakingRewardPool', alias: 'AskoStakingRewardPool' },
    { name: 'AskoTeamLock', alias: 'AskoTeamLock' }
  ] });
  await push(options);
  await create(Object.assign({ contractAlias: 'AskoDevfund' }, options));
  await create(Object.assign({ contractAlias: 'AskoPromoFund' }, options));
  await create(Object.assign({ contractAlias: 'AskoStakingRewardPool' }, options));
  await create(Object.assign({ contractAlias: 'AskoTeamLock' }, options));
}

async function initialize(accounts,networkName){
    let owner = accounts[0]

    const devfundParams = config.AskoDevFund
    const promoParams = config.AskoPromoFund
    const stakingRewardPoolParams = config.AskoStakingRewardPool
    const teamLockParams = config.AskoTeamLock

    const askoToken =   await AskoToken.deployed()
    const askoStaking = await AskoStaking.deployed()

    const askoDevfund =   await AskoDevfund.deployed()
    const askoPromoFund =   await AskoPromoFund.deployed()
    const askoStakingRewardPool = await AskoStakingRewardPool.deployed()
    const askoTeamLock = await AskoTeamLock.deployed()

    await askoDevFund.initialize(
      devfundParams.releaseAmount,
      devfundParams.releaseInterval,
      devfundParams.releaseStart,
      devfundParams.authorizor,
      devfundParams.releaser,
      askoToken.address,
      askoStaking.address
    )

    await askoPromoFund.initialize(
      promoParams.authorizor,
      promoParams.releaser,
      askoToken.address
    )

    await askoStakingRewardPool.initialize(
      stakingRewardPoolParams.releaseBP,
      stakingRewardPoolParams.releaseInterval,
      owner,
      askoToken.address,
      askoStaking.address
    )

    await askoTeamLock.initialize(
      teamLockParams.releaseAmount,
      teamLockParams.releaseInterval,
      teamLockParams.releaseStart,
      teamLockParams.teamMembers,
      askoToken.address
    )

    askoToken.mint(askoDevFund.address,devfundParams.size,{from:owner})
    askoToken.mint(askoPromoFund.address,promoParams.size,{from:owner})
    askoToken.mint(askoStakingRewardPool.address,stakingRewardPoolParams.size,{from:owner})
    askoToken.mint(askoTeamLock.address,teamLockParams.size,{from:owner})

}

module.exports = function(deployer, networkName, accounts) {
  deployer.then(async () => {
    let account = accounts[0]
    const { network, txParams } = await ConfigManager.initNetworkConfiguration({ network: networkName, from: account })
    await deploy({ network, txParams })
    await initialize(accounts,networkName)
  })
}
