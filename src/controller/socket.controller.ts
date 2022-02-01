import { Server, Socket } from "socket.io";
import { checkIfError } from "../common/utils/error";
import {
  socketHandleErrorResponse,
  socketHandleSuccessResponse,
} from "../common/utils/responseHandler";
import {
  countReadyUser,
  deleteShortLivedData,
  toggleReady,
  inputProfit,
  calculatePhase,
} from "../service/socket.service";
import yup from "yup";
import { finishPhaseSchema, startPhaseSchema, collectProfitSchema } from "../schema/socket.schema";
import { validateSocketInput } from "../middleware/validateSocketInput";

export function toggleReadyHandler(io: Server, socket: Socket) {
  return async () => {
    try {
      const user = await toggleReady(socket.id);
      checkIfError(user);

      if (!(user instanceof Error)) {
        const readyCount = await countReadyUser(user.loginToken);
        checkIfError(readyCount);

        io.to(user.loginToken).emit("readyCount", readyCount);

        socketHandleSuccessResponse(
          socket,
          200,
          `Successfully set user to ${user.isReady}`,
          { user, readyCount }
        );
      }
    } catch (error) {
      socketHandleErrorResponse(socket, error);
    }
  };
}

type startPhaseRequest = yup.InferType<typeof startPhaseSchema>;
export function startPhaseHandler(io: Server, socket: Socket) {
  return async (request: startPhaseRequest) => {
    try {
      const validationError = validateSocketInput(request, startPhaseSchema);
      checkIfError(validationError);
      socketHandleSuccessResponse(
        socket,
        200,
        "Successfully start this phase",
        {
          phaseId: request.phaseId,
        }
      );
    } catch (error) {
      socketHandleErrorResponse(socket, error);
    }
  };
}

type finishPhaseRequest = yup.InferType<typeof finishPhaseSchema>;
export function finishPhaseHandler(io: Server, socket: Socket) {
  return async (request: finishPhaseRequest) => {
    try {
      const validationError = validateSocketInput(request, finishPhaseSchema);
      checkIfError(validationError);

      const calcPhase = await calculatePhase(request.phaseId)
      checkIfError(calcPhase);

      const error = await deleteShortLivedData(request.phaseId);
      checkIfError(error);

      socketHandleSuccessResponse(
        socket,
        200,
        "Successfully finish this phase",
        {
          phaseId: request.phaseId,
        }
      );
    } catch (error) {
      socketHandleErrorResponse(socket, error);
    }
  };
}

type collectProfitRequest = yup.InferType<typeof collectProfitSchema>;
export function collectProfitHandler(io: Server, socket: Socket) {
  return async (request: collectProfitRequest) => {
    try {
      const validationError = validateSocketInput(request, collectProfitSchema);
      checkIfError(validationError);

      const collectedProfits = await inputProfit(request.myProfit);
      checkIfError(collectedProfits);

      const joinedRoom = Array.from(socket.rooms);
      io.to(joinedRoom).emit("collectedProfit", collectedProfits);

      socketHandleSuccessResponse(
        socket,
        200,
        "Successfully input client profit",
        collectedProfits
      );
    } catch (error) {
      socketHandleErrorResponse(socket, error);
    }
  };
}
