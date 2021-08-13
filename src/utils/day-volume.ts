import { BigInt, Bytes, BigDecimal } from "@graphprotocol/graph-ts";

let twoPow256Bytes = new Uint8Array(33) as Bytes;
twoPow256Bytes.fill(0);
twoPow256Bytes[32] = 1;
let twoPow256 = BigInt.fromUnsignedBytes(twoPow256Bytes);
let scaledVolumeGranularity = BigInt.fromI32(1000000);
let usdVolumeCap = BigDecimal.fromString("1000000000000000");

export function joinDayAndVolume(day: BigInt, volume: BigInt): BigInt {
  return day.times(twoPow256).plus(volume);
}

export function joinDayAndScaledVolume(
  day: BigInt,
  volume: BigInt,
  collateralScale: BigInt
): BigInt {
  return day
    .times(twoPow256)
    .times(scaledVolumeGranularity)
    .plus(volume.times(scaledVolumeGranularity).div(collateralScale));
}

export function joinDayAndUsdVolume(
  day: BigInt,
  volume: BigDecimal
): BigDecimal {
  return day.toBigDecimal().times(usdVolumeCap).plus(volume);
}
