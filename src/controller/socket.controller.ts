import { Server, Socket } from "socket.io";
import { checkIfError } from "../common/utils/error";
import {
  socketHandleErrorResponse,
  socketHandleSuccessResponse,
} from "../common/utils/responseHandler";
import { countReadyUser, toggleReady } from "../service/socket.service";

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
