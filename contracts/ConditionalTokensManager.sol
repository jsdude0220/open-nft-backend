// SPDX-License-Identifier: MIT
pragma solidity ^0.5.0;

import './conditional-tokens-market-makers/FixedProductMarketMaker.sol';
import './conditional-tokens-market-makers/FPMMDeterministicFactory.sol';
//import { CTHelpers } from "./conditional-tokens-contracts/CTHelpers.sol";

contract ConditionalTokensManager {

    event newEvent(bytes32, address, bytes32);

    address oracle;
    FPMMDeterministicFactory fpmmFactory;
    ConditionalTokens conditionalTokens;
    IERC20 collateralToken;
    uint256 public nonce = 1; // Used for deterministic event ID generation.
    uint256 constant outcomes = 2;

    constructor(
        address _oracle,
        FPMMDeterministicFactory _fpmmFactory,
        ConditionalTokens _conditionalTokens,
        IERC20 _collateralToken
    ) public {
        oracle = _oracle;
        fpmmFactory = _fpmmFactory;
        conditionalTokens = _conditionalTokens;
        collateralToken = _collateralToken;
    }

    function createEvent(
            uint saltNonce,
            uint fee
        ) external {
        // first setup the event
        bytes32 questionId = addressFrom(address(this), nonce++);
        conditionalTokens.prepareCondition(oracle, questionId, outcomes);

        // next get conditionID for this event
        bytes32[] memory conditionIds = new bytes32[](1);
        uint256[] memory distributionHint = new uint256[](0);
        conditionIds[0] = CTHelpers.getConditionId(oracle, questionId, outcomes);

        // create market maker for event.
        FixedProductMarketMaker fixedProductMarketMaker = 
        fpmmFactory.create2FixedProductMarketMaker(
                saltNonce,
                conditionalTokens,
                collateralToken,
                conditionIds,
                fee,
                0,
                distributionHint
        );

        emit newEvent(questionId, address(fixedProductMarketMaker), conditionIds[0]);
    }


    function addressFrom(address _origin, uint _nonce) internal pure returns (bytes32 hash) {
        bytes memory data;
        if(_nonce == 0x00)          data = abi.encodePacked(bytes1(0xd6), bytes1(0x94), _origin, bytes1(0x80));
        else if(_nonce <= 0x7f)     data = abi.encodePacked(bytes1(0xd6), bytes1(0x94), _origin, uint8(_nonce));
        else if(_nonce <= 0xff)     data = abi.encodePacked(bytes1(0xd7), bytes1(0x94), _origin, bytes1(0x81), uint8(_nonce));
        else if(_nonce <= 0xffff)   data = abi.encodePacked(bytes1(0xd8), bytes1(0x94), _origin, bytes1(0x82), uint16(_nonce));
        else if(_nonce <= 0xffffff) data = abi.encodePacked(bytes1(0xd9), bytes1(0x94), _origin, bytes1(0x83), uint24(_nonce));
        else                        data = abi.encodePacked(bytes1(0xda), bytes1(0x94), _origin, bytes1(0x84), uint32(_nonce));
        hash = keccak256(data);
    }

}
