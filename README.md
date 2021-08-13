# OpenMarket Subgraph

This repo defines a subgraph which is used by OpenMarket.


# Quickstart

You must have docker installed.
The `docker-compose.yml` contains a Docker Compose configuration suitable for spinning up a test environment. 

```bash
docker-compose down
docker-compose up # spins up docker as a graph server + ganache blockchain
yarn migrate      # build contracts, deploy on chain
yarn codegen      # Create Graph code from contracts
yarn build        # Build graph code
yarn create-local # Create subgraph
yarn deploy-local # deploy subgraph
```

## Code templates

Some parts of the configuration and mapping code depend on the addresses of specific contracts on the chain or which network the subgraph is being run on. In those instances, a Truffle script `render-templates.js` is executed to render certain `<file>.template.<ext>` files into their `<file>.<ext>` counterparts. The templates themselves are just Mustache templates, and the parameters are gotten from the Web3 provider's view of the connected network and the various Truffle artifacts which result from either running the migrations that deploy the necessary contracts onto the test chain or injecting canonical information about public contracts from the `networks.json` file into these artifacts.

## Entities

### Condition

Represents conditions on the Conditional Tokens contract.

* `id` - condition ID on the Conditional Tokens.
* `oracle` - oracle account of the condition.
* `questionId` - question ID of the condition.
* `question` - if the oracle is the Realitio to Conditional Tokens oracle adapter, this field is the associated Realitio Question entity. For scalar markets, this question's ID on Realitio differs from the `questionId` field above which is used in the ConditionalTokens contract, as the condition's `questionId` field also has the scalar market's bounds hashed into it.
* `outcomeSlotCount` - outcome slot count of the condition.
* `resolutionTimestamp` - unix timestamp marking when this condition got resolved.
* `payouts` - array of payouts for each outcome slot reported by the oracle.

### FixedProductMarketMaker

Represents a `FixedProductMarketMaker`, an automated market maker which buys and sells conditional tokens for their backing collateral token.

* `id` - address of the market maker contract.
* `creator` - address of the account which created the market maker.
* `creationTimestamp` - unix timestamp marking when this market maker was created.
* `collateralToken` - address of the collateral token.
* `conditions` - the conditions associated with this market maker. The conditional tokens traded by this FPMM are split through all these conditions.
* `fee` - a proportion of each trade with this market maker gets retained as collateral token that is added to the fee pool. This value is a BigInt and should be interpreted as a proportion out of 10^18.
* `collateralVolume` - the amount of collateral this market maker has traded so far. This does not include fees, and is denoted in the collateral's native units.
* `outcomeTokenAmounts` - the amount of conditional tokens held in this market maker's liquidity pool.
* `outcomeTokenMarginalPrices` - the marginal prices of the aforementioned outcome tokens, which may be used to derive event probability or expected value estimates.
* `outcomeSlotCount` - the number of different outcome tokens traded by this market maker. Is the product of the outcome slot counts of every condition associated with this FPMM.
* `liquidityMeasure` - the sum of outcome token amounts and their respective marginal prices. Used to estimate the value held in the liquidity pool.
* `liquidityParameter` - the nth root of the product of the outcome token amounts. A different measure of the depth of the liquidity pool.
* `lastActiveDay` - the floor(unix timestamp marking of the last trade / 86400), used to help figure out daily volume.
* `collateralVolumeBeforeLastActiveDay` - a snapshot of the collateral volume before the start of the last active day. Aids in computing the `runningDailyVolume`
* `runningDailyVolume` - collateralVolume between the start of the `lastActiveDay` and the last trade. May actually be the running volume of a previous day.
* `lastActiveDayAndRunningDailyVolume` - field combining `lastActiveDay` in the high bits with `runningDailyVolume` in the low bits.
* `scaledCollateralVolume`, `scaledLiquidityMeasure`, `scaledLiquidityParameter`, `scaledRunningDailyVolume` - scaled versions of their respective fields accounting for the `decimals` of the collateral token. If the `decimals` value cannot be obtained from the contract, will default to scaling these values as if they have 18 decimal points.
* `lastActiveDayAndScaledRunningDailyVolume` - same as `lastActiveDayAndRunningDailyVolume` except the `runningDailyVolume` gets scaled to have 6 decimals from whatever the contract native value is. This is mainly here in order to allow sorting by 24-hour volume.
* `curatedByDxDao` - denotes whether this particular FPMM has been curated by the DxDAO.
* `condition` - if this FPMM's conditions has only a single element, that condition is copied here.
* `question` - if this FPMM has only a single condition, and that condition is linked to a Realitio question, then this question is linked here.
* `templateId`, `data`, `title`, `outcomes`, `category`, `language`, `arbitrator`, `openingTimestamp`, `timeout` - copied from a linked question if possible.
* `indexedOnQuestion` - if at the creation of this FPMM, a linked Question entity is successfully found, and this FPMM is one of the first 100 FPMMs linked to this question, then this flag is set to true, and the FPMM is appended to the question entity's `indexedFixedProductMarketMakers` field.
* `resolutionTimestamp`, `payouts` - if this FPMM is `indexedOnQuestion`, these fields are actively mirrored from the associated `condition`.
* `currentAnswer`, `currentAnswerBond`, `currentAnswerTimestamp`, `isPendingArbitration`, `arbitrationOccurred`, `answerFinalizedTimestamp` - if this FPMM is `indexedOnQuestion`, these fields are actively mirrored from the associated `question`.

### FPMMTrade

Represents a trade on a given `FixedProductMarketMaker`, the market maker with a buy or a sell conditional tokens.

* `id` - address of the trade.
* `creator` - address of the user.
* `creationTimestamp` - unix timestamp.
* `type` - Sell or Buy type
* `fpmm` - The FixedProductMarketMaker.
* `title` - The Question title.
* `collateralToken` - The collateral token for the FixedProductMarketMaker market.
* `investmentAmount` - the amount of the trade.
* `feeAmount` - fee on the market for the trade.
* `outcomeIndex` - the traded outcome.
- `outcomeTokensBought` - amount of the outcome tokens bought on the trade.