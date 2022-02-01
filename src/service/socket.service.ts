import createHttpError from "http-errors";
import { getManager } from "typeorm";
import { errorReturnHandler, errorThrowUtils } from "../common/utils/error";
import Buyer from "../db/entities/buyer.entity";
import Seller from "../db/entities/seller.entity";
import Phase from "../db/entities/phase.entity";
import Transaction from "../db/entities/transaction.entity";
import { postedOffers, profitCollection } from "../db/shortLived";

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
              400,
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
    let index: number;

    do {
      index = postedOffers.findIndex((po) => po.phaseId === phaseId);
      if (index !== -1) {
        postedOffers.splice(index, 1);
      }
    } while (index !== -1);

    while (profitCollection.length > 0) {
      profitCollection.pop();
    }

  } catch (error) {
    return errorReturnHandler(error);
  }
}

type CollectedProfit = {
  simulationBudget: number;
  profitCollection: Array<number>;
};
export async function inputProfit(
  clientProfit: number
): Promise<CollectedProfit | Error> {
  try {
    profitCollection.push(clientProfit);

    const collectedProfit: CollectedProfit = {
      simulationBudget: 200000,
      profitCollection: profitCollection
    };

    return collectedProfit;
  } catch (error) {
    return errorReturnHandler(error);
  }
}

export async function calculatePhase(
  phaseId: string
): Promise<Phase | Error> {
  try {
    const phase = await Phase.findOne(phaseId);

    if (!phase) {
      throw createHttpError(
        404,
        "Session with id " + phaseId + " is not found"
      );
    }

    let trxList = await Transaction.createQueryBuilder("transaction")
      .where("transaction.phase.id=:phaseId", { phaseId })
      .getMany();

    if (!trxList) {
      throw createHttpError(
        404,
        `There is no recorded transactions for this phase`
      );
    }

    const sumTrxPrices = trxList.reduce((prev, t) => prev + t.price, 0)
    phase.avgTrxOccurrence = trxList.length;
    phase.avgTrxPrice = sumTrxPrices / trxList.length;

    return await phase.save()
  } catch (error) {
    return errorReturnHandler(error);
  }
}