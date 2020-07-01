const { ether } = require("@openzeppelin/test-helpers")

let config = {}

config.AskoToken = {
  name:"Askobar Network",
  symbol:"ASKO",
  decimals:18,
  taxBP:100
}

config.AskoStaking = {
  stakingTaxBP: 100,
  unstakingTaxBP: 100
}

config.AskoPresale = {
  buybackBP: 1500,
  devfundBP: 1000,
  maxBuyPerAddress: ether("5"),
  maximumPresaleEther: ether("200"),
  requiresWhitelisting: true,
  totalPresaleTokens: ether("40000000"),
  totalUniswapTokens: ether("24000000")
}

module.exports = config
