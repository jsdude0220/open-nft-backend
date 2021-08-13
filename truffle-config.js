//const seed = process.env.SEED || 'myth like bonus scare over problem client lizard pioneer submit female collect';
require('dotenv').config()
const seed = process.env.SEED
const privKey = process.env.PRIVATE_KEY
const HDWalletProvider = require('@truffle/hdwallet-provider');

const networks = Object.assign(...[
  [seed, 1, 'mainnet'],
  [seed, 3, 'ropsten'],
  [seed, 4, 'rinkeby'],
  [seed, 5, 'goerli', `${2e9}`],
  [seed, 42, 'kovan'],
  [seed, 77, 'sokol',,, 'https://sokol.poa.network'],
  [seed, 100, 'xdai',,, 'https://lively-empty-wind.xdai.quiknode.pro/827b90b45d544848ea8a880d30567297d3c9ef6e/'],
  [privKey, 80001, 'mumbai',, '20000000', 'https://rpc-mumbai.maticvigil.com/'],
].map(([secret, networkId, network, gasPrice, gasLimit, rpcUrl]) => ({
  [network]: {
    network_id: networkId,
    gasPrice: gasPrice,
    gas: gasLimit,
    provider: () => new HDWalletProvider(
      secret,
      rpcUrl || `https://${network}.infura.io/v3/17d5bb5953564f589d48d535f573e486`,
    ),
  },
})), {
  development: {
    host: 'localhost',
    port: 8545,
    network_id: '*',
  },
  test: {
    host: 'localhost',
    port: 8545,
    network_id: '*',
  },
  compilers: {
    solc: {
      version: "0.5.16",
      // settings: {
      //   optimizer: {
      //     enabled: true,
      //     runs: 1500
      //   }
      // }
    },
  },
});

module.exports = { networks };
