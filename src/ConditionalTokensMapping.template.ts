import { Address, BigDecimal, BigInt, log } from "@graphprotocol/graph-ts";

import {
  ConditionPreparation,
  ConditionResolution,
  PayoutRedemption
} from "../generated/ConditionalTokens/ConditionalTokens";
import {
  Condition,
  FixedProductMarketMaker,
} from "../generated/schema";
import { SHARES_TYPE_REDEEM, zero } from "./utils/constants";
import { setLiquidity, updateBalance } from "./utils/fpmm";
import { requireGlobal } from "./utils/global";
import { requireToken } from "./utils/token";

export function handleConditionPreparation(event: ConditionPreparation): void {
  let condition = new Condition(event.params.conditionId.toHexString());
  condition.oracle = event.params.oracle;
  condition.questionId = event.params.questionId;

  let global = requireGlobal();
  global.numConditions++;
  global.numOpenConditions++;
  global.save();

  condition.outcomeSlotCount = event.params.outcomeSlotCount.toI32();
  condition.save();
}

export function handleConditionResolution(event: ConditionResolution): void {
  let conditionId = event.params.conditionId.toHexString();
  let condition = Condition.load(conditionId);
  if (condition == null) {
    log.error("could not find condition {} to resolve", [conditionId]);
    return;
  }

  let global = requireGlobal();
  global.numOpenConditions--;
  global.numClosedConditions++;
  global.save();

  if (condition.resolutionTimestamp != null || condition.payouts != null) {
    log.error("should not be able to resolve condition {} more than once", [
      conditionId,
    ]);
    return;
  }

  condition.resolutionTimestamp = event.block.timestamp;

  let payoutNumerators = event.params.payoutNumerators;
  let payoutDenominator = zero;
  for (let i = 0; i < payoutNumerators.length; i++) {
    payoutDenominator = payoutDenominator.plus(payoutNumerators[i]);
  }
  let payoutDenominatorDec = payoutDenominator.toBigDecimal();
  let payouts = new Array<BigDecimal>(payoutNumerators.length);
  for (let i = 0; i < payouts.length; i++) {
    payouts[i] = payoutNumerators[i].divDecimal(payoutDenominatorDec);
  }
  condition.payouts = payouts;

  condition.save();
}

export function handlePayoutRedemption(event: PayoutRedemption): void {

  // get Condition object from event
  let conditionId = event.params.conditionId.toHexString();
  let condition = Condition.load(conditionId);
  if (condition == null) {
    log.error("could not find condition {} to resolve", [conditionId]);
    return;
  }



  // set all share balances to 0 for the user
  updateBalance(
    condition as Condition,
    event.params.redeemer.toHexString(),
    [],
    SHARES_TYPE_REDEEM
  );

  condition.save();
}



