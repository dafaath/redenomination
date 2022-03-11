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
import { PostedOffer, postedOffers } from "../db/shortLived";

export async function inputSellerPrice(
  socketId: string,
  price: number,
  phaseId: string
): Promise<Array<PostedOffer> | Error> {
  try {
    const seller = await Seller.findOne({ socketId: socketId }, { relations: ["simulation"], });
    if (!seller) { throw createHttpError(403, "This socket has not been logged in or not a seller"); }
    const phase = await Phase.findOne({ id: phaseId });
    if (!phase) { throw createHttpError(404, `There is no phase with id ${phaseId}`); }

    const postedOfferIndex = postedOffers.findIndex((item) => { return ((item.sellerId === seller.id) && (item.phaseId === phaseId)) });
    if (postedOfferIndex === -1) {
      const priceAdjusted = validatePrice(phase, seller, price);

      const bargain = Bargain.create({
        phase: phase,
        seller: seller,
        postedBy: seller.id,
        price: priceAdjusted,
      });
      await bargain.save();

      const postedOffer = new PostedOffer(seller.id, priceAdjusted, phaseId);
      postedOffers.push(postedOffer);
    }

    return postedOffers.filter((po) => po.phaseId === phaseId);
  } catch (error) {
    return errorReturnHandler(error);
  }
}

export async function buyPostedOffer(
  postedOfferId: string,
  socketId: string,
  phaseId: string
): Promise<Array<PostedOffer> | Error> {
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

    await lock.acquire("postedOffers", async (done) => {
      try {
        const postedOfferIndex = postedOffers.findIndex(
          (po) => po.id === postedOfferId
        );

        if (postedOfferIndex === -1) {
          throw createHttpError(
            404,
            "There is no postedOfferId with value " + postedOfferId
          );
        }

        const hasBuyed =
          postedOffers.findIndex((po) => po.buyerId === buyer.id) !== -1;

        if (hasBuyed) {
          throw createHttpError(403, "You can only bought once");
        }

        const isSold = postedOffers[postedOfferIndex].isSold;
        if (isSold) {
          throw createHttpError(403, "This offer has been sold");
        }

        const poPrice = postedOffers[postedOfferIndex].price;
        if (poPrice > buyer.unitValue) {
          throw createHttpError(
            403,
            `You cannot buy this(${poPrice}) because it exceed your unit value(${buyer.unitValue})`
          );
        }

        postedOffers[postedOfferIndex].buyerId = buyer.id;
        postedOffers[postedOfferIndex].isSold = true;

        const seller = await Seller.findOne(
          postedOffers[postedOfferIndex].sellerId
        );
        const price = postedOffers[postedOfferIndex].price;
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

        const successBuyer = Profit.create({
          session: phase.session,
          username: buyer.username!,
          unitValue: buyer.unitValue,
          price: price,
          profit: buyer.unitValue - price,
        })
        await successBuyer.save();

        if (seller) {
          const successSeller = Profit.create({
            session: phase.session,
            username: seller.username!,
            unitCost: seller.unitCost,
            price: price,
            profit: price - seller.unitCost,
          })
          await successSeller.save();
        }

        await transaction.save();

        done();
      } catch (error) {
        if (error instanceof Error) {
          done(error);
        }
        errorThrowUtils(error);
      }
    });

    return postedOffers.filter((po) => po.phaseId === phaseId);
  } catch (error) {
    return errorReturnHandler(error);
  }
}

export async function checkIfIsDone(
  phaseId: string,
  postedOffersNumber: number,
): Promise<Boolean | Error> {
  try {
    const phase = await Phase.findOne(phaseId, {
      relations: ["session"],
    });
    if (!phase) {
      throw createHttpError(404, `There is no phase with id ${phaseId}`);
    }

    const session = await Session.findOne(phase.session.id, {
      relations: ["simulation"],
    });
    if (!session) {
      throw createHttpError(404, `There is no session with id ${phase.session.id}`);
    }

    const simulation = await Simulation.findOne(session.simulation.id, {
      relations: ["sellers"],
    });
    if (!simulation) {
      throw createHttpError(404, `There is no session with id ${session.simulation.id}`);
    }

    const sellerNumber = simulation.sellers.length;

    if (postedOffersNumber === sellerNumber) {
      return true;
    }

    return false;
  } catch (error) {
    return errorReturnHandler(error);
  }
}

export async function requestList(
  phaseId: string
): Promise<Array<PostedOffer> | Error> {
  try {
    const phase = await Phase.findOne({ id: phaseId });
    if (!phase) { throw createHttpError(404, `There is no phase with id ${phaseId}`); }

    return postedOffers.filter((po) => po.phaseId === phaseId);
  } catch (error) {
    return errorReturnHandler(error);
  }
}
