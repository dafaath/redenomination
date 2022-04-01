import createHttpError from "http-errors";
import { errorReturnHandler, errorThrowUtils } from "../common/utils/error";
import { lock } from "../common/utils/lock";
import log from "../common/utils/logger";
import { validatePrice } from "../common/utils/redenomination";
import Bargain from "../db/entities/bargain.entity";
import Buyer from "../db/entities/buyer.entity";
import Phase from "../db/entities/phase.entity";
import Profit from "../db/entities/profit.entity";
import Seller from "../db/entities/seller.entity";
import Transaction from "../db/entities/transaction.entity";
import {
  BuyerBid,
  doubleAuctionBids,
  SellerBid,
  doubleAuctionOffers,
  doubleAuctionBid,
  setDoubleAuctionBid,
  doubleAuctionOffer,
  setDoubleAuctionOffer,
} from "../db/shortLived";
import { deleteShortLivedData } from "./socket.service";

export async function inputSellerPrice(
  price: number,
  socketId: string,
  phaseId: string
): Promise<boolean | Error> {
  try {
    const seller = await Seller.findOne({ socketId: socketId });
    if (!seller) {
      throw createHttpError(403, `You are not a seller or have not logged in`);
    }

    const phase = await Phase.findOne({ id: phaseId });
    if (!phase) {
      throw createHttpError(404, `There is no phase with id ${phaseId}`);
    }

    const transaction = await Transaction.createQueryBuilder("transaction")
      .leftJoinAndSelect("transaction.seller", "seller")
      .where("seller.socketId=:socketId", { socketId })
      .andWhere("transaction.phase_id=:phaseId", { phaseId })
      .getOne();
    if (transaction) {
      throw createHttpError(403, `You already sold your item`);
    }

    const priceAdjusted = validatePrice(phase, seller, price);

    if (doubleAuctionOffer === 0 && doubleAuctionBid === 0) {
      setDoubleAuctionOffer(priceAdjusted);
    } else {
      if (priceAdjusted < doubleAuctionBid) {
        throw createHttpError(400, `Price out of range`);
      } else if (
        doubleAuctionOffer !== 0 &&
        priceAdjusted > doubleAuctionOffer
      ) {
        throw createHttpError(400, `Price out of range`);
      } else {
        setDoubleAuctionOffer(priceAdjusted);
      }
    }

    const bargain = Bargain.create({
      phase: phase,
      seller: seller,
      postedBy: seller.id,
      price: priceAdjusted,
    });
    await bargain.save();

    await lock.acquire("sellersOffer", async (done) => {
      try {
        const sellerBid = new SellerBid(phaseId, seller.id, priceAdjusted);

        const doubleAuctionOffersIndex = doubleAuctionOffers.findIndex(
          (item) => {
            return item.phaseId === phaseId;
          }
        );

        if (doubleAuctionOffersIndex !== -1) {
          doubleAuctionOffers[doubleAuctionOffersIndex] = sellerBid;
        } else {
          doubleAuctionOffers.push(sellerBid);
        }

        done();
      } catch (error) {
        if (error instanceof Error) {
          done(error);
        }
        errorThrowUtils(error);
      }
    });
    return true;
  } catch (error) {
    return errorReturnHandler(error);
  }
}

