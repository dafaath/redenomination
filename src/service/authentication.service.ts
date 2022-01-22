import config from "../configHandler";
import createHttpError from "http-errors";
import { ROLE, signToken } from "../common/utils/jwt";
import { errorReturnHandler } from "../common/utils/error";
import Buyer from "../db/entities/buyer.entity";
import Simulation from "../db/entities/simulation.entity";
import Seller from "../db/entities/seller.entity";

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

    const buyers = await Buyer.createQueryBuilder("buyer")
      .where("buyer.loginToken=:token", { token })
      .andWhere("buyer.isLoggedIn=false")
      .getMany();

    const sellers = await Seller.createQueryBuilder("seller")
      .where("seller.loginToken=:token", { token })
      .andWhere("seller.isLoggedIn=false")
      .getMany();

    if (
      (!buyers || buyers.length === 0) &&
      (!sellers || sellers.length === 0)
    ) {
      throw createHttpError(404, `Simulation is full`);
    }

    let chosenHost: undefined | ChosenHost = undefined;
    if (buyers.length >= sellers.length) {
      const buyer = buyers[0];
      buyer.isLoggedIn = true;
      buyer.socketId = socketId;

      chosenHost = {
        type: ChosenHostType.BUYER,
        detail: await buyer.save(),
      };
    } else {
      const seller = sellers[0];
      seller.isLoggedIn = true;
      seller.socketId = socketId;

      chosenHost = {
        type: ChosenHostType.SELLER,
        detail: await seller.save(),
      };
    }

    return chosenHost;
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

      success = await buyer.save();
    }

    if (seller) {
      seller.isLoggedIn = false;
      seller.socketId = null;

      success = await seller.save();
    }

    return Boolean(success);
  } catch (error) {
    return errorReturnHandler(error);
  }
}
