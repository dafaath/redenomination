import createHttpError from "http-errors";
import { errorReturnHandler, errorThrowUtils } from "../common/utils/error";
import { lock } from "../common/utils/lock";
import { isRedenominationNumber } from "../common/utils/other";
import Phase, { PhaseType } from "../db/entities/phase.entity";
import Seller from "../db/entities/seller.entity";
import { DoubleAuction, doubleAuctions } from "../db/shortLived";

export async function inputSellerMinimumPrice(
  price: number,
  socketId: string,
  phaseId: string
): Promise<Array<DoubleAuction> | Error> {
  try {
    const seller = await Seller.findOne(
      { socketId: socketId },
      {
        relations: ["simulation", "simulation.buyers"],
      }
    );
    if (!seller) {
      throw createHttpError(403, `You are not a seller or have not logged in`);
    }

    const phase = await Phase.findOne({ id: phaseId });
    if (!phase) {
      throw createHttpError(404, `There is no phase with id ${phaseId}`);
    }

    let priceUpdated = price;

    if (phase.phaseType === PhaseType.PRE_REDENOM_PRICE) {
      if (isRedenominationNumber(price, seller.unitCost)) {
        throw createHttpError(
          400,
          `in phase ${phase.phaseType} price(${price}) must NOT be a redenomination number`
        );
      }

      if (seller.unitCost > price) {
        throw createHttpError(
          400,
          `price(${price}) must be higher than seller unit cost(${seller.unitCost})`
        );
      }
    } else if (phase.phaseType === PhaseType.TRANSITION_PRICE) {
      if (isRedenominationNumber(price, seller.unitCost)) {
        const unitCostComparator = seller.unitCost / 1000;
        if (unitCostComparator > price) {
          throw createHttpError(
            400,
            `price(${price}) must be higher than seller unit cost(${unitCostComparator})`
          );
        }

        priceUpdated = price * 1000;
      } else {
        if (seller.unitCost > price) {
          throw createHttpError(
            400,
            `price(${price}) must be higher than seller unit cost(${seller.unitCost})`
          );
        }
      }
    } else if (phase.phaseType === PhaseType.POST_REDENOM_PRICE) {
      if (!isRedenominationNumber(price, seller.unitCost)) {
        throw createHttpError(
          400,
          `in phase ${phase.phaseType} price(${price}) must be a redenomination number`
        );
      }
      const unitCostComparator = seller.unitCost / 1000;
      if (unitCostComparator > price) {
        throw createHttpError(
          400,
          `price(${price}) must be higher than seller unit cost(${unitCostComparator})`
        );
      }

      priceUpdated = price * 1000;
    }

    await lock.acquire("doubleAuction", async (done) => {
      try {
        const doubleAuction = new DoubleAuction(
          seller.id,
          priceUpdated,
          phaseId,
          seller.simulation.buyers
        );
        doubleAuctions.push(doubleAuction);

        done();
      } catch (error) {
        if (error instanceof Error) {
          done(error);
        }
        errorThrowUtils(error);
      }
    });

    return doubleAuctions;
  } catch (error) {
    return errorReturnHandler(error);
  }
}
