pragma solidity ^0.5.1;
import { Ownable } from "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import { IERC20 } from "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import { SafeMath } from "openzeppelin-solidity/contracts/math/SafeMath.sol";
import { SignedSafeMath } from "./../util-contracts/SignedSafeMath.sol";
import { ERC1155TokenReceiver } from "./../conditional-tokens-contracts/ERC1155/ERC1155TokenReceiver.sol";
import { CTHelpers } from "./../conditional-tokens-contracts/CTHelpers.sol";
import { ConditionalTokens } from "./../conditional-tokens-contracts/ConditionalTokens.sol";
import { Whitelist } from "./Whitelist.sol";

contract MarketMaker is Ownable, ERC1155TokenReceiver {
    using SignedSafeMath for int;
    using SafeMath for uint;
    /*
     *  Constants
     */    
    uint64 public constant FEE_RANGE = 10**18;

    /*
     *  Events
     */
    event AMMCreated(uint initialFunding);
    event AMMPaused();
    event AMMResumed();
    event AMMClosed();
    event AMMFundingChanged(int fundingChange);
    event AMMFeeChanged(uint64 newFee);
    event AMMFeeWithdrawal(uint fees);
    event AMMOutcomeTokenTrade(address indexed transactor, int[] outcomeTokenAmounts, int outcomeTokenNetCost, uint marketFees);
    
    /*
     *  Storage
     */
    ConditionalTokens public pmSystem;
    IERC20 public collateralToken;
    bytes32[] public conditionIds;
    uint public atomicOutcomeSlotCount;
    uint64 public fee;
    uint public funding;
    Stage public stage;
    Whitelist public whitelist;

    uint[] outcomeSlotCounts;
    bytes32[][] collectionIds;
    uint[] positionIds;

    enum Stage {
        Running,
        Paused,
        Closed
    }

    /*
     *  Modifiers
     */
    modifier atStage(Stage _stage) {
        // Contract has to be in given stage
        require(stage == _stage);
        _;
    }

    modifier onlyWhitelisted() {
        require(
            whitelist == Whitelist(0) || whitelist.isWhitelisted(msg.sender),
            "only whitelisted users may call this function"
        );
        _;
    }

    function calcNetCost(int[] memory outcomeTokenAmounts) public view returns (int netCost);

    /// @dev Allows to fund the market with collateral tokens converting them into outcome tokens
    /// Note for the future: should combine splitPosition and mergePositions into one function, as code duplication causes things like this to happen.
    function changeFunding(int fundingChange)
        public
        onlyOwner
        atStage(Stage.Paused)
    {
        require(fundingChange != 0, "funding change must be non-zero");
        // Either add or subtract funding based off whether the fundingChange parameter is negative or positive
        if (fundingChange > 0) {
            require(collateralToken.transferFrom(msg.sender, address(this), uint(fundingChange)) && collateralToken.approve(address(pmSystem), uint(fundingChange)));
            splitPositionThroughAllConditions(uint(fundingChange));
            funding = funding.add(uint(fundingChange));
            emit AMMFundingChanged(fundingChange);
        }
        if (fundingChange < 0) {
            mergePositionsThroughAllConditions(uint(-fundingChange));
            funding = funding.sub(uint(-fundingChange));
            require(collateralToken.transfer(owner(), uint(-fundingChange)));
            emit AMMFundingChanged(fundingChange);
        }
    }

    function pause() public onlyOwner atStage(Stage.Running) {
        stage = Stage.Paused;
        emit AMMPaused();
    }
    
    function resume() public onlyOwner atStage(Stage.Paused) {
        stage = Stage.Running;
        emit AMMResumed();
    }

    function changeFee(uint64 _fee) public onlyOwner atStage(Stage.Paused) {
        fee = _fee;
        emit AMMFeeChanged(fee);
    }

    /// @dev Allows market owner to close the markets by transferring all remaining outcome tokens to the owner
    function close()
        public
        onlyOwner
    {
        require(stage == Stage.Running || stage == Stage.Paused, "This Market has already been closed");
        for (uint i = 0; i < atomicOutcomeSlotCount; i++) {
            uint positionId = generateAtomicPositionId(i);
            pmSystem.safeTransferFrom(address(this), owner(), positionId, pmSystem.balanceOf(address(this), positionId), "");
        }
        stage = Stage.Closed;
        emit AMMClosed();
    }

    /// @dev Allows market owner to withdraw fees generated by trades
    /// @return Fee amount
    function withdrawFees()
        public
        onlyOwner
        returns (uint fees)
    {
        fees = collateralToken.balanceOf(address(this));
        // Transfer fees
        require(collateralToken.transfer(owner(), fees));
        emit AMMFeeWithdrawal(fees);
    }

    /// @dev Allows to trade outcome tokens and collateral with the market maker
    /// @param outcomeTokenAmounts Amounts of each atomic outcome token to buy or sell. If positive, will buy this amount of outcome token from the market. If negative, will sell this amount back to the market instead. The indices of this array range from 0 to product(all conditions' outcomeSlotCounts)-1. For example, with two conditions with three outcome slots each and one condition with two outcome slots, you will have 3*3*2=18 total atomic outcome tokens, and the indices will range from 0 to 17. The indices map to atomic outcome slots depending on the order of the conditionIds. Let's say the first condition has slots A, B, C the second has slots X, Y, and the third has slots I, J, K. We can associate each atomic outcome token with indices by this map:
    /// A&X&I == 0
    /// B&X&I == 1
    /// C&X&I == 2
    /// A&Y&I == 3
    /// B&Y&I == 4
    /// C&Y&I == 5
    /// A&X&J == 6
    /// B&X&J == 7
    /// C&X&J == 8
    /// A&Y&J == 9
    /// B&Y&J == 10
    /// C&Y&J == 11
    /// A&X&K == 12
    /// B&X&K == 13
    /// C&X&K == 14
    /// A&Y&K == 15
    /// B&Y&K == 16
    /// C&Y&K == 17
    /// This order is calculated via the generateAtomicPositionId function below: C&Y&I -> (2, 1, 0) -> 2 + 3 * (1 + 2 * (0 + 3 * (0 + 0)))
    /// @param collateralLimit If positive, this is the limit for the amount of collateral tokens which will be sent to the market to conduct the trade. If negative, this is the minimum amount of collateral tokens which will be received from the market for the trade. If zero, there is no limit.
    /// @return If positive, the amount of collateral sent to the market. If negative, the amount of collateral received from the market. If zero, no collateral was sent or received.
    function trade(int[] memory outcomeTokenAmounts, int collateralLimit)
        public
        atStage(Stage.Running)
        onlyWhitelisted
        returns (int netCost)
    {
        require(outcomeTokenAmounts.length == atomicOutcomeSlotCount);

        // Calculate net cost for executing trade
        int outcomeTokenNetCost = calcNetCost(outcomeTokenAmounts);
        int fees;
        if(outcomeTokenNetCost < 0)
            fees = int(calcMarketFee(uint(-outcomeTokenNetCost)));
        else
            fees = int(calcMarketFee(uint(outcomeTokenNetCost)));

        require(fees >= 0);
        netCost = outcomeTokenNetCost.add(fees);

        require(
            (collateralLimit != 0 && netCost <= collateralLimit) ||
            collateralLimit == 0
        );

        if(outcomeTokenNetCost > 0) {
            require(
                collateralToken.transferFrom(msg.sender, address(this), uint(netCost)) &&
                collateralToken.approve(address(pmSystem), uint(outcomeTokenNetCost))
            );

            splitPositionThroughAllConditions(uint(outcomeTokenNetCost));
        }

        bool touched = false;
        uint[] memory transferAmounts = new uint[](atomicOutcomeSlotCount);
        for (uint i = 0; i < atomicOutcomeSlotCount; i++) {
            if(outcomeTokenAmounts[i] < 0) {
                touched = true;
                // This is safe since
                // 0x8000000000000000000000000000000000000000000000000000000000000000 ==
                // uint(-int(-0x8000000000000000000000000000000000000000000000000000000000000000))
                transferAmounts[i] = uint(-outcomeTokenAmounts[i]);
            }
        }
        if(touched) pmSystem.safeBatchTransferFrom(msg.sender, address(this), positionIds, transferAmounts, "");

        if(outcomeTokenNetCost < 0) {
            mergePositionsThroughAllConditions(uint(-outcomeTokenNetCost));
        }

        emit AMMOutcomeTokenTrade(msg.sender, outcomeTokenAmounts, outcomeTokenNetCost, uint(fees));

        touched = false;
        for (uint i = 0; i < atomicOutcomeSlotCount; i++) {
            if(outcomeTokenAmounts[i] > 0) {
                touched = true;
                transferAmounts[i] = uint(outcomeTokenAmounts[i]);
            } else {
                transferAmounts[i] = 0;
            }
        }
        if(touched) pmSystem.safeBatchTransferFrom(address(this), msg.sender, positionIds, transferAmounts, "");

        if(netCost < 0) {
            require(collateralToken.transfer(msg.sender, uint(-netCost)));
        }
    }

    /// @dev Calculates fee to be paid to market maker
    /// @param outcomeTokenCost Cost for buying outcome tokens
    /// @return Fee for trade
    function calcMarketFee(uint outcomeTokenCost)
        public
        view
        returns (uint)
    {
        return outcomeTokenCost * fee / FEE_RANGE;
    }

    function onERC1155Received(address operator, address /*from*/, uint256 /*id*/, uint256 /*value*/, bytes calldata /*data*/) external returns(bytes4) {
        if (operator == address(this)) {
            return this.onERC1155Received.selector;
        }
        return 0x0;
    }

    function onERC1155BatchReceived(address _operator, address /*from*/, uint256[] calldata /*ids*/, uint256[] calldata /*values*/, bytes calldata /*data*/) external returns(bytes4) {
        if (_operator == address(this)) {
            return this.onERC1155BatchReceived.selector;
        }
        return 0x0;
    }

    function generateBasicPartition(uint outcomeSlotCount)
        private
        pure
        returns (uint[] memory partition)
    {
        partition = new uint[](outcomeSlotCount);
        for(uint i = 0; i < outcomeSlotCount; i++) {
            partition[i] = 1 << i;
        }
    }

    function generateAtomicPositionId(uint i)
        internal
        view
        returns (uint)
    {
        return positionIds[i];
    }

    function splitPositionThroughAllConditions(uint amount)
        private
    {
        for(uint i = conditionIds.length - 1; int(i) >= 0; i--) {
            uint[] memory partition = generateBasicPartition(outcomeSlotCounts[i]);
            for(uint j = 0; j < collectionIds[i].length; j++) {
                pmSystem.splitPosition(collateralToken, collectionIds[i][j], conditionIds[i], partition, amount);
            }
        }
    }

    function mergePositionsThroughAllConditions(uint amount)
        private
    {
        for(uint i = 0; i < conditionIds.length; i++) {
            uint[] memory partition = generateBasicPartition(outcomeSlotCounts[i]);
            for(uint j = 0; j < collectionIds[i].length; j++) {
                pmSystem.mergePositions(collateralToken, collectionIds[i][j], conditionIds[i], partition, amount);
            }
        }
    }
}