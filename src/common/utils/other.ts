import createHttpError from "http-errors";
import Phase, { PhaseType } from "../../db/entities/phase.entity";

export function randomString(length: number) {
  let result = "";
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

export function getNumberDigit(number: number): number {
  let numberString = number.toString();
  if (numberString.includes(".")) {
    numberString = numberString.split(".").reverse().pop() as string;
  }
  return numberString.length;
}

export function isRedenominationNumber(
  price: number,
  unitCostOrValue: number
): boolean {
  const unitCostOrValueDigit = getNumberDigit(unitCostOrValue);
  const priceDigit = getNumberDigit(price);
  if (unitCostOrValueDigit - 2 >= priceDigit) {
    return true;
  } else {
    return false;
  }
}

export function getRandomNumberBetween(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function sortPhases(phases: Phase[]): Phase[] {
  const phase0 = phases.find((item) => { return item.phaseType === PhaseType.PRE_REDENOM_PRICE })
  if (!phase0) { throw createHttpError(404, "no preRedenomPrice phase"); }
  const phase1 = phases.find((item) => { return item.phaseType === PhaseType.TRANSITION_PRICE })
  if (!phase1) { throw createHttpError(404, "no transitionPrice phase"); }
  const phase2 = phases.find((item) => { return item.phaseType === PhaseType.POST_REDENOM_PRICE })
  if (!phase2) { throw createHttpError(404, "no postRedenomPrice phase"); }
  return [phase0, phase1, phase2];
}