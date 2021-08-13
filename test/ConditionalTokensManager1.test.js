// const ConditionalTokens = artifacts.require("ConditionalTokens");
// const FixedProductMarketMakerFactory = artifacts.require("FixedProductMarketMakerFactory");
// const ConditionalTokensManager = artifacts.require("ConditionalTokensManager");
// const USDC = artifacts.require("USDC");
// const ethers = require('ethers');

// //const assert = require("chai").assert;
// //const truffleAssert = require('truffle-assertions');
// //const { AssertionError } = require("chai");

// contract("ConditionalTokensManager", async (accounts) => {
//     let contracts = []

//     before( async () => {
//         console.log('deploying USDC..');
//         contracts['CollateralToken']      = await USDC.new();

//         console.log('deploying ConditionalTokens..');
//         contracts['ConditionalTokens']      = await ConditionalTokens.new();

//         console.log('deploying FixedProductMarketMakerFactory..');
//         contracts['FixedProductMarketMakerFactory']      = await FixedProductMarketMakerFactory.new();

//         console.log('deploying ConditionalTokensManager..');
//         contracts['ConditionalTokensManager']      = await ConditionalTokensManager.new(
//             accounts[0],
//             contracts['FixedProductMarketMakerFactory'].address,
//             contracts['ConditionalTokens'].address,
//             contracts['CollateralToken'].address
//         );

//         Object.keys(contracts).forEach((key) => {
//             console.log(key + " address: " + contracts[key].address)
//         })
//     })

//     it("Should create event", async () => {

//         const fee = 0;
//         const funding = ethers.utils.parseUnits('100');
//         const distributionHint = [];

//         await contracts['CollateralToken'].approve(contracts['ConditionalTokensManager'].address, funding);

//         await contracts['ConditionalTokensManager'].createEvent(
//             fee,
//             funding,
//             distributionHint,
//         );
//     })
// })