import jwt from "jsonwebtoken";
import config from "../../configHandler";
import Buyer from "../../db/entities/buyer.entity";
import Seller from "../../db/entities/seller.entity";
import log from "./logger";

const jwtTokenKey = config.jwt.key;

export enum ROLE {
  ADMIN = "admin",
  BUYER = "buyer",
  SELLER = "seller",
}

type jwtTokenPayload = {
  role: ROLE;
  user: Buyer | Seller | undefined;
};

export function signToken(
  role: ROLE,
  user: Buyer | Seller | undefined = undefined
) {
  const payload: jwtTokenPayload = {
    role: role,
    user: user,
  };
  return jwt.sign(payload, jwtTokenKey);
}

type decodedResponse = {
  valid: boolean;
  expired: boolean;
  decoded: jwtTokenPayload | null;
};

export function decode(token: string): decodedResponse {
  try {
    const decoded = jwt.verify(token, jwtTokenKey) as jwtTokenPayload;
    if (!decoded) {
      throw new Error("error parsing jwt");
    }

    return { valid: true, expired: false, decoded };
  } catch (error) {
    if (error instanceof Error) {
      log.error(error);
      return {
        valid: false,
        expired: error.message === "jwt expired",
        decoded: null,
      };
    } else {
      return {
        valid: false,
        expired: false,
        decoded: null,
      };
    }
  }
}
