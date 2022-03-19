import config from "../configHandler";
import createHttpError from "http-errors";
import { ROLE, signToken } from "../common/utils/jwt";
import { errorReturnHandler, errorThrowUtils } from "../common/utils/error";
import Buyer from "../db/entities/buyer.entity";
import Simulation from "../db/entities/simulation.entity";
import Seller from "../db/entities/seller.entity";
import { getManager } from "typeorm";
import Phase from "../db/entities/phase.entity";
import Session from "../db/entities/session.entity";
import { runningSessions, SessionData } from "../db/shortLived";

export async function loginAdmin(password: string): Promise<string | Error> {
  try {
    const serverPassword = config.admin.password;
    if (password !== serverPassword) {
      return createHttpError(401, "Wrong password");
    }
    return signToken(ROLE.ADMIN);
  } catch (error) {
    return errorReturnHandler(error);
  }
}

enum ChosenHostType {
  BUYER = "buyer",
  SELLER = "seller",
}
export type ChosenHost = {
  type: ChosenHostType;
  detail: Buyer | Seller;
  simulationType: string;
  participantNumber: number;
  isSessionRunning: boolean;
  sessionData: SessionData;
  goodsType: string;
  goodsPic: string | null;
  goodsName: string;
  inflationType: string;
  timer: number;
  phases: Array<Phase>;
};

export async function loginTokenSocket(
  token: string,
  username: string,
  socketId: string
): Promise<ChosenHost | Error> {
  try {
    const simulation = await Simulation.createQueryBuilder("simulation")
      .where("simulation.token=:token", { token })
      .leftJoinAndSelect("simulation.sessions", "session")
      .getOne();

    if (!simulation) {
      throw createHttpError(
        404,
        `Login token ${token} is not found in database`
      );
    }

    const sessions = await Session.createQueryBuilder("session")
      .where("session.simulation_id=:simulationId", {
        simulationId: simulation.id,
      })
      .andWhere("session.isRunning=true")
      .leftJoinAndSelect("session.phases", "phase")
      .orderBy("session.time_created")
      .getMany();
    const session = sessions[0];

    if (!session) {
      throw createHttpError(
        404,
        `This simulation has no available running session`
      );
    }

    const chosenHost = await getManager().transaction(
      async (transactionalEntityManager) => {
        try {
          const buyer = await transactionalEntityManager.findOne(Buyer, {
            lock: {
              mode: "pessimistic_write",
            },
            where: {
              loginToken: token,
              username: username,
            },
          });

          const seller = await transactionalEntityManager.findOne(Seller, {
            lock: {
              mode: "pessimistic_write",
            },
            where: {
              loginToken: token,
              username: username,
            },
          });

          if (!buyer && !seller) {
            throw createHttpError(
              404,
              `There is no buyer/seller with login token ${token} and username ${username}`
            );
          }

          const sessionData = runningSessions.find((sd) => sd.token === token);
          if (sessionData === undefined) {
            throw createHttpError(404, "Session hasnt been run");
          }

          let chosenHost: undefined | ChosenHost = undefined;
          if (buyer) {
            if (buyer.isLoggedIn) {
              throw createHttpError(405, `This user is already logged in`);
            }

            buyer.isLoggedIn = true;
            buyer.socketId = socketId;

            chosenHost = {
              type: ChosenHostType.BUYER,
              detail: await transactionalEntityManager.save(buyer),
              goodsName: simulation.goodsName,
              goodsType: simulation.goodsType,
              goodsPic: simulation.goodsPic,
              inflationType: simulation.inflationType,
              simulationType: simulation.simulationType,
              participantNumber: simulation.participantNumber,
              timer: session.timer,
              phases: session.phases,
              isSessionRunning: session.isRunning,
              sessionData: sessionData,
            };
          } else if (seller) {
            if (seller.isLoggedIn) {
              throw createHttpError(405, `This user is already logged in`);
            }

            seller.isLoggedIn = true;
            seller.socketId = socketId;

            chosenHost = {
              type: ChosenHostType.SELLER,
              detail: await transactionalEntityManager.save(seller),
              goodsName: simulation.goodsName,
              goodsType: simulation.goodsType,
              goodsPic: simulation.goodsPic,
              inflationType: simulation.inflationType,
              simulationType: simulation.simulationType,
              participantNumber: simulation.participantNumber,
              timer: session.timer,
              phases: session.phases,
              isSessionRunning: session.isRunning,
              sessionData: sessionData,
            };
          }

          return chosenHost;
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

export async function adminLoginTokenSocket(
  token: string
): Promise<Session | Error> {
  try {
    const simulation = await Simulation.createQueryBuilder("simulation")
      .where("simulation.token=:token", { token })
      .getOne();
    if (!simulation) {
      throw createHttpError(
        404,
        `Login token ${token} is not found in database`
      );
    }

    const sessions = await Session.createQueryBuilder("session")
      .where("session.simulation_id=:simulationId", {
        simulationId: simulation.id,
      })
      .andWhere("session.isRunning=true")
      .leftJoinAndSelect("session.phases", "phase")
      .orderBy("session.time_created")
      .getMany();
    const session = sessions[0];
    if (!session) {
      throw createHttpError(
        404,
        `This simulation has no available running session`
      );
    }

    return session;
  } catch (error) {
    return errorReturnHandler(error);
  }
}

export async function disconnectTokenSocket(
  socketId: string
): Promise<string | Error> {
  try {
    const buyer = await Buyer.createQueryBuilder("buyer")
      .where("buyer.socketId=:socketId", { socketId })
      .andWhere("buyer.isLoggedIn=true")
      .getOne();

    const seller = await Seller.createQueryBuilder("seller")
      .where("seller.socketId=:socketId", { socketId })
      .andWhere("seller.isLoggedIn=true")
      .getOne();

    if (!buyer && !seller) {
      throw createHttpError(
        404,
        `No logged user with socket id of ${socketId}`
      );
    }

    let success: Buyer | Seller | undefined = undefined;

    if (buyer) {
      buyer.isLoggedIn = false;
      buyer.socketId = null;
      buyer.isReady = false;

      success = await buyer.save();
      return success.loginToken;
    } else if (seller) {
      seller.isLoggedIn = false;
      seller.socketId = null;
      seller.isReady = false;

      success = await seller.save();
      return success.loginToken;
    }

    throw createHttpError(500, `Error`);
  } catch (error) {
    return errorReturnHandler(error);
  }
}

export async function loggingOutAllUser(): Promise<boolean | Error> {
  try {
    const getBuyerPromise = Buyer.createQueryBuilder("buyer")
      .where("buyer.isLoggedIn=true")
      .getMany();

    const getSellerPromise = Seller.createQueryBuilder("seller")
      .where("seller.isLoggedIn=true")
      .getMany();

    const buyers = await getBuyerPromise;
    const sellers = await getSellerPromise;

    if (buyers.length === 0 && sellers.length === 0) {
      return true;
    }

    if (buyers.length > 0) {
      const updatedBuyers = buyers.map((b) => {
        b.isLoggedIn = false;
        b.socketId = null;
        b.isReady = false;
        return b;
      });
      await Buyer.save(updatedBuyers);
    }

    if (sellers.length > 0) {
      const updatedSellers = sellers.map((s) => {
        s.isLoggedIn = false;
        s.socketId = null;
        s.isReady = false;
        return s;
      });
      await Seller.save(updatedSellers);
    }

    return true;
  } catch (error) {
    return errorReturnHandler(error);
  }
}
