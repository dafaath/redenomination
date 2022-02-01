import createHttpError from "http-errors";
import { errorReturnHandler, errorThrowUtils } from "../common/utils/error";
import { lock } from "../common/utils/lock";
import { isRedenominationNumber } from "../common/utils/other";
import { validatePrice } from "../common/utils/redenomination";
import Bargain from "../db/entities/bargain.entity";
import Buyer from "../db/entities/buyer.entity";
import Phase, { PhaseType } from "../db/entities/phase.entity";
import Seller from "../db/entities/seller.entity";
import Transaction from "../db/entities/transaction.entity";
import { PostedOffer, postedOffers } from "../db/shortLived";

export async function inputSellerPrice(
  socketId: string,
  price: number,
  phaseId: string
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

    const phase = await Phase.findOne({ id: phaseId });
    if (!phase) {
      throw createHttpError(404, `There is no phase with id ${phaseId}`);
    }

    const priceAdjusted = validatePrice(phase, seller, price);

    const postedOffer = new PostedOffer(seller.id, priceAdjusted, phaseId);
    const bargain = Bargain.create({
      phase: phase,
      seller: seller,
      postedBy: seller.id,
      price: price,
    });

    await bargain.save();

    postedOffers.push(postedOffer);
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
