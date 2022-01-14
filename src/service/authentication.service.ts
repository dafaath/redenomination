import config from "../configHandler";
import createHttpError from "http-errors";
import { ROLE, signToken } from "../common/utils/jwt";
import { errorReturnHandler } from "../common/utils/error";
import Buyer from "../db/entities/buyer.entity";

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

export async function loginToken(token: string): Promise<string | Error> {
  try {
    const buyer = await Buyer.createQueryBuilder("buyer")
      .where("buyer.loginToken=:token", { token })
      .getOne();
    const seller = await Buyer.createQueryBuilder("seller")
      .where("seller.loginToken=:token", { token })
      .getOne();
    if (!buyer && !seller) {
      return createHttpError(401, "token is invalid");
    }

    const user = buyer ? buyer : seller;
    const role = buyer ? ROLE.BUYER : ROLE.SELLER;

    return signToken(role, user);
  } catch (error) {
    return errorReturnHandler(error);
  }
}
