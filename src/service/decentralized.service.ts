import createHttpError from "http-errors";
import { errorReturnHandler, errorThrowUtils } from "../common/utils/error";
import { lock } from "../common/utils/lock";
import { validatePrice } from "../common/utils/redenomination";
import Bargain from "../db/entities/bargain.entity";
import Buyer from "../db/entities/buyer.entity";
import Phase from "../db/entities/phase.entity";
import Profit from "../db/entities/profit.entity";
import Seller from "../db/entities/seller.entity";
import Session from "../db/entities/session.entity";
import Simulation from "../db/entities/simulation.entity";
import Transaction from "../db/entities/transaction.entity";
import { Decentralized, decentralizeds } from "../db/shortLived";

export async function inputSellerPrice(
  socketId: string,
  price: number,
  phaseId: string
): Promise<Array<Decentralized> | Error> {
  try {
    const seller = await Seller.findOne(
      { socketId: socketId },
      { relations: ["simulation"] }
    );
    if (!seller) {
      throw createHttpError(
        403,
        "This socket has not been logged in or not a seller"
      );
    }
    const phase = await Phase.findOne({ id: phaseId });
    if (!phase) {
      throw createHttpError(404, `There is no phase with id ${phaseId}`);
    }

    await lock.acquire("decentralizedInput", async (done) => {
      try {
        const decentralizedIndex = decentralizeds.findIndex(
          (item) => item.sellerId === seller.id && item.phaseId === phaseId
        );
        if (decentralizedIndex === -1) {
          const priceAdjusted = validatePrice(phase, seller, price);

          const bargain = Bargain.create({
            phase: phase,
            seller: seller,
            postedBy: seller.id,
            price: priceAdjusted,
          });
          await bargain.save();

          const decentralized = new Decentralized(
            seller.id,
            priceAdjusted,
            phaseId
          );
          decentralizeds.push(decentralized);
        }

        done();
      } catch (error) {
        if (error instanceof Error) {
          done(error);
        }
        errorThrowUtils(error);
      }
    });

    return decentralizeds.filter((po) => po.phaseId === phaseId);
  } catch (error) {
    return errorReturnHandler(error);
  }
}

export async function buyDecentralized(
  decentralizedId: string,
  socketId: string,
  phaseId: string
): Promise<Array<Decentralized> | Error> {
  try {
    const buyer = await Buyer.findOne(
      { socketId: socketId },
      {
        relations: ["simulation"],
      }
    );

    if (!buyer) {
      throw createHttpError(
        403,
        "This socket has not been logged in or not a buyer"
      );
    }

    await lock.acquire("decentralizeds", async (done) => {
      try {
        const decentralizedIndex = decentralizeds.findIndex(
          (po) => po.id === decentralizedId
        );

        if (decentralizedIndex === -1) {
          throw createHttpError(
            404,
            "There is no decentralizedId with value " + decentralizedId
          );
        }

        const hasBuyed =
          decentralizeds.findIndex((ds) => ds.buyerId === buyer.id) !== -1;

        if (hasBuyed) {
          throw createHttpError(403, "You can only bought once");
        }

        const isSold = decentralizeds[decentralizedIndex].isSold;
        if (isSold) {
          throw createHttpError(403, "This offer has been sold");
        }

        const dsPrice = decentralizeds[decentralizedIndex].price;
        if (dsPrice > buyer.unitValue) {
          throw createHttpError(
            403,
            `You cannot buy this(${dsPrice}) because it exceed your unit value(${buyer.unitValue})`
          );
        }

        decentralizeds[decentralizedIndex].buyerId = buyer.id;
        decentralizeds[decentralizedIndex].isSold = true;

        const seller = await Seller.findOne(
          decentralizeds[decentralizedIndex].sellerId
        );
        const price = decentralizeds[decentralizedIndex].price;
        const phase = await Phase.findOne(phaseId, { relations: ["session"] });
        if (!phase) {
          throw createHttpError(404, `There is no phase with id ${phaseId}`);
        }

        const transaction = Transaction.create({
          buyer: buyer,
          seller: seller,
          price: price,
          phase: phase,
        });
        await transaction.save();

        const successBuyer = Profit.create({
          session: phase.session,
          username: buyer.username!,
          unitValue: buyer.unitValue,
          price: price,
          profit: buyer.unitValue - price,
        });
        await successBuyer.save();

        if (seller) {
          const successSeller = Profit.create({
            session: phase.session,
            username: seller.username!,
            unitCost: seller.unitCost,
            price: price,
            profit: price - seller.unitCost,
          });
          await successSeller.save();
        }

        done();
      } catch (error) {
        if (error instanceof Error) {
          done(error);
        }
        errorThrowUtils(error);
      }
    });

    return decentralizeds.filter((ds) => ds.phaseId === phaseId);
  } catch (error) {
    return errorReturnHandler(error);
  }
}

export async function checkIfIsDone(
  phaseId: string,
  decentralizedsNumber: number
): Promise<Boolean | Error> {
  try {
    const phase = await Phase.findOne(phaseId, {
      relations: [
        "session",
        "session.simulation",
        "session.simulation.sellers",
      ],
    });
    if (!phase) {
      throw createHttpError(404, `There is no phase with id ${phaseId}`);
    }

    const sellerNumber = phase.session.simulation.sellers.length;

    if (decentralizedsNumber === sellerNumber) {
      return true;
    }

    return false;
  } catch (error) {
    return errorReturnHandler(error);
  }
}

export async function requestListDS(
  phaseId: string
): Promise<Array<Decentralized> | Error> {
  try {
    const phase = await Phase.findOne({ id: phaseId });
    if (!phase) {
      throw createHttpError(404, `There is no phase with id ${phaseId}`);
    }

    return decentralizeds.filter((ds) => ds.phaseId === phaseId);
  } catch (error) {
    return errorReturnHandler(error);
  }
}
