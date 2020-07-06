const { accounts, contract, web3 } = require("@openzeppelin/test-environment")
const { expectRevert, time, BN, ether, balance } = require("@openzeppelin/test-helpers")
const {expect} = require("chai")
const config = require("../config")

const AskoToken = contract.fromArtifact("AskoToken")
const AskoStaking = contract.fromArtifact("AskoStaking")
const AskoStakingRewardPool = contract.fromArtifact("AskoStakingRewardPool")

const owner = accounts[0]
const registeredStakers = [accounts[1],accounts[2],accounts[3]]
const nonRegisteredStaker = accounts[5]
const nonStakerAccount = accounts[4]

describe("AskoStakingRewardPool", function() {
  before(async function() {
    const tokenParams = config.AskoToken
    const stakingParams = config.AskoStaking
    const stakingRewardPoolParams = config.AskoStakingRewardPool

    this.askoToken = await AskoToken.new()
    this.askoStaking = await AskoStaking.new()
    this.askoStakingRewardPool = await AskoStakingRewardPool.new()

    await this.askoToken.initialize(
      tokenParams.name,
      tokenParams.symbol,
      tokenParams.decimals,
      owner,
      tokenParams.taxBP,
      this.askoStaking.address
    )
    await this.askoStaking.initialize(
      stakingParams.stakingTaxBP,
      stakingParams.unstakingTaxBP,
      owner,
      this.askoToken.address
    )
    await this.askoStakingRewardPool.initialize(
      stakingRewardPoolParams.releaseBP,
      stakingRewardPoolParams.releaseInterval,
      owner,
      this.askoToken.address,
      this.askoStaking.address
    )

    await this.askoStaking.setStartTime(stakingParams.startTime,{from:owner})

    await Promise.all([
      this.askoToken.mint(registeredStakers[0],ether('25'),{from: owner}),
      this.askoToken.mint(registeredStakers[1],ether('25'),{from: owner}),
      this.askoToken.mint(registeredStakers[2],ether('25'),{from: owner}),
      this.askoToken.mint(nonStakerAccount,ether('25'),{from: owner}),
      this.askoToken.mint(nonRegisteredStaker,ether('25'),{from: owner}),
    ])
  })
  describe("Stateless", function() {
    describe("#handleStake", function(){
      it("Should revert", async function() {
        const staker = registeredStakers[0]
        await expectRevert(
          this.askoStakingRewardPool.handleStake(staker,"100","100",{from:staker}),
          "Sender must be AskoStaking sc."
        )
      })
    })
    describe("#handleUnstake", function(){
      it("Should revert", async function() {
        const staker = registeredStakers[0]
        await expectRevert(
          this.askoStakingRewardPool.handleUnstake(staker,"100","100",{from:staker}),
          "Sender must be AskoStaking sc."
        )
      })
    })
    describe("#register", function(){
      it("Should revert", async function() {
        const staker = registeredStakers[0]
        await expectRevert(
          this.askoStakingRewardPool.register({from:staker}),
          "Registration not enabled"
        )
      })
      //TODO: Test enabled register()
    })
  })
  describe("State: Staking Reward Pool Inactive", function() {
    describe("#claim", function(){
      it("Should revert", async function() {
        const staker = registeredStakers[0]
        await expectRevert(
          this.askoStakingRewardPool.claim("1",{from:staker}),
           "Has not yet started."
        )
      })
    })
  })
})
