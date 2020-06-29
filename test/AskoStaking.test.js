const { accounts, contract, web3 } = require("@openzeppelin/test-environment")
const { expectRevert, time, BN, ether, balance } = require("@openzeppelin/test-helpers")
const {expect} = require("chai")
const config = require("../config")

const AskoToken = contract.fromArtifact("AskoToken")
const AskoStaking = contract.fromArtifact("AskoStaking")

const owner = accounts[0]
const stakers = [accounts[1],accounts[2],accounts[3],accounts[4]]
const nonStakerAccount = accounts[5]
const nonHolderAccount = accounts[6]

describe("AskoStaking", function() {
  before(async function() {
    const tokenParams = config.AskoToken
    const stakingParams = config.AskoStaking

    this.askoToken = await AskoToken.new()
    this.askoStaking = await AskoStaking.new()

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
      stakingParams.unStakingTaxBP,
      owner,
      this.askoToken.address
    )

    await Promise.all([
      this.askoToken.mint(stakers[0],ether('10'),{from: owner}),
      this.askoToken.mint(stakers[1],ether('10'),{from: owner}),
      this.askoToken.mint(stakers[2],ether('10'),{from: owner}),
      this.askoToken.mint(stakers[3],ether('10'),{from: owner}),
      this.askoToken.mint(nonStakerAccount,ether('10'),{from: owner}),
    ])
  })

  describe("#findTaxAmount", function(){
    it("Should return taxBP/10000 of value passed.", async function() {
      const taxBP = config.AskoStaking.stakingTaxBP
      const tax = await this.askoStaking.findTaxAmount(ether("1"),new BN(taxBP))
      const expectedTax = ether("1").mul(new BN(taxBP)).div(new BN(10000))
      expect(tax.toString()).to.equal(expectedTax.toString())
    })
  })

  describe("#stake", function(){
    it("Should revert if less than 1 token", async function() {
      const staker = stakers[0]
      expectRevert(
        this.askoStaking.stake(ether("1").sub(new BN(1)),{from:staker}),
        "Must stake at least one ASKO."
      )
      expectRevert(
        this.askoStaking.stake(0,{from:staker}),
        "Must stake at least one ASKO."
      )
      expectRevert(
        this.askoStaking.stake(new BN(1),{from:staker}),
        "Must stake at least one ASKO."
      )
    })
    it("Should revert if staking more tokens than held", async function() {
      const staker = stakers[0]
      const balance = await this.askoToken.balanceOf(staker)
      expect(balance.toString()).to.not.equal(new BN(0),{from:staker})
      expectRevert(
        this.askoStaking.stake(balance.add(new BN(1)),{from:staker}),
        "Cannot stake more ASKO than you hold unstaked."
      )
      expectRevert(
        this.askoStaking.stake(balance.add(ether("1000000000")),{from:staker}),
        "Cannot stake more ASKO than you hold unstaked."
      )
    })
    it("Should decrease stakers balance by value", async function() {
      const staker = stakers[0]
      const value = ether("1.1")
      const initialStakersTokens = await this.askoToken.balanceOf(staker)
      await this.askoStaking.stake(value,{from:staker})
      const finalStakersTokens = await this.askoToken.balanceOf(staker)
      expect(finalStakersTokens.toString())
        .to.equal(initialStakersTokens.sub(value).toString())
    })
    it("Should increase totalStakers by 1", async function() {
      const staker = stakers[0]
      const initialTotalStakers = await this.askoStaking.totalStakers()
      await this.askoStaking.stake(ether("1"),{from:staker})
      const finalTotalStakers = await this.askoStaking.totalStakers()
      expect(finalTotalStakers.toString())
        .to.equal(initialTotalStakers.add(new BN(1)).toString())
    })
    it("Should increase totalStaked by value minus tax", async function() {
      const staker = stakers[0]
      const value = ether("1.1")
      const tax = await this.askoStaking.findTaxAmount(value,config.AskoStaking.stakingTaxBP)
      const initialTotalStaked = await this.askoStaking.totalStaked()
      await this.askoStaking.stake(value,{from:staker})
      const finalTotalStaked = await this.askoStaking.totalStaked()
      expect(finalTotalStaked.toString())
        .to.equal(initialTotalStaked.add(value).sub(tax).toString())
    })
    it("Should increase sender's staked amount by value minus tax", async function() {
      const staker = stakers[0]
      const value = ether("1.1")
      const tax = await this.askoStaking.findTaxAmount(value,config.AskoStaking.stakingTaxBP)
      const initialStakerBalance = await this.askoStaking.stakeValue(staker)
      await this.askoStaking.stake(value,{from:staker})
      const finalStakerBalance = await this.askoStaking.stakeValue(staker)
      expect(finalStakerBalance.toString())
        .to.equal(initialStakerBalance.add(value).sub(tax).toString())
    })
    it("For single staker, dividends+stakeValue[staker] - 1 wei should be contract balance.", async function() {
      const staker = stakers[0]
      const balance = await this.askoToken.balanceOf(this.askoStaking.address)
      const stake = await this.askoStaking.stakeValue(staker)
      const divis = await this.askoStaking.dividendsOf(staker)
      expect(stake.add(divis).toString())
        .to.equal(balance.sub(new BN(1)).toString())
    })
    it("When second staker doubles total staked, first stakers dividends should increase by half of tax.", async function() {
      const stakerFirst = stakers[0]
      const stakerSecond = stakers[1]
      const totalStaked = await this.askoStaking.totalStaked()
      const initialDivis = await this.askoStaking.dividendsOf(stakerFirst)
      const value = totalStaked.mul(new BN(10000)).div((new BN(10000)).sub(new BN(config.AskoStaking.stakingTaxBP)))
      const tax = await this.askoStaking.findTaxAmount(value,config.AskoStaking.stakingTaxBP)
      await this.askoStaking.stake(value,{from:stakerSecond})
      const finalDivis = await this.askoStaking.dividendsOf(stakerFirst)
      const stakerSecondDivis = await this.askoStaking.dividendsOf(stakerSecond)
      expect(finalDivis.sub(initialDivis).toString())
        .to.equal(tax.div(new BN(2)).toString())
    })
    //TODO: more stake tests, unstake tests, distributions test
  })
})
