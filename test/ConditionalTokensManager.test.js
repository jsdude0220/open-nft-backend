const ConditionalTokens = artifacts.require("ConditionalTokens");
const FPMMDeterministicFactory = artifacts.require("FPMMDeterministicFactory");
const FixedProductMarketMaker = artifacts.require("FixedProductMarketMaker");
const ConditionalTokensManager = artifacts.require("ConditionalTokensManager");
const USDC = artifacts.require("USDC");
const ethers = require('ethers');

//const assert = require("chai").assert;
//const truffleAssert = require('truffle-assertions');
//const { AssertionError } = require("chai");

contract("ConditionalTokensManager", async (accounts) => {
    let contracts = []

    before( async () => {
        // console.log('deploying USDC..');
        // contracts['CollateralToken']      = await USDC.new();

        // console.log('deploying ConditionalTokens..');
        // contracts['ConditionalTokens']      = await ConditionalTokens.new();

        // console.log('deploying FPMMDeterministicFactory..');
        // contracts['FPMMDeterministicFactory']      = await FPMMDeterministicFactory.new();

        // console.log('deploying ConditionalTokensManager..');
        // contracts['ConditionalTokensManager']      = await ConditionalTokensManager.new(
        //     accounts[0],
        //     contracts['FPMMDeterministicFactory'].address,
        //     contracts['ConditionalTokens'].address,
        //     contracts['CollateralToken'].address
        // );

        console.log('deploying USDC..');
        contracts['CollateralToken']      = await USDC.at('0xd833215cbcc3f914bd1c9ece3ee7bf8b14f841bb');

        console.log('deploying ConditionalTokens..');
        contracts['ConditionalTokens']      = await ConditionalTokens.at('0x5b1869d9a4c187f2eaa108f3062412ecf0526b24');

        // console.log('deploying FPMMDeterministicFactory..');
        // contracts['FPMMDeterministicFactory']      = await FPMMDeterministicFactory.at();

        console.log('deploying ConditionalTokensManager..');
        contracts['ConditionalTokensManager']      = await ConditionalTokensManager.at('0xe982e462b094850f12af94d21d470e21be9d0e9c');

        Object.keys(contracts).forEach((key) => {
            console.log(key + " address: " + contracts[key].address)
        })
    })

    it("Should create event", async () => {

        const fee = 0;
        const saltNonce = 1;
        const funding = ethers.utils.parseUnits('100');
        const distributionHint = [];

        const createEvent = await contracts['ConditionalTokensManager'].createEvent(
            saltNonce,
            fee
        );

        console.log(JSON.stringify(createEvent));

        const questionId  = createEvent.receipt.logs[0].args["0"];
        const fpmm        = createEvent.receipt.logs[0].args["1"];
        const conditionId = createEvent.receipt.logs[0].args["2"];

        contracts['FixedProductMarketMaker'] = await FixedProductMarketMaker.at(fpmm);

        await contracts['CollateralToken'].approve(contracts['FixedProductMarketMaker'].address, funding);

        await contracts['FixedProductMarketMaker'].addFunding(funding, distributionHint);




    })
})