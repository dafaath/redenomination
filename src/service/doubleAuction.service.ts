import createHttpError from "http-errors";
import { errorReturnHandler, errorThrowUtils } from "../common/utils/error";
import { lock } from "../common/utils/lock";
import { validatePrice } from "../common/utils/redenomination";
import Bargain from "../db/entities/bargain.entity";
import Buyer from "../db/entities/buyer.entity";
import Phase from "../db/entities/phase.entity";
import Seller from "../db/entities/seller.entity";
import Transaction from "../db/entities/transaction.entity";
import {
  BuyerBid,
  doubleAuctionBuyerBid,
  doubleAuctionSellerBid,
  SellerBid,
} from "../db/shortLived";

export async function inputSellerPrice(
  price: number,
  socketId: string,
  phaseId: string
): Promise<undefined | Error> {
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

    const bargain = Bargain.create({
      phase: phase,
      seller: seller,
      postedBy: seller.id,
      price: price,
    });

    await bargain.save();

    await lock.acquire("sellersBid", async (done) => {
      try {
        const sellerBid = new SellerBid(phaseId, seller.id, priceAdjusted);

        const doubleAuctionSellerBidIndex = doubleAuctionSellerBid.findIndex((item) => {
          return item.sellerBid.sellerId === seller.id;
        });

        if (doubleAuctionSellerBidIndex !== -1) {
          doubleAuctionSellerBid[doubleAuctionSellerBidIndex] = sellerBid;
        } else {
          doubleAuctionSellerBid.push(sellerBid);
        }

        done();
      } catch (error) {
        if (error instanceof Error) {
          done(error);
        }
        errorThrowUtils(error);
      }
    });
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
    let matchIndex = 0;
    let buyer: Buyer | undefined = undefined;
    let seller: Seller | undefined = undefined;
    let transaction: Transaction | undefined = undefined;

    await lock.acquire("buyersBid", async (done) => {
      try {
        matchIndex = doubleAuctionBuyerBid
          .filter((bb) => bb.phaseId === phaseId)
          .findIndex((bb) => bb.buyerBid.price === sellerBid);

        if (matchIndex !== -1) {
          seller = await Seller.findOne({ socketId: socketId });
          if (!seller) {
            throw createHttpError(
              403,
              `You are not a seller or have not logged in`
            );
          }

          const phase = await Phase.findOne({ id: phaseId });
          if (!phase) {
            throw createHttpError(404, `There is no phase with id ${phaseId}`);
          }

          const buyerId = doubleAuctionBuyerBid[matchIndex].buyerBid.buyerId;
          buyer = await Buyer.findOne({ id: buyerId });
          if (!buyer) {
            throw createHttpError(404, `There is no buyer with id ${buyerId}`);
          }

          const newTransaction = Transaction.create({
            phase: phase,
            price: sellerBid,
            seller: seller,
            buyer: buyer,
          });

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

    if (matchIndex !== -1) {
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
): Promise<undefined | Error> {
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
    const bargain = Bargain.create({
      phase: phase,
      buyer: buyer,
      postedBy: buyer.id,
      price: price,
    });

    await bargain.save();

    return await lock.acquire("buyersBid", async (done) => {
      try {
        const buyerBid = new BuyerBid(phaseId, buyer.id, priceAdjusted);

        const doubleAuctionBuyerBidIndex = doubleAuctionBuyerBid.findIndex((item) => {
          return item.buyerBid.buyerId === buyer.id;
        });

        if (doubleAuctionBuyerBidIndex !== -1) {
          doubleAuctionBuyerBid[doubleAuctionBuyerBidIndex] = buyerBid;
        } else {
          doubleAuctionBuyerBid.push(buyerBid);
        }

        done();
      } catch (error) {
        if (error instanceof Error) {
          done(error);
        }
        errorThrowUtils(error);
      }
    });
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
    let matchIndex = 0;
    let buyer: Buyer | undefined = undefined;
    let seller: Seller | undefined = undefined;
    let transaction: Transaction | undefined = undefined;

    await lock.acquire("sellersBid", async (done) => {
      try {
        matchIndex = doubleAuctionSellerBid
          .filter((sb) => sb.phaseId === phaseId)
          .findIndex((sb) => sb.sellerBid.price === buyerBid);

        if (matchIndex !== -1) {
          buyer = await Buyer.findOne({ socketId: socketId });
          if (!buyer) {
            throw createHttpError(
              403,
              `You are not a buyer or have not logged in`
            );
          }

          const phase = await Phase.findOne({ id: phaseId });
          if (!phase) {
            throw createHttpError(404, `There is no phase with id ${phaseId}`);
          }

          const sellerId =
            doubleAuctionSellerBid[matchIndex].sellerBid.sellerId;
          seller = await Seller.findOne({ id: sellerId });
          if (!seller) {
            throw createHttpError(
              404,
              `There is no seller with id ${sellerId}`
            );
          }

          const newTransaction = Transaction.create({
            phase: phase,
            price: buyerBid,
            seller: seller,
            buyer: buyer,
          });

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

    if (matchIndex !== -1) {
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

export type DoubleAuctionMaxMinPrice = {
  minPrice: number;
  maxPrice: number;
};

export async function getMaxAndMinPrice(
  phaseId: string
): Promise<DoubleAuctionMaxMinPrice | Error> {
  try {
    let doubleAuctionMaxMinPrice: DoubleAuctionMaxMinPrice | undefined =
      undefined;
    await lock.acquire("getMaxMinPrice", async (done) => {
      try {
        const sellerBidPrice = doubleAuctionSellerBid
          .filter((sb) => sb.phaseId === phaseId)
          .map((sb) => sb.sellerBid.price);
        const buyerBidPrice = doubleAuctionBuyerBid
          .filter((bb) => bb.phaseId === phaseId)
          .map((bb) => bb.buyerBid.price);

        const maxPrice = Math.max(...sellerBidPrice);
        const minPrice = Math.min(...buyerBidPrice);
        doubleAuctionMaxMinPrice = {
          minPrice: !isNaN(minPrice) && minPrice !== Infinity ? minPrice : 0,
          maxPrice: !isNaN(maxPrice) && maxPrice !== Infinity ? maxPrice : 0,
        };
        done(undefined, doubleAuctionMaxMinPrice);
      } catch (error) {
        if (error instanceof Error) {
          done(error);
        }
        errorThrowUtils(error);
      }
    });

    if (doubleAuctionMaxMinPrice) {
      return doubleAuctionMaxMinPrice;
    } else {
      throw new Error("Something gone wrong");
    }
  } catch (error) {
    return errorReturnHandler(error);
  }
}