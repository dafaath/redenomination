import config from "../configHandler";
import createHttpError from "http-errors";
import { ROLE, signToken } from "../common/utils/jwt";
import { errorReturnHandler, errorThrowUtils } from "../common/utils/error";
import Buyer from "../db/entities/buyer.entity";
import Simulation from "../db/entities/simulation.entity";
import Seller from "../db/entities/seller.entity";
import { getManager } from "typeorm";

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
};

export async function loginTokenSocket(
  token: string,
  socketId: string
): Promise<ChosenHost | Error> {
  try {
    const simulation = await Simulation.findOne({ token: token });

    if (!simulation) {
      throw createHttpError(
        404,
        `Login token ${token} is not found in database`
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
              isLoggedIn: false,
            },
          });

          const seller = await transactionalEntityManager.findOne(Seller, {
            lock: {
              mode: "pessimistic_write",
            },
            where: {
              loginToken: token,
              isLoggedIn: false,
            },
          });

          if (!buyer && !seller) {
            throw createHttpError(403, `Simulation is full`);
          }

          let chosenHost: undefined | ChosenHost = undefined;
          if (buyer) {
            buyer.isLoggedIn = true;
            buyer.socketId = socketId;

            chosenHost = {
              type: ChosenHostType.BUYER,
              detail: await transactionalEntityManager.save(buyer),
            };
          } else if (seller) {
            seller.isLoggedIn = true;
            seller.socketId = socketId;

            chosenHost = {
              type: ChosenHostType.SELLER,
              detail: await transactionalEntityManager.save(seller),
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

export async function disconnectTokenSocket(
  socketId: string
): Promise<boolean | Error> {
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
    }

    if (seller) {
      seller.isLoggedIn = false;
      seller.socketId = null;
      seller.isReady = false;

      success = await seller.save();
    }

    return Boolean(success);
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
