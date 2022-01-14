import {
  handleErrorResponse,
  handleSuccessResponse,
} from "./../common/utils/responseHandler";
import { Request, Response } from "express";
import {
  adminLoginSchema,
  tokenLoginSchema,
} from "../schema/authentication.schema";
import yup from "yup";
import { loginAdmin, loginToken } from "../service/authentication.service";

type adminLoginRequest = yup.InferType<typeof adminLoginSchema>;
export async function adminLoginHandler(req: Request, res: Response) {
  try {
    const request = req as adminLoginRequest;
    const password = request.body.password;
    const jwtToken = await loginAdmin(password);
    if (jwtToken instanceof Error) {
      throw jwtToken;
    }
    handleSuccessResponse(res, 200, "Successfully login as admin", {
      jwtToken,
    });
  } catch (error) {
    handleErrorResponse(res, error);
  }
}

type tokenLoginRequest = yup.InferType<typeof tokenLoginSchema>;
export async function tokenLoginHandler(req: Request, res: Response) {
  try {
    const request = req as tokenLoginRequest;
    const token = request.body.token;
    const jwtToken = await loginToken(token);
    if (jwtToken instanceof Error) {
      throw jwtToken;
    }
    handleSuccessResponse(res, 200, "Successfully login as buyer/seller", {
      jwtToken,
    });
  } catch (error) {
    handleErrorResponse(res, error);
  }
}
