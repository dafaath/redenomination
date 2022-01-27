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
