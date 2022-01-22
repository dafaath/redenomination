import createHttpError from "http-errors";
import { Socket } from "socket.io";
import { AnySchema } from "yup";

export const validateSocketInput = (socket: Socket, schema: AnySchema) => {
  socket.use((packet, next) => {
    try {
      const requestBody = packet[1];
      if (!requestBody) {
        throw createHttpError(
          400,
          "Make sure you only send one object with the correct parameter, not multiple data"
        );
      }

      schema.validateSync(requestBody);
      next();
    } catch (error) {
      if (error instanceof Error) {
        socket.emit("serverMessage", error.message);
        next(createHttpError(400, error.message));
      }
    }
  });
};
