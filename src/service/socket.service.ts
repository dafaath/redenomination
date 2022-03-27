import createHttpError from "http-errors";
import { getManager } from "typeorm";
import { errorReturnHandler, errorThrowUtils } from "../common/utils/error";
import { lock } from "../common/utils/lock";
import Buyer from "../db/entities/buyer.entity";
import Seller from "../db/entities/seller.entity";
import Phase from "../db/entities/phase.entity";
import Transaction from "../db/entities/transaction.entity";
import {
  ClientInstance,
  decentralizeds,
  doubleAuctionBids,
  doubleAuctionOffers,
  phaseFinishedPlayers,
  PhaseInstance,
  postedOffers,
  runningSessions,
  SessionData,
  setDoubleAuctionBid,
  setDoubleAuctionOffer,
} from "../db/shortLived";
import Simulation from "../db/entities/simulation.entity";
import Profit from "../db/entities/profit.entity";

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

export class ReadyObject {
  readyCount: ReadyCount;
  sessionData: SessionData;

  constructor(readyCount: ReadyCount, sessionData: SessionData) {
    this.readyCount = readyCount;
    this.sessionData = sessionData;
  }
}
export class ReadyCount {
  numberOfReadyPlayer: number;
  totalPlayer: number;

  constructor(numberOfReadyPlayer: number, totalPlayer: number) {
    this.numberOfReadyPlayer = numberOfReadyPlayer;
    this.totalPlayer = totalPlayer;
  }
}
export async function countReadyUser(
  loginToken: string
): Promise<ReadyObject | ReadyCount | Error> {
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

          const readyCount = new ReadyCount(
            numberOfReadyBuyers + numberOfReadySellers,
            buyersCount + sellersCount
          );

          const sessionDataIndex = runningSessions.findIndex(
            (item) => item.token === loginToken
          );
          if (sessionDataIndex === -1) {
            throw createHttpError(404, "Session hasnt been run");
          }

          if (
            readyCount.numberOfReadyPlayer === readyCount.totalPlayer &&
            runningSessions[sessionDataIndex].phaseId === "READY"
          ) {
            const updatedSessionData = new SessionData(
              loginToken,
              "READY",
              false
            );
            runningSessions[sessionDataIndex] = updatedSessionData;
            const returnable = new ReadyObject(readyCount, updatedSessionData);
            return returnable;
          }

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
          doubleAuctionBuyerIndex = doubleAuctionBids.findIndex(
            (po) => po.phaseId === phaseId
          );
          if (doubleAuctionBuyerIndex !== -1) {
            doubleAuctionBids.splice(doubleAuctionBuyerIndex, 1);
          }
        } while (doubleAuctionBuyerIndex !== -1);

        setDoubleAuctionBid(0);
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

        setDoubleAuctionOffer(0);
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
  } catch (error) {
    return errorReturnHandler(error);
  }
}

export class Start {
  phase: Phase;
  sessionData: SessionData;
}
export async function startPhase(phaseId: string): Promise<Start | Error> {
  try {
    const phase = await Phase.findOne(phaseId, {
      relations: ["session", "session.simulation"],
    });
    if (!phase) {
      throw createHttpError(404, "Phase with id " + phaseId + " is not found");
    }

    const token = phase.session.simulation.token;
    const sessionDataIndex = runningSessions.findIndex(
      (item) => item.token === token
    );
    if (sessionDataIndex === -1) {
      throw createHttpError(404, "Session hasnt been run");
    }

    // Run Phase
    if (phase.isRunning === false) {
      phase.isRunning = true;
      await phase.save();

      const sessionData = new SessionData(token, phaseId, false);
      runningSessions[sessionDataIndex] = sessionData;

      const phaseInstance = new PhaseInstance(phaseId);
      phaseFinishedPlayers.push(phaseInstance);
    }

    return {
      phase: phase,
      sessionData: runningSessions[sessionDataIndex],
    };
  } catch (error) {
    return errorReturnHandler(error);
  }
}

export async function updatePhaseStage(
  phaseId: string
): Promise<SessionData | Error> {
  try {
    const phase = await Phase.findOne(phaseId, {
      relations: ["session", "session.simulation"],
    });
    if (!phase) {
      throw createHttpError(404, "Phase with id " + phaseId + " is not found");
    }

    const token = phase.session.simulation.token;
    const sessionDataIndex = runningSessions.findIndex(
      (item) => item.token === token
    );
    if (sessionDataIndex === -1) {
      throw createHttpError(404, "Session hasnt been run");
    } else if (runningSessions[sessionDataIndex].stageCode === true) {
      return runningSessions[sessionDataIndex];
    } else {
      const updatedSessionData = new SessionData(token, phaseId, true);
      runningSessions[sessionDataIndex] = updatedSessionData;
      return updatedSessionData;
    }
  } catch (error) {
    return errorReturnHandler(error);
  }
}

