import createHttpError from "http-errors";
import Buyer from "../../db/entities/buyer.entity";
import Phase, { PhaseType } from "../../db/entities/phase.entity";
import Seller from "../../db/entities/seller.entity";
import { isRedenominationNumber } from "./other";

export function validatePrice(
  phase: Phase,
  user: Buyer | Seller,
  price: number
): number {
  let priceAdjusted = price;
  let unitValueOrCost: number;
  if (user instanceof Buyer) {
    unitValueOrCost = user.unitValue;
  } else {
    unitValueOrCost = user.unitCost;
  }

  if (phase.phaseType === PhaseType.PRE_REDENOM_PRICE) {
    if (isRedenominationNumber(price, unitValueOrCost)) {
      throw createHttpError(
        400,
        `in phase ${phase.phaseType} price(${price}) must NOT be a redenomination number`
      );
    }

    if (user instanceof Seller) {
      if (unitValueOrCost > price) {
        throw createHttpError(
          400,
          `price(${price}) must be higher than seller unit cost(${unitValueOrCost})`
        );
      }
    } else {
      if (unitValueOrCost < price) {
        throw createHttpError(
          400,
          `price(${price}) must be lower than buyer unit value(${unitValueOrCost})`
        );
      }
    }
  } else if (phase.phaseType === PhaseType.TRANSITION_PRICE) {
    if (isRedenominationNumber(price, unitValueOrCost)) {
      const unitValueOrCostComparator = unitValueOrCost / 1000;

      if (user instanceof Seller) {
        if (unitValueOrCostComparator > price) {
          throw createHttpError(
            400,
            `price(${price}) must be higher than seller unit cost(${unitValueOrCostComparator})`
          );
        }
      } else {
        if (unitValueOrCostComparator < price) {
          throw createHttpError(
            400,
            `price(${price}) must be lower than buyer unit value(${unitValueOrCost})`
          );
        }
      }

      priceAdjusted = price * 1000;
    } else {
      if (user instanceof Seller) {
        if (unitValueOrCost > price) {
          throw createHttpError(
            400,
            `price(${price}) must be higher than seller unit cost(${unitValueOrCost})`
          );
        }
      } else {
        if (unitValueOrCost < price) {
          throw createHttpError(
            400,
            `price(${price}) must be lower than buyer unit value(${unitValueOrCost})`
          );
        }
      }
    }
  } else if (phase.phaseType === PhaseType.POST_REDENOM_PRICE) {
    if (!isRedenominationNumber(price, unitValueOrCost)) {
      throw createHttpError(
        400,
        `in phase ${phase.phaseType} price(${price}) must be a redenomination number`
      );
    }
    const unitValueOrCostComparator = unitValueOrCost / 1000;
    if (user instanceof Seller) {
      if (unitValueOrCostComparator > price) {
        throw createHttpError(
          400,
          `price(${price}) must be higher than seller unit cost(${unitValueOrCostComparator})`
        );
      }
    } else {
      if (unitValueOrCostComparator < price) {
        throw createHttpError(
          400,
          `price(${price}) must be lower than buyer unit value(${unitValueOrCost})`
        );
      }
    }

    priceAdjusted = price * 1000;
  }
  return priceAdjusted;
}
