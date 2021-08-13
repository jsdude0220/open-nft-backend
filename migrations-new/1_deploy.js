const WETH9 = artifacts.require("WETH9");
const ConditionalTokens = artifacts.require("ConditionalTokens");
const FPMMDeterministicFactory = artifacts.require("FPMMDeterministicFactory");
const ConditionalTokensManager = artifacts.require("ConditionalTokensManager");
const UniswapV2Factory = artifacts.require("UniswapV2Factory");
const DAI = artifacts.require('DAI');
const USDC = artifacts.require('USDC');
const USDT = artifacts.require('USDT');
const ethers = require('ethers');

module.exports = async function (deployer, network, accounts) {
    process.env.NETWORK = network
    console.log('network: ' + network);
    if(network == 'development') {
        contracts= []

        console.log('deploying WETH9..');
        contracts['CollateralToken']      = await WETH9.new();

        console.log('deploying ConditionalTokens..');
        contracts['ConditionalTokens']      = await ConditionalTokens.new();

        console.log('deploying FPMMDeterministicFactory..');
        contracts['FPMMDeterministicFactory']      = await FPMMDeterministicFactory.new();

        console.log('deploying UniswapV2Factory..');
        contracts['UniswapV2Factory']      = await UniswapV2Factory.new(accounts[0]);

        console.log('deploying DAI..');
        contracts['DAI']      = await DAI.new();

        console.log('deploying USDC..');
        contracts['USDC']      = await USDC.new();

        console.log('deploying USDT..');
        contracts['USDT']      = await USDT.new();

        console.log('deploying ConditionalTokensManager..');
        contracts['ConditionalTokensManager']      = await ConditionalTokensManager.new(
            accounts[0],
            contracts['FPMMDeterministicFactory'].address,
            contracts['ConditionalTokens'].address,
            contracts['USDC'].address
        );

        Object.keys(contracts).forEach((key) => {
            console.log(key + " address: " + contracts[key].address)
        })
    }
};