export async function finishPhase(phaseId: string): Promise<Phase | Error> {
  try {
    const phase = await Phase.findOne(phaseId, {
      relations: ["session"],
    });

    if (!phase) {
      throw createHttpError(404, "Phase with id " + phaseId + " is not found");
    }

    // End Phase
    if (phase.isRunning === true) {
      phase.isRunning = false;

      const trxList = await Transaction.createQueryBuilder("transaction")
        .where("transaction.phase.id=:phaseId", { phaseId })
        .getMany();

      if (trxList) {
        const sumTrxPrices = trxList.reduce((prev, t) => prev + t.price, 0);
        phase.avgTrxOccurrence = trxList.length;
        phase.avgTrxPrice = isNaN(sumTrxPrices / trxList.length)
          ? 0
          : sumTrxPrices / trxList.length;
      }

      phase.timeLastRun = new Date(Date.now());
      const phaseFinishedPlayersIndex = phaseFinishedPlayers.findIndex(
        (item) => item.phaseId === phaseId
      );
      if (phaseFinishedPlayersIndex !== -1) {
        phaseFinishedPlayers.splice(phaseFinishedPlayersIndex, 1);
      }

      await phase.save();
    }

    return phase;
  } catch (error) {
    return errorReturnHandler(error);
  }
}

export async function collectedProfit(
  phaseId: string,
  username: string
): Promise<number | Error> {
  try {
    const phase = await Phase.findOne(phaseId, { relations: ["session"] });
    if (!phase) {
      throw createHttpError(404, `There is no phase with id ${phaseId}`);
    }

    let clientProfit = 0;

    const clientProfits = await Profit.find({
      where: { username: username },
      relations: ["session"],
    });
    if (clientProfits) {
      clientProfit = clientProfits.reduce(
        (prev, item) => prev + Number(item.profit),
        0
      );
    }

    const allProfits = await Profit.find({ where: { session: phase.session } });
    const totalProfit = allProfits.reduce(
      (prev, profit) => prev + Number(profit.profit),
      0
    );

    // calculate
    const calculatedProfit =
      (clientProfit / totalProfit) * phase.session.sessionBudget;
    const adjustedProfit = Math.floor(calculatedProfit / 100) * 100;

    return adjustedProfit;
  } catch (error) {
    return errorReturnHandler(error);
  }
}

type activePlayersType = {
  sellers: Seller[];
  buyers: Buyer[];
};
export async function activePlayers(
  token: string
): Promise<activePlayersType | Error> {
  try {
    const simulation = await Simulation.createQueryBuilder("simulation")
      .where("simulation.token=:token", { token })
      .leftJoinAndSelect("simulation.sellers", "seller")
      .leftJoinAndSelect("simulation.buyers", "buyer")
      .getOne();

    if (!simulation) {
      throw createHttpError(
        404,
        `Login token ${token} is not found in database`
      );
    }

    const activePlayers: activePlayersType = {
      sellers: simulation.sellers,
      buyers: simulation.buyers,
    };

    return activePlayers;
  } catch (error) {
    return errorReturnHandler(error);
  }
}

export async function validateClientDone(
  phaseId: string,
  clientId: string
): Promise<boolean | Error> {
  try {
    const phase = await Phase.findOne(phaseId, {
      relations: ["session", "session.simulation"],
    });
    if (!phase) {
      throw createHttpError(404, `There is no phase with id ${phaseId}`);
    }

    const phaseInstance = phaseFinishedPlayers.find(
      (item) => item.phaseId === phaseId
    );
    if (phaseInstance === undefined) {
      throw createHttpError(404, `phase with id ${phaseId} is not running`);
    }

    lock.acquire("validateClientDone", (done) => {
      try {
        const clientNotExist =
          phaseInstance.donePlayers.findIndex(
            (item) => item.id === clientId
          ) === -1;
        if (clientNotExist) {
          const clientInstance = new ClientInstance(clientId);
          phaseInstance.donePlayers.push(clientInstance);
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

export async function checkIsAllClientDone(
  phaseId: string
): Promise<boolean | Error> {
  try {
    const phase = await Phase.findOne(phaseId, {
      relations: ["session", "session.simulation"],
    });
    if (!phase) {
      throw createHttpError(404, `There is no phase with id ${phaseId}`);
    }

    const phaseInstance = phaseFinishedPlayers.find(
      (item) => item.phaseId === phaseId
    );
    if (phaseInstance === undefined) {
      throw createHttpError(404, `phase with id ${phaseId} is not running`);
    }

    if (
      phaseInstance.donePlayers.length ===
      phase.session.simulation.participantNumber
    ) {
      return true;
    } else if (
      phaseInstance.donePlayers.length >
      phase.session.simulation.participantNumber
    ) {
      throw createHttpError(500, `Error occurred`);
    }

    return false;
  } catch (error) {
    return errorReturnHandler(error);
  }
}
