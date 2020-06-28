const { accounts, contract, web3 } = require("@openzeppelin/test-environment")
const { expectRevert, time, BN, ether, balance } = require("@openzeppelin/test-helpers")
const {expect} = require("chai")
const config = require("../config")

const AskoToken = contract.fromArtifact("AskoToken")
const AskoStaking = contract.fromArtifact("AskoStaking")


const owner = accounts[0]
const transferFromAccounts = [accounts[1],accounts[2],accounts[3]]
const transferToAccounts = [accounts[4],accounts[5],accounts[6]]

describe("AskoToken", function() {
  before(async function() {
    const tokenParams = config.AskoToken
    const stakingParams = config.AskoStaking

    this.askoToken = await AskoToken.new();
    this.askoStaking = await AskoStaking.new();

    await this.askoToken.initialize(
      tokenParams.name,
      tokenParams.symbol,
      tokenParams.decimals,
      [owner],[owner],[this.askoStaking.address],
      tokenParams.taxBP,
      this.askoStaking.address
    )
    await this.askoStaking.initialize(
      stakingParams.stakingTaxBP,
      stakingParams.unStakingTaxBP,
      this.askoToken.address
    )

    await Promise.all([
      await this.askoToken.mint(transferFromAccounts[0],ether('110000000'),{from: owner}),
      await this.askoToken.mint(transferFromAccounts[0],ether('1.7'),{from: owner}),
      await this.askoToken.mint(transferFromAccounts[0],ether('0.013'),{from: owner})
    ])


  })
  describe("Stateless", function(){
    describe("#findTaxAmount", function(){
      it("Should return taxBP/10000 of value passed.", async function() {
        let tax = await this.askoToken.findTaxAmount(ether("1"))
        let expectedTax = ether("1").mul(new BN(config.AskoToken.taxBP)).div(new BN(10000))
        expect(tax.toString()).to.equal(expectedTax.toString())
      })
    })
  })
  describe("State: isTaxActive=false", function(){

  })
})
