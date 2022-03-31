import createHttpError from "http-errors";
import { errorReturnHandler, errorThrowUtils } from "../common/utils/error";
import { lock } from "../common/utils/lock";
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
  runningSessions,
  SessionData,
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

    const phase = await Phase.findOne(
      { id: phaseId },
      { relations: ["session", "session.simulation"] }
    );
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

    const sessionData = runningSessions.find(
      (sd) => sd.token === phase.session.simulation.token
    );
    if (sessionData === undefined) {
      throw createHttpError(404, "Session hasnt been run");
    } else if (sessionData.stageCode === false) {
      // Initial Stage
      await lock.acquire("sellersOffer", async (done) => {
        try {
          const priceAdjusted = validatePrice(phase, seller, price);
          const bidOffer = await getBidOffer(phaseId);
          if (bidOffer instanceof Error) {
            throw bidOffer;
          }

          if (isFinite(bidOffer.bid)) {
            if (priceAdjusted < bidOffer.bid) {
              throw createHttpError(400, `Price under Bid`);
            }
          }

          const sellerBid = new SellerBid(phaseId, seller.id, priceAdjusted);

          const doubleAuctionOffersIndex = doubleAuctionOffers.findIndex(
            (item) => {
              return item.sellerId === seller.id;
            }
          );

          if (doubleAuctionOffersIndex !== -1) {
            done(createHttpError(500, `Seller has inputted initial Price`));
          } else {
            doubleAuctionOffers.push(sellerBid);

            const bargain = Bargain.create({
              phase: phase,
              seller: seller,
              postedBy: seller.id,
              price: priceAdjusted,
            });

            await bargain.save();
          }

          done();
        } catch (error) {
          if (error instanceof Error) {
            done(error);
          }
          errorThrowUtils(error);
        }
      });
      return false;
    } else if (sessionData.stageCode === true) {
      // Main Stage
      const priceAdjusted = validatePrice(phase, seller, price);

      if (
        priceAdjusted > doubleAuctionOffer ||
        priceAdjusted < doubleAuctionBid
      ) {
        throw createHttpError(400, `Price out of range`);
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
    }
    throw createHttpError(500, `Something Happened`);
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
): Promise<boolean | Error> {
  try {
    const buyer = await Buyer.findOne({ socketId: socketId });
    if (!buyer) {
      throw createHttpError(403, `You are not a buyer or have not logged in`);
    }

    const phase = await Phase.findOne(
      { id: phaseId },
      { relations: ["session", "session.simulation"] }
    );
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

    const sessionData = runningSessions.find(
      (sd) => sd.token === phase.session.simulation.token
    );
    if (sessionData === undefined) {
      throw createHttpError(404, "Session hasnt been run");
    } else if (sessionData.stageCode === false) {
      // Initial Stage
      await lock.acquire("buyersBid", async (done) => {
        try {
          const priceAdjusted = validatePrice(phase, buyer, price);
          const bidOffer = await getBidOffer(phaseId);
          if (bidOffer instanceof Error) {
            throw bidOffer;
          }

          if (isFinite(bidOffer.offer)) {
            if (priceAdjusted > bidOffer.offer) {
              throw createHttpError(400, `Price exceed Offer`);
            }
          }

          const buyerBid = new BuyerBid(phaseId, buyer.id, priceAdjusted);

          const doubleAuctionBidsIndex = doubleAuctionBids.findIndex((item) => {
            return item.buyerId === buyer.id;
          });

          if (doubleAuctionBidsIndex !== -1) {
            done(createHttpError(500, `Buyer has inputted initial Price`));
          } else {
            doubleAuctionBids.push(buyerBid);

            const bargain = Bargain.create({
              phase: phase,
              buyer: buyer,
              postedBy: buyer.id,
              price: priceAdjusted,
            });

            await bargain.save();
          }

          done();
        } catch (error) {
          if (error instanceof Error) {
            done(error);
          }
          errorThrowUtils(error);
        }
      });
      return false;
    } else if (sessionData.stageCode === true) {
      // Main Stage
      const priceAdjusted = validatePrice(phase, buyer, price);

      if (
        priceAdjusted > doubleAuctionOffer ||
        priceAdjusted < doubleAuctionBid
      ) {
        throw createHttpError(400, `Price out of range`);
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
    }
    throw createHttpError(500, `Something Happened`);
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

export async function setBidOffer(
  phaseId: string
): Promise<DoubleAuctionBidOffer | Error> {
  try {
    let doubleAuctionBidOffer: DoubleAuctionBidOffer | undefined = undefined;
    await lock.acquire("getMaxMinPrice", async (done) => {
      try {
        const sellerBidPrice = doubleAuctionOffers
          .filter((sb) => sb.phaseId === phaseId)
          .map((sb) => sb.price);
        const buyerBidPrice = doubleAuctionBids
          .filter((bb) => bb.phaseId === phaseId)
          .map((bb) => bb.price);

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

export async function getBidOffer(
  phaseId: string
): Promise<DoubleAuctionBidOffer | Error> {
  try {
    let bid = doubleAuctionBid;
    let offer = doubleAuctionOffer;

    const sellerBidPrice = doubleAuctionOffers
      .filter((sb) => sb.phaseId === phaseId)
      .map((sb) => sb.price);
    const buyerBidPrice = doubleAuctionBids
      .filter((bb) => bb.phaseId === phaseId)
      .map((bb) => bb.price);

    const buyerMax = Math.max(...buyerBidPrice);
    if (doubleAuctionBid === 0 || doubleAuctionBid < buyerMax) {
      bid = buyerMax;
    }

    const sellerMin = Math.min(...sellerBidPrice);
    if (doubleAuctionOffer === 0 || doubleAuctionOffer > sellerMin) {
      offer = sellerMin;
    }

    return {
      bid: bid,
      offer: offer,
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

export async function initialStageFinishCheck(
  phaseId: string
): Promise<DoubleAuctionBidOffer | undefined | Error> {
  try {
    const phase = await Phase.findOne(
      { id: phaseId },
      {
        relations: ["session", "session.simulation"],
      }
    );
    if (!phase) {
      throw createHttpError(404, `There is no phase with id ${phaseId}`);
    }

    const soldPlayers =
      (await Transaction.createQueryBuilder("transaction")
        .where("transaction.phase_id=:phaseId", { phaseId })
        .getCount()) * 2;

    const inputtedNums =
      doubleAuctionOffers.filter((item) => item.phaseId === phaseId).length +
      doubleAuctionBids.filter((item) => item.phaseId === phaseId).length +
      soldPlayers;
    if (inputtedNums === phase.session.simulation.participantNumber) {
      return calculateBidOffer(phaseId);
    }
  } catch (error) {
    return errorReturnHandler(error);
  }
}

export async function calculateBidOffer(
  phaseId: string
): Promise<DoubleAuctionBidOffer | undefined | Error> {
  try {
    let bidoffer: DoubleAuctionBidOffer | undefined = undefined;

    await lock.acquire("getMaxMinPrice", async (done) => {
      try {
        const sellerBidPrice = doubleAuctionOffers
          .filter((sb) => sb.phaseId === phaseId)
          .map((sb) => sb.price);
        const buyerBidPrice = doubleAuctionBids
          .filter((bb) => bb.phaseId === phaseId)
          .map((bb) => bb.price);

        const buyerMin = Math.min(...buyerBidPrice);
        setDoubleAuctionBid(buyerMin !== 0 ? buyerMin : 0);

        const sellerMax = Math.max(...sellerBidPrice);
        setDoubleAuctionOffer(sellerMax !== 0 ? sellerMax : Infinity);

        bidoffer = {
          bid: doubleAuctionBid,
          offer: doubleAuctionOffer,
        };
        done(undefined, bidoffer);
      } catch (error) {
        if (error instanceof Error) {
          done(error);
        }
        errorThrowUtils(error);
      }
    });

    lock.acquire("deleteDoubleAuctionBuyer", (done) => {
      try {
        let doubleAuctionBuyerIndex: number;

        do {
          doubleAuctionBuyerIndex = doubleAuctionBids.findIndex(
            (po) => po.phaseId === phaseId
          );
          if (doubleAuctionBuyerIndex !== -1) {
            doubleAuctionBids.splice(doubleAuctionBuyerIndex, 1);
          }
        } while (doubleAuctionBuyerIndex !== -1);

        done();
      } catch (error) {
        if (error instanceof Error) {
          done(error);
        }
        errorThrowUtils(error);
      }
    });

    lock.acquire("deleteDoubleAuctionSeller", (done) => {
      try {
        let doubleAuctionSellerIndex: number;

        do {
          doubleAuctionSellerIndex = doubleAuctionOffers.findIndex(
            (po) => po.phaseId === phaseId
          );
          if (doubleAuctionSellerIndex !== -1) {
            doubleAuctionOffers.splice(doubleAuctionSellerIndex, 1);
          }
        } while (doubleAuctionSellerIndex !== -1);

        done();
      } catch (error) {
        if (error instanceof Error) {
          done(error);
        }
        errorThrowUtils(error);
      }
    });

    return bidoffer;
  } catch (error) {
    return errorReturnHandler(error);
  }
}

export async function updateDAStage(
  phaseId: string
): Promise<SessionData | Error> {
  try {
    const phase = await Phase.findOne(phaseId, {
      relations: ["session", "session.simulation"],
    });
    if (!phase) {
      throw createHttpError(404, "Phase with id " + phaseId + " is not found");
    }

    const transactions = await Transaction.createQueryBuilder("transaction")
      .where("transaction.phase_id=:phaseId", { phaseId })
      .getMany();
    if (transactions.length === 0) {
      throw createHttpError(500, `Warning! Something Happened`);
    }

    // Reset Stage
    const token = phase.session.simulation.token;
    const sessionDataIndex = runningSessions.findIndex(
      (item) => item.token === token
    );
    if (sessionDataIndex === -1) {
      throw createHttpError(404, "Session hasnt been run");
    } else if (runningSessions[sessionDataIndex].stageCode === false) {
      return runningSessions[sessionDataIndex];
    } else {
      const updatedSessionData = new SessionData(
        token,
        phaseId,
        false,
        runningSessions[sessionDataIndex].startTime
      );
      runningSessions[sessionDataIndex] = updatedSessionData;
      return updatedSessionData;
    }
  } catch (error) {
    return errorReturnHandler(error);
  }
}
