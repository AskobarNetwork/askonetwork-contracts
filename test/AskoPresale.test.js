const { accounts, contract, web3 } = require("@openzeppelin/test-environment")
const { expectRevert, time, BN, ether, balance } = require("@openzeppelin/test-helpers")
const {expect} = require("chai")
const config = require("../config")

const AskoToken = contract.fromArtifact("AskoToken")
const AskoStaking = contract.fromArtifact("AskoStaking")
const AskoPresale = contract.fromArtifact("AskoPresale")

const owner = accounts[0]
const buyers = [accounts[1],accounts[2],accounts[3],accounts[4]]
const notWhitelisted = accounts[5]

describe("AskoPresale", function() {
  before(async function() {
    const tokenParams = config.AskoToken
    const presaleParams = config.AskoPresale

    this.askoToken = await AskoToken.new()
    this.askoStaking = await AskoStaking.new()
    this.askoPresale = await AskoPresale.new()

    await this.askoToken.initialize(
      tokenParams.name,
      tokenParams.symbol,
      tokenParams.decimals,
      owner,
      tokenParams.taxBP,
      this.askoStaking.address
    )

    this.askoToken.mint(
      this.askoPresale.address,
      presaleParams.totalPresaleTokens.add(presaleParams.totalUniswapTokens),
      {from: owner}
    )

    await this.askoPresale.initialize(
      presaleParams.buybackBP,
      presaleParams.devfundBP,
      presaleParams.maxbuyPerAddress,
      presaleParams.maximumPresaleEther,
      presaleParams.requiresWhitelisting,
      presaleParams.totalPresaleTokens,
      presaleParams.totalUniswapTokens,
      owner,
      this.askoToken.address
    )
  })

  describe("Stateless", function() {
    describe("#setWhitelist", function() {
      it("Should revert from non owner", async function() {
        const buyer = buyers[0]
        await expectRevert(
          this.askoPresale.setWhitelist(buyer,true,{from:buyer}),
          "Ownable: caller is not the owner"
        )
      })
      it("Should whitelist non whitelisted account", async function() {
        const buyer = buyers[0]
        const initialWhitelist = await this.askoPresale.whitelist(buyer)
        await this.askoPresale.setWhitelist(buyer,true,{from:owner})
        const finalWhitelist = await this.askoPresale.whitelist(buyer)
        expect(initialWhitelist).to.equal(false)
        expect(finalWhitelist).to.equal(true)
      })
      it("Should unwhitelist account", async function() {
        const buyer = buyers[0]
        const initialWhitelist = await this.askoPresale.whitelist(buyer)
        await this.askoPresale.setWhitelist(buyer,false,{from:owner})
        const finalWhitelist = await this.askoPresale.whitelist(buyer)
        expect(initialWhitelist).to.equal(true)
        expect(finalWhitelist).to.equal(false)
      })
    })
    describe("#setWhitelistForAll", function() {
      it("Should whitelist all addresses", async function() {
        await this.askoPresale.setWhitelistForAll(buyers,true,{from:owner})
        let whitelistVals = await Promise.all(buyers.map((buyer)=>{
          return this.askoPresale.whitelist(buyer)
        }))
        expect(whitelistVals.reduce((acc,val)=>{
          return acc && val
        })).to.equal(true)
      })
    })
  })



  describe("State: Before Start", function() {
    describe("#deposit", function() {
      it("Should revert", async function() {
        const buyer = buyers[0]
        await expectRevert(
          this.askoPresale.deposit({from:buyer}),
          "Presale not yet started."
        )
      })
    })
    describe("#redeem", function() {
      it("Should revert", async function() {
        const buyer = buyers[0]
        await expectRevert(
          this.askoPresale.redeem({from:buyer}),
          "Presale not yet started."
        )
      })
    })
    describe("#sendToUniswap", function() {
      it("Should revert", async function() {
        const buyer = buyers[0]
        await expectRevert(
          this.askoPresale.sendToUniswap({from:buyer}),
          "Presale not yet started."
        )
      })
    })
    describe("#withdrawFromDevfund", function() {
      it("Should revert", async function() {
        const buyer = buyers[0]
        await expectRevert(
          this.askoPresale.withdrawFromDevfund(ether("1"),owner,{from:owner}),
          "Presale not yet started."
        )
      })
    })
    describe("#withdrawFromBuyback", function() {
      it("Should revert", async function() {
        const buyer = buyers[0]
        await expectRevert(
          this.askoPresale.withdrawFromBuyback(ether("1"),owner,{from:owner}),
          "Presale not yet started."
        )
      })
    })
  })
})
