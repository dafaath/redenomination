import createHttpError from "http-errors";
import { errorReturnHandler } from "../common/utils/error";
import { lock } from "../common/utils/lock";
import Buyer from "../db/entities/buyer.entity";
import Phase from "../db/entities/phase.entity";
import Seller from "../db/entities/seller.entity";
import Transaction from "../db/entities/transaction.entity";
import { PostedOffer, postedOffers } from "../db/shortLived";

export async function inputSellerPrice(
  socketId: string,
  price: number
): Promise<Array<PostedOffer> | Error> {
  try {
    const seller = await Seller.findOne(
      { socketId: socketId },
      {
        relations: ["simulation"],
      }
    );
    if (!seller) {
      throw createHttpError(
        403,
        "This socket has not been logged in or not a seller"
      );
    }

    const postedOffer = new PostedOffer(seller.id, price);

    postedOffers.push(postedOffer);
    return postedOffers;
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
      const postedOfferIndex = postedOffers.findIndex(
        (po) => po.id === postedOfferId
      );

      if (postedOfferIndex === -1) {
        throw createHttpError(
          404,
          "There is no postedOfferId with value " + postedOfferId
        );
      }

      const isSold = postedOffers[postedOfferIndex].isSold;
      if (isSold) {
        throw createHttpError(403, "This offer has been sold");
      }

      postedOffers[postedOfferIndex].buyerId = buyer.id;
      postedOffers[postedOfferIndex].isSold = true;

      const seller = await Seller.findOne(
        postedOffers[postedOfferIndex].sellerId
      );
      const phase = await Phase.findOne(phaseId);
      const price = postedOffers[postedOfferIndex].price;

      const transaction = Transaction.create({
        buyer: buyer,
        seller: seller,
        price: price,
        phase: phase,
      });

      await transaction.save();

      done();
    });

    return postedOffers;
  } catch (error) {
    return errorReturnHandler(error);
  }
}
