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
import Transaction from "../db/entities/transaction.entity";
import {
  BuyerBid,
  doubleAuctionBid,
  doubleAuctionBuyerBid,
  doubleAuctionOffer,
  doubleAuctionSellerBid,
  SellerBid,
  setDoubleAuctionBid,
  setDoubleAuctionOffer,
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
      price: priceAdjusted,
    });

    await bargain.save();

    await lock.acquire("sellersBid", async (done) => {
      try {
        const sellerBid = new SellerBid(phaseId, seller.id, priceAdjusted);

        const doubleAuctionSellerBidIndex = doubleAuctionSellerBid.findIndex(
          (item) => {
            return item.sellerBid.sellerId === seller.id;
          }
        );

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
        buyerBidMatchIndex = doubleAuctionBuyerBid
          .filter((bb) => bb.phaseId === phaseId)
          .findIndex((bb) => bb.buyerBid.price === sellerBid);

        if (buyerBidMatchIndex !== -1) {
          const buyerId =
            doubleAuctionBuyerBid[buyerBidMatchIndex].buyerBid.buyerId;
          buyer = await Buyer.findOne({ id: buyerId });
          if (!buyer) {
            throw createHttpError(404, `There is no buyer with id ${buyerId}`);
          }

          const sellerBidMatchIndex = doubleAuctionSellerBid
            .filter((sb) => sb.phaseId === phaseId)
            .findIndex((sb) => sb.sellerBid.sellerId === seller?.id);
          doubleAuctionBuyerBid.splice(buyerBidMatchIndex, 1);
          doubleAuctionSellerBid.splice(sellerBidMatchIndex, 1);

          const newTransaction = Transaction.create({
            phase: phase,
            price: sellerBid,
            seller: seller,
            buyer: buyer,
          });

          const successBuyer = Profit.create({
            session: phase.session,
            username: buyer.username!,
            unitValue: buyer.unitValue,
            price: sellerBid,
            profit: buyer.unitValue - sellerBid,
          });
          await successBuyer.save();

          const successSeller = Profit.create({
            session: phase.session,
            username: seller.username!,
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
      price: priceAdjusted,
    });

    await bargain.save();

    return await lock.acquire("buyersBid", async (done) => {
      try {
        const buyerBid = new BuyerBid(phaseId, buyer.id, priceAdjusted);

        const doubleAuctionBuyerBidIndex = doubleAuctionBuyerBid.findIndex(
          (item) => {
            return item.buyerBid.buyerId === buyer.id;
          }
        );

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
    let sellerBidMatchIndex = 0;
    let buyer: Buyer | undefined = undefined;
    let seller: Seller | undefined = undefined;
    let transaction: Transaction | undefined = undefined;

    await lock.acquire("sellersBid", async (done) => {
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
        sellerBidMatchIndex = doubleAuctionSellerBid
          .filter((sb) => sb.phaseId === phaseId)
          .findIndex((sb) => sb.sellerBid.price === buyerBid);

        if (sellerBidMatchIndex !== -1) {
          const sellerId =
            doubleAuctionSellerBid[sellerBidMatchIndex].sellerBid.sellerId;
          seller = await Seller.findOne({ id: sellerId });
          if (!seller) {
            throw createHttpError(
              404,
              `There is no seller with id ${sellerId}`
            );
          }

          const buyerBidMatchIndex = doubleAuctionBuyerBid
            .filter((bb) => bb.phaseId === phaseId)
            .findIndex((bb) => bb.buyerBid.buyerId === buyer?.id);
          doubleAuctionSellerBid.splice(sellerBidMatchIndex, 1);
          doubleAuctionBuyerBid.splice(buyerBidMatchIndex, 1);

          const newTransaction = Transaction.create({
            phase: phase,
            price: buyerBid,
            seller: seller,
            buyer: buyer,
          });

          const successBuyer = Profit.create({
            session: phase.session,
            username: buyer.username!,
            unitValue: buyer.unitValue,
            price: buyerBid,
            profit: buyer.unitValue - buyerBid,
          });
          await successBuyer.save();

          const successSeller = Profit.create({
            session: phase.session,
            username: seller.username!,
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

export async function getBidOffer(
  phaseId: string
): Promise<DoubleAuctionBidOffer | Error> {
  try {
    let doubleAuctionBidOffer: DoubleAuctionBidOffer | undefined = undefined;
    await lock.acquire("getMaxMinPrice", async (done) => {
      try {
        const sellerBidPrice = doubleAuctionSellerBid
          .filter((sb) => sb.phaseId === phaseId)
          .map((sb) => sb.sellerBid.price);
        const buyerBidPrice = doubleAuctionBuyerBid
          .filter((bb) => bb.phaseId === phaseId)
          .map((bb) => bb.buyerBid.price);

        const buyerMax = Math.max(...buyerBidPrice);
        if (doubleAuctionBid === 0 || doubleAuctionBid < buyerMax)
          setDoubleAuctionBid(buyerMax);

        const sellerMin = Math.min(...sellerBidPrice);
        if (doubleAuctionOffer === 0 || doubleAuctionOffer > sellerMin)
          setDoubleAuctionOffer(sellerMin);

        doubleAuctionBidOffer = {
          bid: doubleAuctionBid,
          offer: doubleAuctionOffer,
        };
        done(undefined, doubleAuctionBidOffer);
      } catch (error) {
        if (error instanceof Error) {
          done(error);
        }
        errorThrowUtils(error);
      }
    });

    if (doubleAuctionBidOffer) {
      return doubleAuctionBidOffer;
    } else {
      throw new Error("Something gone wrong");
    }
  } catch (error) {
    return errorReturnHandler(error);
  }
}

export async function allSold(phaseId: string): Promise<boolean | Error> {
  try {
    const numOfTrx = await Transaction.createQueryBuilder("transaction")
      .where("transaction.phase.id=:phaseId", { phaseId })
      .getCount();

    const phase = await Phase.findOne(phaseId, {
      relations: ["session", "session.simulation"],
    });
    if (!phase) {
      throw createHttpError(404, `There is no phase with id ${phaseId}`);
    }

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
