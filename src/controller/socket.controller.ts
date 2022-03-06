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
  activePlayers,
  ReadyObject,
} from "../service/socket.service";
import yup from "yup";
import { finishPhaseSchema, startPhaseSchema, collectProfitSchema } from "../schema/socket.schema";
import { validateSocketInput } from "../middleware/validateSocketInput";
import { PhaseType } from "../db/entities/phase.entity";
import { finishSession } from "../service/session.service";

export function toggleReadyHandler(io: Server, socket: Socket) {
  return async () => {
    try {
      const user = await toggleReady(socket.id);
      checkIfError(user);

      if (!(user instanceof Error)) {
        const readyCount = await countReadyUser(user.loginToken);
        checkIfError(readyCount);
        if (readyCount instanceof ReadyObject) {
          const joinedRoom = Array.from(socket.rooms);
          io.to(joinedRoom).emit("sessionDataUpdate", readyCount.sessionData);
        }

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

type startPhaseRequest = yup.InferType<typeof startPhaseSchema>;
export function startPhaseHandler(io: Server, socket: Socket) {
  return async (request: startPhaseRequest) => {
    try {
      const validationError = validateSocketInput(request, startPhaseSchema);
      checkIfError(validationError);

      const startObject = await startPhase(request.phaseId)
      if (!(startObject instanceof Error)) {
        const joinedRoom = Array.from(socket.rooms);
        io.to(joinedRoom).emit("sessionDataUpdate", startObject.sessionData);
      }

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

      const phase = await finishPhase(request.phaseId)
      checkIfError(phase);

      // check if last phase
      if (!(phase instanceof Error) && (phase.phaseType === PhaseType.POST_REDENOM_PRICE)) {
        await finishSession(phase.session.id);
        io.emit("admin:isSessionDone")
      }

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

      const clientCollectedProfit = await collectedProfit(request.phaseId, request.username);
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