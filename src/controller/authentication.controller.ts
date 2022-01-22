import {
  handleErrorResponse,
  handleSuccessResponse,
  socketHandleErrorResponse,
  socketHandleSuccessResponse,
} from "./../common/utils/responseHandler";
import { Request, Response } from "express";
import {
  adminLoginSchema,
  tokenLoginSchemaSocket,
} from "../schema/authentication.schema";
import yup from "yup";
import {
  loginAdmin,
  loginTokenSocket,
} from "../service/authentication.service";
import { checkIfError } from "../common/utils/error";
import { Server, Socket } from "socket.io";
import log from "../common/utils/logger";
import createHttpError from "http-errors";

type adminLoginRequest = yup.InferType<typeof adminLoginSchema>;
export async function adminLoginHandler(req: Request, res: Response) {
  try {
    const request = req as adminLoginRequest;
    const password = request.body.password;
    const jwtToken = await loginAdmin(password);
    checkIfError(jwtToken);

    handleSuccessResponse(res, 200, "Successfully login as admin", {
      jwtToken,
    });
  } catch (error) {
    handleErrorResponse(res, error);
  }
}

type socketTokenLoginRequest = yup.InferType<typeof tokenLoginSchemaSocket>;
export async function socketTokenLoginHandler(io: Server, socket: Socket) {
  socket.on("loginToken", async (request: socketTokenLoginRequest) => {
    try {
      if (socket.rooms.has(request.token)) {
        throw createHttpError(
          409,
          `User ${socket.id} already join room ${request.token}`
        );
      }

      const chosenHost = await loginTokenSocket(request.token, socket.id);
      checkIfError(chosenHost);

      const message = `User ${socket.id} has join room ${request.token}`;
      socket.join(request.token);
      log.info(message);

      socketHandleSuccessResponse(socket, 200, message, chosenHost);
    } catch (error) {
      socketHandleErrorResponse(socket, error);
    }
  });
}
