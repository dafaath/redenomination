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
  startPhase,
  finishPhase,
  collectedProfit,
  isClientReady,
  activePlayers,
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

        const active = await activePlayers(user.loginToken);
        io.emit("admin:activePlayers", active)

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

export function isClientReadyHandler(io: Server, socket: Socket) {
  return async () => {
    try {
      const user = await isClientReady(socket.id);
      checkIfError(user);

      if (!(user instanceof Error)) {
        socket.emit("isClientReady", { isReady: user.isReady });

        socketHandleSuccessResponse(
          socket,
          200,
          "Successfully get client status",
          { ...user }
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

      const startError = startPhase(request.phaseId)
      checkIfError(startError);

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

      const finishError = finishPhase(request.phaseId)
      checkIfError(finishError);

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

      const clientCollectedProfit = await collectedProfit(request.participantId);
      checkIfError(clientCollectedProfit);

      socket.emit("collectedProfit", clientCollectedProfit);

      socketHandleSuccessResponse(
        socket,
        200,
        "Successfully get client profit",
        { clientCollectedProfit }
      );
    } catch (error) {
      socketHandleErrorResponse(socket, error);
    }
  };
}