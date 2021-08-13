import { BigInt } from "@graphprotocol/graph-ts";

export let zero = BigInt.fromI32(0);
export let one = BigInt.fromI32(1);
export let ten = BigInt.fromI32(10);
export let secondsPerHour = BigInt.fromI32(3600);
export let hoursPerDay = BigInt.fromI32(24);

export let zeroDec = zero.toBigDecimal();
export let oneDec = one.toBigDecimal();

export let TRADE_TYPE_BUY = "Buy";
export let TRADE_TYPE_SELL = "Sell";
export let LIQUIDITY_TYPE_ADD = "Add";
export let LIQUIDITY_TYPE_REMOVE = "Remove";
export let FPMM_TYPE_TRADE = "Trade";
export let FPMM_TYPE_LIQUIDITY = "Liquidity";
export let SHARES_TYPE_ADD = "Add";
export let SHARES_TYPE_SUB = "Sub";
export let SHARES_TYPE_REDEEM = "Redeem";
