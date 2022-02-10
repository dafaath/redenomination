import createHttpError from "http-errors";
import { getManager } from "typeorm";
import { errorReturnHandler, errorThrowUtils } from "../common/utils/error";
import { lock } from "../common/utils/lock";
import Buyer from "../db/entities/buyer.entity";
import Seller from "../db/entities/seller.entity";
import Phase from "../db/entities/phase.entity";
import Transaction from "../db/entities/transaction.entity";
import {
  decentralizeds,
  doubleAuctionBuyerBid,
  doubleAuctionSellerBid,
  postedOffers,
  Profit,
  profitCollection,
} from "../db/shortLived";
import Session from "../db/entities/session.entity";

export async function toggleReady(
  socketId: string
): Promise<Buyer | Seller | Error> {
  try {
    const chosenHost = await getManager().transaction(
      async (transactionalEntityManager) => {
        try {
          const buyer = await transactionalEntityManager.findOne(Buyer, {
            lock: {
              mode: "pessimistic_write",
            },
            where: {
              socketId: socketId,
            },
          });

          const seller = await transactionalEntityManager.findOne(Seller, {
            lock: {
              mode: "pessimistic_write",
            },
            where: {
              socketId: socketId,
            },
          });

          if (!buyer && !seller) {
            throw createHttpError(
              401,
              `This socket id ${socketId} is not logged in yet`
            );
          }

          let updatedUser: Buyer | Seller | undefined = undefined;
          if (buyer) {
            buyer.isReady = !buyer.isReady;

            updatedUser = await transactionalEntityManager.save(buyer);
          } else if (seller) {
            seller.isReady = !seller.isReady;

            updatedUser = await transactionalEntityManager.save(seller);
          }

          return updatedUser;
        } catch (error) {
          errorThrowUtils(error);
        }
      }
    );
    if (chosenHost) {
      return chosenHost;
    } else {
      return new Error("something wrong");
    }
  } catch (error) {
    return errorReturnHandler(error);
  }
}

type ReadyCount = {
  numberOfReadyPlayer: number;
  totalPlayer: number;
};
export async function countReadyUser(
  loginToken: string
): Promise<ReadyCount | Error> {
  try {
    const chosenHost = await getManager().transaction(
      async (transactionalEntityManager) => {
        try {
          const buyers = await transactionalEntityManager.find(Buyer, {
            lock: {
              mode: "pessimistic_read",
            },
            where: {
              loginToken: loginToken,
            },
          });
          const buyersCount = buyers.length;

          const sellers = await transactionalEntityManager.find(Seller, {
            lock: {
              mode: "pessimistic_read",
            },
            where: {
              loginToken: loginToken,
            },
          });
          const sellersCount = sellers.length;

          const numberOfReadyBuyers = buyers.filter(
            (b) => b.isReady === true
          ).length;
          const numberOfReadySellers = sellers.filter(
            (s) => s.isReady === true
          ).length;

          const readyCount: ReadyCount = {
            numberOfReadyPlayer: numberOfReadyBuyers + numberOfReadySellers,
            totalPlayer: buyersCount + sellersCount,
          };

          return readyCount;
        } catch (error) {
          errorThrowUtils(error);
        }
      }
    );
    if (chosenHost) {
      return chosenHost;
    } else {
      return new Error("something wrong");
    }
  } catch (error) {
    return errorReturnHandler(error);
  }
}

export async function deleteShortLivedData(
  phaseId: string
): Promise<undefined | Error> {
  try {
    lock.acquire("deletePostedOffer", (done) => {
      try {
        let postedOfferIndex: number;

        do {
          postedOfferIndex = postedOffers.findIndex(
            (po) => po.phaseId === phaseId
          );
          if (postedOfferIndex !== -1) {
            postedOffers.splice(postedOfferIndex, 1);
          }
        } while (postedOfferIndex !== -1);

        done();
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
          doubleAuctionBuyerIndex = doubleAuctionBuyerBid.findIndex(
            (po) => po.phaseId === phaseId
          );

          if (doubleAuctionBuyerIndex !== -1) {
            doubleAuctionBuyerBid.splice(doubleAuctionBuyerIndex, 1);
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
          doubleAuctionSellerIndex = doubleAuctionSellerBid.findIndex(
            (po) => po.phaseId === phaseId
          );

          if (doubleAuctionSellerIndex !== -1) {
            doubleAuctionSellerBid.splice(doubleAuctionSellerIndex, 1);
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

    lock.acquire("deleteDecentralized", (done) => {
      try {
        let decentralizedIndex: number;
        do {
          decentralizedIndex = decentralizeds.findIndex(
            (ds) => ds.phaseId === phaseId
          );

          if (decentralizedIndex !== -1) {
            decentralizeds.splice(decentralizedIndex, 1);
          }
        } while (decentralizedIndex !== -1);
        done();
      } catch (error) {
        if (error instanceof Error) {
          done(error);
        }
        errorThrowUtils(error);
      }
    });

    while (profitCollection.length > 0) {
      profitCollection.pop();
    }
  } catch (error) {
    return errorReturnHandler(error);
  }
}

export async function startPhase(
  phaseId: string
): Promise<Phase | Error> {
  try {
    const phase = await Phase.findOne(phaseId);

    if (!phase) {
      throw createHttpError(404, "Phase with id " + phaseId + " is not found");
    }

    // Run Phase
    if (phase.isRunning === false) {
      phase.isRunning = true;
      await phase.save();
    }

    return phase;
  } catch (error) {
    return errorReturnHandler(error);
  }
}

export async function finishPhase(
  phaseId: string
): Promise<Phase | Error> {
  try {
    const phase = await Phase.findOne(phaseId);

    if (!phase) {
      throw createHttpError(404, "Phase with id " + phaseId + " is not found");
    }

    // End Phase
    if (phase.isRunning === true) {
      phase.isRunning = false;

      const trxList = await Transaction.createQueryBuilder("transaction")
        .where("transaction.phase.id=:phaseId", { phaseId })
        .getMany();

      if (!trxList) {
        throw createHttpError(404, `There is no recorded transactions for this phase`);
      }

      const sumTrxPrices = trxList.reduce((prev, t) => prev + Number(t.price), 0)
      phase.avgTrxOccurrence = Number(trxList.length);
      phase.avgTrxPrice = Number(sumTrxPrices) / trxList.length;
      phase.timeLastRun = new Date(Date.now());
      await phase.save();
    }

    return phase;
  } catch (error) {
    return errorReturnHandler(error);
  }
}

type CollectedProfit = {
  simulationBudget: number;
  profitCollection: Array<Profit>;
};
export async function inputProfit(
  socketId: string,
  profitValue: number,
  phaseId: string
): Promise<CollectedProfit | Error> {
  try {
    const profitCollectionIndex = profitCollection.findIndex(
      (pc) => pc.socketId === socketId
    );

    if (profitCollectionIndex === -1) {
      const clientProfit = new Profit(socketId, phaseId, profitValue);
      profitCollection.push(clientProfit);
    }

    const phase = await Phase.findOne(phaseId, {
      relations: ["session", "session.simulation"],
    });

    if (!phase) {
      throw createHttpError(404, `There is no phase with id ${phaseId}`);
    }

    const currentProfitCollection = profitCollection.filter((item) => item.phaseId === phaseId);

    const collectedProfit: CollectedProfit = {
      simulationBudget: phase.session.simulation.simulationBudget,
      profitCollection: currentProfitCollection,
    };

    return collectedProfit;
  } catch (error) {
    return errorReturnHandler(error);
  }
}