export async function checkIfSellerBidMatch(
  socketId: string,
  sellerBid: number,
  phaseId: string
): Promise<MatchData | Error> {
  try {
    let buyerBidMatchIndex = 0;
    let buyer: Buyer | undefined = undefined;
    let seller: Seller | undefined = undefined;
    let transaction: Transaction | undefined = undefined;

    await lock.acquire("buyersBid", async (done) => {
      try {
        const phase = await Phase.findOne(
          { id: phaseId },
          { relations: ["session"] }
        );
        if (!phase) {
          throw createHttpError(404, `There is no phase with id ${phaseId}`);
        }

        seller = await Seller.findOne({ socketId: socketId });
        if (!seller) {
          throw createHttpError(
            403,
            `You are not a seller or have not logged in`
          );
        }

        sellerBid = validatePrice(phase, seller, sellerBid);
        buyerBidMatchIndex = doubleAuctionBids
          .filter((bb) => bb.phaseId === phaseId)
          .findIndex((bb) => bb.price === sellerBid);

        if (buyerBidMatchIndex !== -1) {
          const buyerId = doubleAuctionBids[buyerBidMatchIndex].buyerId;
          buyer = await Buyer.findOne({ id: buyerId });
          if (!buyer) {
            throw createHttpError(404, `There is no buyer with id ${buyerId}`);
          }

          const sellerBidMatchIndex = doubleAuctionOffers
            .filter((sb) => sb.phaseId === phaseId)
            .findIndex((sb) => sb.sellerId === seller?.id);
          doubleAuctionBids.splice(buyerBidMatchIndex, 1);
          doubleAuctionOffers.splice(sellerBidMatchIndex, 1);

          const newTransaction = Transaction.create({
            phase: phase,
            price: sellerBid,
            seller: seller,
            buyer: buyer,
          });

          deleteShortLivedData(phaseId);

          const successBuyer = Profit.create({
            session: phase.session,
            username: buyer.username,
            unitValue: buyer.unitValue,
            price: sellerBid,
            profit: buyer.unitValue - sellerBid,
          });
          await successBuyer.save();

          const successSeller = Profit.create({
            session: phase.session,
            username: seller.username,
            unitCost: seller.unitCost,
            price: sellerBid,
            profit: sellerBid - seller.unitCost,
          });
          await successSeller.save();

          transaction = await newTransaction.save();
        }

        done();
      } catch (error) {
        if (error instanceof Error) {
          done(error);
        }
        errorThrowUtils(error);
      }
    });

    if (buyerBidMatchIndex !== -1) {
      return {
        match: true,
        buyer: buyer,
        seller: seller,
        transaction: transaction,
      };
    } else {
      return {
        match: false,
        buyer: undefined,
        seller: undefined,
        transaction: undefined,
      };
    }
  } catch (error) {
    return errorReturnHandler(error);
  }
}

export async function inputBuyerPrice(
  price: number,
  socketId: string,
  phaseId: string
): Promise<boolean | Error> {
  try {
    const buyer = await Buyer.findOne({ socketId: socketId });
    if (!buyer) {
      throw createHttpError(403, `You are not a buyer or have not logged in`);
    }

    const phase = await Phase.findOne({ id: phaseId });
    if (!phase) {
      throw createHttpError(404, `There is no phase with id ${phaseId}`);
    }

    const transaction = await Transaction.createQueryBuilder("transaction")
      .leftJoinAndSelect("transaction.buyer", "buyer")
      .where("buyer.socketId=:socketId", { socketId })
      .andWhere("transaction.phase_id=:phaseId", { phaseId })
      .getOne();
    if (transaction) {
      throw createHttpError(403, `You already bought your item`);
    }

    const priceAdjusted = validatePrice(phase, buyer, price);

    if (doubleAuctionOffer === 0 && doubleAuctionBid === 0) {
      setDoubleAuctionBid(priceAdjusted);
    } else {
      if (priceAdjusted < doubleAuctionBid) {
        throw createHttpError(400, `Price out of range`);
      } else if (
        doubleAuctionOffer !== 0 &&
        priceAdjusted > doubleAuctionOffer
      ) {
        throw createHttpError(400, `Price out of range`);
      } else {
        setDoubleAuctionBid(priceAdjusted);
      }
    }

    const bargain = Bargain.create({
      phase: phase,
      buyer: buyer,
      postedBy: buyer.id,
      price: priceAdjusted,
    });
    await bargain.save();

    await lock.acquire("buyersBid", async (done) => {
      try {
        const buyerBid = new BuyerBid(phaseId, buyer.id, priceAdjusted);

        const doubleAuctionBidsIndex = doubleAuctionBids.findIndex((item) => {
          return item.phaseId === phaseId;
        });

        if (doubleAuctionBidsIndex !== -1) {
          doubleAuctionBids[doubleAuctionBidsIndex] = buyerBid;
        } else {
          doubleAuctionBids.push(buyerBid);
        }

        done();
      } catch (error) {
        if (error instanceof Error) {
          done(error);
        }
        errorThrowUtils(error);
      }
    });
    return true;
  } catch (error) {
    return errorReturnHandler(error);
  }
}

