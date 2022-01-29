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
} from "../service/socket.service";
import yup from "yup";
import { finishPhaseSchema, startPhaseSchema } from "../schema/socket.schema";
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
      socketHandleSuccessResponse(socket, 200, "Successfully start this phase");
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

      const error = await deleteShortLivedData(request.phaseId);
      checkIfError(error);

      socketHandleSuccessResponse(
        socket,
        200,
        "Successfully finish this phase"
      );
    } catch (error) {
      socketHandleErrorResponse(socket, error);
    }
  };
}
