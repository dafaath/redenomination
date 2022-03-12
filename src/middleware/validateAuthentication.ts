import { NextFunction, Request, Response } from "express";
import { handleErrorResponse } from "../common/utils/responseHandler";
import createNewError from "http-errors";
import { decode, ROLE } from "../common/utils/jwt";

const validateAuthentication =
  (role: ROLE) => async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bearer = req.header("Authorization");
      if (!bearer) {
        throw createNewError(401, "No Authorization header");
      }

      const jwt = bearer.split(" ")[1];
      if (!jwt) {
        throw createNewError(
          401,
          "Invalid Authorization header, please make sure the format is 'Bearer JWT_TOKEN'"
        );
      }

      const decodedJwt = decode(jwt);
      const isExpired = decodedJwt.expired;
      const isValid = decodedJwt.valid;

      if (isExpired) {
        throw createNewError(401, "Jwt is expired");
      }

      if (!isValid && !decodedJwt.decoded) {
        throw createNewError(401, "Jwt is not valid");
      }

      if (role === ROLE.ADMIN) {
        const isJwtFromAdmin = decodedJwt.decoded?.role === ROLE.ADMIN;

        if (!isJwtFromAdmin) {
          throw createNewError(401, "This request need admin privileges");
        }
      }

      return next();
    } catch (error) {
      handleErrorResponse(res, error);
    }
  };

export default validateAuthentication;