export type MatchData = {
  match: boolean;
  seller: Seller | undefined;
  buyer: Buyer | undefined;
  transaction: Transaction | undefined;
};

export async function checkIfBuyerBidMatch(
  socketId: string,
  buyerBid: number,
  phaseId: string
): Promise<MatchData | Error> {
  try {
    let sellerBidMatchIndex = 0;
    let buyer: Buyer | undefined = undefined;
    let seller: Seller | undefined = undefined;
    let transaction: Transaction | undefined = undefined;

    await lock.acquire("sellersOffer", async (done) => {
      try {
        const phase = await Phase.findOne(
          { id: phaseId },
          { relations: ["session"] }
        );
        if (!phase) {
          throw createHttpError(404, `There is no phase with id ${phaseId}`);
        }

        buyer = await Buyer.findOne({ socketId: socketId });
        if (!buyer) {
          throw createHttpError(
            403,
            `You are not a buyer or have not logged in`
          );
        }

        buyerBid = validatePrice(phase, buyer, buyerBid);
        sellerBidMatchIndex = doubleAuctionOffers
          .filter((sb) => sb.phaseId === phaseId)
          .findIndex((sb) => sb.price === buyerBid);

        if (sellerBidMatchIndex !== -1) {
          const sellerId = doubleAuctionOffers[sellerBidMatchIndex].sellerId;
          seller = await Seller.findOne({ id: sellerId });
          if (!seller) {
            throw createHttpError(
              404,
              `There is no seller with id ${sellerId}`
            );
          }

          const buyerBidMatchIndex = doubleAuctionBids
            .filter((bb) => bb.phaseId === phaseId)
            .findIndex((bb) => bb.buyerId === buyer?.id);
          doubleAuctionOffers.splice(sellerBidMatchIndex, 1);
          doubleAuctionBids.splice(buyerBidMatchIndex, 1);

          const newTransaction = Transaction.create({
            phase: phase,
            price: buyerBid,
            seller: seller,
            buyer: buyer,
          });

          deleteShortLivedData(phaseId);

          const successBuyer = Profit.create({
            session: phase.session,
            username: buyer.username,
            unitValue: buyer.unitValue,
            price: buyerBid,
            profit: buyer.unitValue - buyerBid,
          });
          await successBuyer.save();

          const successSeller = Profit.create({
            session: phase.session,
            username: seller.username,
            unitCost: seller.unitCost,
            price: buyerBid,
            profit: buyerBid - seller.unitCost,
          });
          await successSeller.save();

          transaction = await newTransaction.save();
        }

        done();
      } catch (error) {
        if (error instanceof Error) {
          done(error);
        }
        errorThrowUtils(error);
      }
    });

    if (sellerBidMatchIndex !== -1) {
      return {
        match: true,
        buyer: buyer,
        seller: seller,
        transaction: transaction,
      };
    } else {
      return {
        match: false,
        buyer: undefined,
        seller: undefined,
        transaction: undefined,
      };
    }
  } catch (error) {
    return errorReturnHandler(error);
  }
}

export type DoubleAuctionBidOffer = {
  bid: number;
  offer: number;
};

export async function getBidOffer(): Promise<DoubleAuctionBidOffer | Error> {
  try {
    return {
      bid: doubleAuctionBid,
      offer: doubleAuctionOffer,
    };
  } catch (error) {
    return errorReturnHandler(error);
  }
}

export async function allSold(phaseId: string): Promise<boolean | Error> {
  try {
    const phase = await Phase.findOne(phaseId, {
      relations: ["session", "session.simulation"],
    });
    if (!phase) {
      throw createHttpError(404, `There is no phase with id ${phaseId}`);
    }

    const numOfTrx = await Transaction.createQueryBuilder("transaction")
      .where("transaction.phase.id=:phaseId", { phaseId })
      .getCount();

    const playersNumber = Math.floor(
      phase.session.simulation.participantNumber / 2
    );
    if (numOfTrx >= playersNumber) {
      return true;
    } else if (numOfTrx < playersNumber) {
      return false;
    } else {
      throw new Error("Something gone wrong");
    }
  } catch (error) {
    return errorReturnHandler(error);
  }
}
