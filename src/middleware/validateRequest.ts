import { AnySchema } from "yup";
import { Request, Response, NextFunction } from "express";
import createError from "http-errors";
import { handleErrorResponse } from "./../common/utils/responseHandler";

const validate =
  (schema: AnySchema) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.validate({
        body: req.body,
        query: req.query,
        params: req.params,
        cookies: req.cookies,
      });

      return next();
    } catch (e) {
      if (e instanceof Error) {
        const badRequestError = createError(400, e.message);
        handleErrorResponse(res, badRequestError);
      }
    }
  };

export default validate;
