import jwt from "jsonwebtoken";
import config from "../../configHandler";
import Buyer from "../../db/entities/buyer.entity";
import Seller from "../../db/entities/seller.entity";

const jwtTokenKey = config.jwt.key;

export enum ROLE {
  ADMIN = "admin",
  BUYER = "buyer",
  SELLER = "seller",
}

type jwtTokenPayload = {
  role: ROLE;
  data: object;
} & (Buyer | Seller);

export function signToken(
  role: ROLE,
  user: Buyer | Seller | undefined = undefined
) {
  const payload = {
    role: role,
    ...user,
  };
  return jwt.sign(payload, jwtTokenKey);
}

// export function decode(
//   token: string,
//   type: "access" | "refresh"
// ): decodeResponse {
//   try {
//     let privateKey: string;
//     let decoded: accessToken | refreshToken;
//     if (type === "access") {
//       privateKey = accessTokenKey;
//       decoded = jwt.verify(token, privateKey) as accessToken;
//     } else {
//       privateKey = refreshTokenKey;
//       decoded = jwt.verify(token, privateKey) as refreshToken;
//     }

//     return { valid: true, expired: false, decoded };
//   } catch (error) {
//     if (error instanceof Error) {
//       log.error(error);
//       return {
//         valid: false,
//         expired: error.message === "jwt expired",
//         decoded: null,
//       };
//     } else {
//       console.log(error);
//       return {
//         valid: false,
//         expired: false,
//         decoded: null,
//       };
//     }
//   }
// }
