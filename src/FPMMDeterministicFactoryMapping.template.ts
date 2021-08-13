import { BigInt, log, Address, BigDecimal } from "@graphprotocol/graph-ts";

import { FixedProductMarketMakerCreation } from "../generated/FPMMDeterministicFactory/FPMMDeterministicFactory";
import {
  FixedProductMarketMaker,
  Condition,
} from "../generated/schema";
import { FixedProductMarketMaker as FixedProductMarketMakerTemplate } from "../generated/templates";
import { zero, secondsPerHour, hoursPerDay, zeroDec } from "./utils/constants";
import { joinDayAndVolume } from "./utils/day-volume";
import { updateScaledVolumes, setLiquidity } from "./utils/fpmm";
import { requireToken } from "./utils/token";
import { requireGlobal } from "./utils/global";

export function handleFixedProductMarketMakerCreation(
  event: FixedProductMarketMakerCreation
): void {
  let address = event.params.fixedProductMarketMaker;
  let addressHexString = address.toHexString();
  let conditionalTokensAddress = event.params.conditionalTokens.toHexString();

  if (conditionalTokensAddress != "{{ConditionalTokens.addressLowerCase}}") {
    log.info("cannot index market maker {}: using conditional tokens {}", [
      addressHexString,
      conditionalTokensAddress,
    ]);
    return;
  }

  let fpmm = new FixedProductMarketMaker(addressHexString);

  fpmm.creator = event.params.creator;
  fpmm.creationTimestamp = event.block.timestamp;

  fpmm.collateralToken = event.params.collateralToken;
  fpmm.fee = event.params.fee;

  let conditionIds = event.params.conditionIds;
  let outcomeTokenCount = 1;
  let conditionIdStrs = new Array<string>(conditionIds.length);
  for (let i = 0; i < conditionIds.length; i++) {
    let conditionIdStr = conditionIds[i].toHexString();

    let condition = Condition.load(conditionIdStr);
    if (condition == null) {
      log.error("failed to create market maker {}: condition {} not prepared", [
        addressHexString,
        conditionIdStr,
      ]);
      return;
    }

    outcomeTokenCount *= condition.outcomeSlotCount;
    conditionIdStrs[i] = conditionIdStr;
  }
  fpmm.conditions = conditionIdStrs;
  fpmm.outcomeSlotCount = outcomeTokenCount;
  fpmm.indexedOnQuestion = false;

  if (conditionIdStrs.length == 1) {
    let conditionIdStr = conditionIdStrs[0];
    fpmm.condition = conditionIdStr;

    let condition = Condition.load(conditionIdStr);
    if (condition == null) {
      log.error("failed to create market maker {}: condition {} not prepared", [
        addressHexString,
        conditionIdStr,
      ]);
      return;
    }

    fpmm.scalarLow = condition.scalarLow;
    fpmm.scalarHigh = condition.scalarHigh;
  }

  let outcomeTokenAmounts = new Array<BigInt>(outcomeTokenCount);
  for (let i = 0; i < outcomeTokenAmounts.length; i++) {
    outcomeTokenAmounts[i] = zero;
  }

  let collateral = requireToken(fpmm.collateralToken as Address);
  let collateralScale = collateral.scale;
  let collateralScaleDec = collateralScale.toBigDecimal();
  let ethPerCollateral = collateral.ethPerToken;
  let usdPerEth = requireGlobal().usdPerEth;
  let collateralUSDPrice =
    ethPerCollateral != null && usdPerEth != null
      ? ethPerCollateral.times(usdPerEth as BigDecimal)
      : zeroDec;
  setLiquidity(
    fpmm,
    outcomeTokenAmounts,
    collateralScaleDec,
    collateralUSDPrice
  );

  let currentHour = event.block.timestamp.div(secondsPerHour);
  let currentDay = currentHour.div(hoursPerDay);
  let currentHourInDay = currentHour
    .minus(currentDay.times(hoursPerDay))
    .toI32();
  if (currentHourInDay < 0 || currentHourInDay >= 24) {
    log.error("current hour in day is {}", [
      BigInt.fromI32(currentHourInDay).toString(),
    ]);
    return;
  }

  fpmm.lastActiveHour = currentHour;
  fpmm.lastActiveDay = currentDay;
  let zeroes = new Array<BigInt>(24);
  for (let i = 0; i < 24; i++) {
    zeroes[i] = zero;
  }
  let zeroDecs = new Array<BigDecimal>(24);
  for (let i = 0; i < 24; i++) {
    zeroDecs[i] = zeroDec;
  }

  fpmm.collateralVolumeBeforeLastActiveDayByHour = zeroes;
  fpmm.usdVolumeBeforeLastActiveDayByHour = zeroDecs;

  fpmm.collateralVolume = zero;
  fpmm.usdVolume = zeroDec;
  fpmm.runningDailyVolumeByHour = zeroes;
  fpmm.usdRunningDailyVolumeByHour = zeroDecs;
  fpmm.runningDailyVolume = zero;
  fpmm.usdRunningDailyVolume = zeroDec;

  fpmm.lastActiveDayAndRunningDailyVolume = joinDayAndVolume(currentDay, zero);

  updateScaledVolumes(
    fpmm,
    collateralScale,
    collateralScaleDec,
    zeroDecs,
    currentDay,
    currentHourInDay
  );

  fpmm.save();

  FixedProductMarketMakerTemplate.create(address);
}
