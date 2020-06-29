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


module.exports = config
