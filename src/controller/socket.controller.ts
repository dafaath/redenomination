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
  ReadyCount,
  updatePhaseStage,
  validateClientDone,
  checkIsAllClientDone,
} from "../service/socket.service";
import yup from "yup";
import {
  phaseIdSchema,
  collectProfitSchema,
  clientDoneSchema,
} from "../schema/socket.schema";
import { validateSocketInput } from "../middleware/validateSocketInput";
import log from "../common/utils/logger";

type phaseRequest = yup.InferType<typeof phaseIdSchema>;
type collectProfitRequest = yup.InferType<typeof collectProfitSchema>;
type clientDoneRequest = yup.InferType<typeof clientDoneSchema>;

export function toggleReadyHandler(io: Server, socket: Socket) {
  return async () => {
    try {
      const user = await toggleReady(socket.id);
      checkIfError(user);

      if (!(user instanceof Error)) {
        const object = await countReadyUser(user.loginToken);
        checkIfError(object);

        if (object instanceof ReadyObject) {
          io.to(user.loginToken).emit("sessionDataUpdate", object.sessionData);
          io.to(user.loginToken).emit("readyCount", object.readyCount);
        } else if (object instanceof ReadyCount) {
          io.to(user.loginToken).emit("readyCount", object);
        }

        const active = await activePlayers(user.loginToken);
        io.to(user.loginToken).emit("admin:activePlayers", active);

        socketHandleSuccessResponse(
          socket,
          200,
          `Successfully set user to ${user.isReady}`,
          { user, object }
        );
      }
    } catch (error) {
      socketHandleErrorResponse(socket, error);
    }
  };
}

export function startPhaseHandler(io: Server, socket: Socket) {
  return async (request: phaseRequest) => {
    try {
      const validationError = validateSocketInput(request, phaseIdSchema);
      checkIfError(validationError);

      const startObject = await startPhase(request.phaseId);
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

export function updatePhaseHandler(io: Server, socket: Socket) {
  return async (request: phaseRequest) => {
    try {
      const validationError = validateSocketInput(request, phaseIdSchema);
      checkIfError(validationError);

      const sessionData = await updatePhaseStage(request.phaseId);
      checkIfError(sessionData);

      const joinedRoom = Array.from(socket.rooms);
      io.to(joinedRoom).emit("sessionDataUpdate", sessionData);

      socketHandleSuccessResponse(
        socket,
        200,
        "Successfully updated this phase",
        {
          phaseId: request.phaseId,
        }
      );
    } catch (error) {
      socketHandleErrorResponse(socket, error);
    }
  };
}

export function finishPhaseHandler(io: Server, socket: Socket) {
  return async (request: phaseRequest) => {
    try {
      const validationError = validateSocketInput(request, phaseIdSchema);
      checkIfError(validationError);

      const phase = await finishPhase(request.phaseId);
      checkIfError(phase);

      const error = await deleteShortLivedData(request.phaseId);
      checkIfError(error);

      socketHandleSuccessResponse(
        socket,
        200,
        "Successfully finish this phase",
        { phaseId: request.phaseId }
      );
    } catch (error) {
      socketHandleErrorResponse(socket, error);
    }
  };
}

export function collectProfitHandler(io: Server, socket: Socket) {
  return async (request: collectProfitRequest) => {
    try {
      const validationError = validateSocketInput(request, collectProfitSchema);
      checkIfError(validationError);

      const clientCollectedProfit = await collectedProfit(
        request.phaseId,
        request.username
      );
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

export function clientDoneHandler(io: Server, socket: Socket) {
  return async (request: clientDoneRequest) => {
    try {
      const isValid = validateSocketInput(request, clientDoneSchema);
      checkIfError(isValid);

      // validate client done
      const isClientDone = await validateClientDone(
        request.phaseId,
        request.clientId
      );
      checkIfError(isClientDone);

      // check if all client done
      const isAllDone = await checkIsAllClientDone(request.phaseId);
      if (isAllDone instanceof Error) {
        checkIfError(isAllDone);
      } else if (isAllDone === true) {
        log.info(`${request.phaseId} allClientDone`);
        const joinedRoom = Array.from(socket.rooms);
        io.to(joinedRoom).emit("allClientDone", true);
      }
    } catch (error) {
      socketHandleErrorResponse(socket, error);
    }
  };
}
