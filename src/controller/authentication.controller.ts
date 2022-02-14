import {
  handleErrorResponse,
  handleSuccessResponse,
  socketHandleErrorResponse,
  socketHandleSuccessResponse,
} from "./../common/utils/responseHandler";
import { Request, Response } from "express";
import {
  adminLoginSchema,
  adminLoginSchemaSocket,
  tokenLoginSchemaSocket,
} from "../schema/authentication.schema";
import yup from "yup";
import {
  loginAdmin,
  loginTokenSocket,
  adminLoginTokenSocket,
} from "../service/authentication.service";
import { checkIfError } from "../common/utils/error";
import { Server, Socket } from "socket.io";
import log from "../common/utils/logger";
import createHttpError from "http-errors";
import { validateSocketInput } from "../middleware/validateSocketInput";

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
export function socketTokenLoginHandler(io: Server, socket: Socket) {
  return async (request: socketTokenLoginRequest) => {
    try {
      const isError = validateSocketInput(request, tokenLoginSchemaSocket);
      checkIfError(isError);
      log.info(`socket ${socket.id} requested to join room`);

      if (socket.rooms.has(request.token)) {
        throw createHttpError(
          409,

          `User ${socket.id} already join room ${request.token}`
        );
      }

      const chosenHost = await loginTokenSocket(
        request.token,
        request.username,
        socket.id
      );
      checkIfError(chosenHost);

      const message = `User ${socket.id} has join room ${request.token}`;
      socket.join(request.token);
      log.info(message);

      socketHandleSuccessResponse(socket, 200, message, chosenHost);
    } catch (error) {
      socketHandleErrorResponse(socket, error);
    }
  };
}

type adminTokenLoginRequest = yup.InferType<typeof adminLoginSchemaSocket>;
export function socketAdminTokenLoginHandler(io: Server, socket: Socket) {
  return async (request: adminTokenLoginRequest) => {
    try {
      const isError = validateSocketInput(request, adminLoginSchemaSocket);
      checkIfError(isError);
      log.info(`socket ${socket.id} requested to join room as admin`);

      if (socket.rooms.has(request.token)) {
        throw createHttpError(
          409,
          `Admin from ${socket.id} already join room ${request.token}`
        );
      }

      const sessionInfo = await adminLoginTokenSocket(request.token);
      checkIfError(sessionInfo);

      const message = `User ${socket.id} has join room ${request.token} as admin`;
      socket.join(request.token);
      log.info(message);

      socket.emit("adminLoginToken", sessionInfo)

      socketHandleSuccessResponse(socket, 200, message, sessionInfo);
    } catch (error) {
      socketHandleErrorResponse(socket, error);
    }
  };
}
