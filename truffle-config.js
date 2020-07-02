const HDWalletProvider = require("@truffle/hdwallet-provider")
const {privateKey, publicKey} = require("./privatekey")

module.exports = {
  networks: {
    development: {
     host: "127.0.0.1",
     port: 8545,
     network_id: "*",
    },
    live: {
      provider: function() {
        return new HDWalletProvider(privateKey, "https://mainnet.infura.io/v3/e88244aa5b1b4f19aa4b5045ba53b8b9")
      },
      network_id: 1,
      gasPrice: 41e9,
      from: publicKey,
      gas: 8000000
    }
  },

  compilers: {
    solc: {
      version: "0.5.16",
      docker: false,
      settings: {
       optimizer: {
         enabled: true,
         runs: 200
       },
       evmVersion: "byzantium"
      }
    }
  }
}
