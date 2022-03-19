import { Server, Socket } from "socket.io";
import {
  socketHandleErrorResponse,
  socketHandleSuccessResponse,
} from "../common/utils/responseHandler";
import {
  buySchema,
  inputSellerPriceSchema,
  requestListDSSchema,
} from "../schema/decentralized.schema";
import yup from "yup";
import { validateSocketInput } from "../middleware/validateSocketInput";
import { checkIfError } from "../common/utils/error";
import {
  buyDecentralized,
  checkIfIsDone,
  inputSellerPrice,
  requestListDS,
} from "../service/decentralized.service";
import { updatePhaseStage } from "../service/socket.service";

type socketTokenLoginRequest = yup.InferType<typeof inputSellerPriceSchema>;
export function inputSellerPriceHandler(io: Server, socket: Socket) {
  return async (request: socketTokenLoginRequest) => {
    try {
      const isValid = validateSocketInput(request, inputSellerPriceSchema);
      checkIfError(isValid);

      const decentralizeds = await inputSellerPrice(
        socket.id,
        request.price,
        request.phaseId
      );
      checkIfError(decentralizeds);

      const joinedRoom = Array.from(socket.rooms);
      io.to(joinedRoom).emit("decentralizedList", decentralizeds);

      if (!(decentralizeds instanceof Error)) {
        const isDone = await checkIfIsDone(
          request.phaseId,
          decentralizeds.length
        );
        checkIfError(isDone);
        io.to(joinedRoom).emit("ds:isDone", isDone);
        if (isDone && !(isDone instanceof Error)) {
          const sessionData = await updatePhaseStage(request.phaseId);
          checkIfError(sessionData);
          io.to(joinedRoom).emit("sessionDataUpdate", sessionData);
        }
      }

      socketHandleSuccessResponse(
        socket,
        200,
        "Successfully input seller price",
        decentralizeds
      );
    } catch (error) {
      socketHandleErrorResponse(socket, error);
    }
  };
}

type buyDecentralizedRequest = yup.InferType<typeof buySchema>;
export function buyHandler(io: Server, socket: Socket) {
  return async (request: buyDecentralizedRequest) => {
    try {
      const isValid = validateSocketInput(request, buySchema);
      checkIfError(isValid);

      const decentralizeds = await buyDecentralized(
        request.decentralizedId,
        socket.id,
        request.phaseId
      );
      checkIfError(decentralizeds);

      const joinedRoom = Array.from(socket.rooms);
      io.to(joinedRoom).emit("decentralizedList", decentralizeds);

      socketHandleSuccessResponse(
        socket,
        200,
        "Successfully buy transaction",
        decentralizeds
      );
    } catch (error) {
      socketHandleErrorResponse(socket, error);
    }
  };
}

type requestListRequest = yup.InferType<typeof requestListDSSchema>;
export function requestListHandlerDS(io: Server, socket: Socket) {
  return async (request: requestListRequest) => {
    try {
      const isValid = validateSocketInput(request, requestListDSSchema);
      checkIfError(isValid);

      const decentralizeds = await requestListDS(request.phaseId);
      socket.emit("decentralizedList", decentralizeds);
    } catch (error) {
      socketHandleErrorResponse(socket, error);
    }
  };
}
